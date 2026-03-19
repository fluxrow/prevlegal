export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'

// Mapeamento das colunas da planilha NOMES_RJ_BNG.xlsx
// Baseado na análise real da planilha (índice base 0)
const COL = {
    NB: 0,        // Número do benefício
    NOME: 1,      // Nome do segurado
    APS: 3,       // Agência
    BANCO: 6,     // Banco
    CPF: 7,       // CPF
    DIB: 9,       // Data início benefício
    TIPO: 22,     // Tipo/Espécie
    VALOR_RMA: 25, // Valor RMA
    STATUS: 43,   // Status (Ativo/Cessado)
    GANHO: 49,    // Ganho potencial
}

function parseGanho(val: unknown): number | null {
    if (!val) return null
    const str = String(val).replace(/[R$\s.]/g, '').replace(',', '.')
    const num = parseFloat(str)
    return isNaN(num) ? null : num
}

function parseCPF(val: unknown): string {
    if (!val) return ''
    return String(val).replace(/\D/g, '').padStart(11, '0')
}

function parseDate(val: unknown): string | null {
    if (!val) return null
    // Excel date serial number
    if (typeof val === 'number') {
        const date = XLSX.SSF.parse_date_code(val)
        if (date) return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`
    }
    const str = String(val).trim()
    if (str.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        const [d, m, y] = str.split('/')
        return `${y}-${m}-${d}`
    }
    return null
}

function calcScore(ganho: number | null, tipo: string): number {
    let score = 50
    if (ganho) {
        if (ganho > 100000) score += 30
        else if (ganho > 50000) score += 20
        else if (ganho > 20000) score += 10
        else if (ganho > 5000) score += 5
    }
    if (tipo?.includes('Especial')) score += 10
    if (tipo?.includes('TC')) score += 5
    return Math.min(score, 100)
}

export async function POST(request: NextRequest) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Fetch internal public.usuarios ID e role
    const { data: usuario, error: usuarioError } = await supabase
        .from('usuarios')
        .select('id, role, tenant_id')
        .eq('auth_id', user.id)
        .single()

    if (usuarioError || !usuario) {
        return NextResponse.json({ error: 'Usuário não encontrado na base de dados (sincronização pendente)' }, { status: 403 })
    }

    if (usuario.role !== 'admin') {
        return NextResponse.json({ error: 'Apenas administradores podem importar listas' }, { status: 403 })
    }

    if (!usuario.tenant_id) {
        return NextResponse.json({ error: 'Tenant do usuário não configurado' }, { status: 409 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const listaNome = formData.get('nome') as string || file.name
    const fornecedor = formData.get('fornecedor') as string || ''

    if (!file) return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 })

    // Ler o arquivo XLSX
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null })

    // Criar lista no banco
    const { data: lista, error: listaError } = await supabase
        .from('listas')
        .insert({
            tenant_id: usuario.tenant_id,
            nome: listaNome,
            fornecedor,
            arquivo_original: file.name,
            total_registros: rows.length,
            importado_por: usuario.id
        })
        .select()
        .single()

    if (listaError || !lista) {
        return NextResponse.json({ error: 'Erro ao criar lista', details: listaError }, { status: 500 })
    }

    // Processar leads
    const leads = []
    let totalAtivos = 0
    let totalCessados = 0
    let totalDuplicados = 0
    let ganhoTotal = 0
    const nbsVistas = new Set<string>()

    for (const row of rows) {
        const nb = row[COL.NB] ? String(row[COL.NB]).trim() : null
        const nome = row[COL.NOME] ? String(row[COL.NOME]).trim() : null
        const status = row[COL.STATUS] ? String(row[COL.STATUS]).trim().toLowerCase() : ''

        if (!nb || !nome) continue

        // Deduplicação na planilha
        if (nbsVistas.has(nb)) { totalDuplicados++; continue }
        nbsVistas.add(nb)

        // Filtrar apenas ativos
        if (!status.includes('ativo')) { totalCessados++; continue }
        totalAtivos++

        const ganho = parseGanho(row[COL.GANHO])
        const tipo = row[COL.TIPO] ? String(row[COL.TIPO]).trim() : ''
        const cpf = parseCPF(row[COL.CPF])

        if (ganho) ganhoTotal += ganho

        leads.push({
            tenant_id: usuario.tenant_id,
            lista_id: lista.id,
            nb,
            nome,
            cpf,
            aps: row[COL.APS] ? String(row[COL.APS]).trim() : null,
            banco: row[COL.BANCO] ? String(row[COL.BANCO]).trim() : null,
            dib: parseDate(row[COL.DIB]),
            tipo_beneficio: tipo || null,
            valor_rma: parseGanho(row[COL.VALOR_RMA]),
            ganho_potencial: ganho,
            score: calcScore(ganho, tipo),
            status: 'new' as const,
            enriquecido: false,
            lgpd_optout: false
        })
    }

    // Atualizar stats da lista
    await supabase
        .from('listas')
        .update({
            total_ativos: totalAtivos,
            total_cessados: totalCessados,
            total_duplicados: totalDuplicados,
            ganho_potencial_total: ganhoTotal,
            ganho_potencial_medio: totalAtivos > 0 ? ganhoTotal / totalAtivos : 0
        })
        .eq('id', lista.id)

    // Inserir leads em batches de 50 (ignorar duplicatas por NB)
    let inseridos = 0
    let duplicatasNoBanco = 0
    const batchSize = 50

    for (let i = 0; i < leads.length; i += batchSize) {
        const batch = leads.slice(i, i + batchSize)
        const { data, error } = await supabase
            .from('leads')
            .upsert(batch, { onConflict: 'nb', ignoreDuplicates: true })
            .select('id')

        if (!error && data) {
            inseridos += data.length
            duplicatasNoBanco += batch.length - data.length
        }
    }

    return NextResponse.json({
        success: true,
        lista_id: lista.id,
        stats: {
            total_registros: rows.length,
            total_ativos: totalAtivos,
            total_cessados: totalCessados,
            duplicatas_planilha: totalDuplicados,
            duplicatas_banco: duplicatasNoBanco,
            inseridos,
            ganho_potencial_total: ganhoTotal
        }
    })
}
