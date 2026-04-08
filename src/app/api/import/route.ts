export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'
import { getTenantContext } from '@/lib/tenant-context'
import { detectImportSchema, getMappedCell } from '@/lib/import-schema'

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

function parsePhone(val: unknown): string | null {
    if (!val) return null
    const normalized = String(val).trim()
    return normalized ? normalized.slice(0, 30) : null
}

function parseEmail(val: unknown): string | null {
    if (!val) return null
    const normalized = String(val).trim().toLowerCase()
    return normalized || null
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

function truncate(value: string | null | undefined, max: number) {
    if (!value) return null
    const normalized = value.trim()
    return normalized ? normalized.slice(0, max) : null
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
    const context = await getTenantContext(supabase)
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!context.isAdmin) {
        return NextResponse.json({ error: 'Apenas administradores podem importar listas' }, { status: 403 })
    }
    if (!context.tenantId) {
        return NextResponse.json({ error: 'Tenant do usuário não configurado' }, { status: 409 })
    }

    const adminSupabase = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const formData = await request.formData()
    const file = formData.get('file') as File
    const listaNome = (formData.get('nome') as string || file.name).trim()
    const fornecedor = formData.get('fornecedor') as string || ''

    if (!file) return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 })

    const [
        { data: listasMesmoNome, error: listaMesmoNomeError },
        { data: listasMesmoArquivo, error: listaMesmoArquivoError },
    ] = await Promise.all([
        adminSupabase
            .from('listas')
            .select('id, total_leads')
            .eq('tenant_id', context.tenantId)
            .eq('nome', listaNome)
            .limit(10),
        adminSupabase
            .from('listas')
            .select('id, total_leads')
            .eq('tenant_id', context.tenantId)
            .eq('arquivo_original', file.name)
            .limit(10),
    ])

    if (listaMesmoNomeError || listaMesmoArquivoError) {
        return NextResponse.json({ error: 'Erro ao verificar duplicidade da lista' }, { status: 500 })
    }

    const listasDuplicadas = [...(listasMesmoNome || []), ...(listasMesmoArquivo || [])]
    const listasOrfas = Array.from(
        new Map(
            listasDuplicadas
                .filter((lista) => !lista.total_leads || lista.total_leads === 0)
                .map((lista) => [lista.id, lista])
        ).values()
    )

    if (listasOrfas.length > 0) {
        await adminSupabase.from('listas').delete().in('id', listasOrfas.map((lista) => lista.id))
    }

    const listasAtivas = listasDuplicadas.filter((lista) => (lista.total_leads || 0) > 0)

    if (listasAtivas.length > 0) {
        return NextResponse.json({
            error: 'Ja existe uma lista com esse nome ou com esse mesmo arquivo neste escritorio. Use uma nova lista ou remova a importacao anterior antes de subir novamente.',
        }, { status: 409 })
    }

    // Ler o arquivo XLSX
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null })
    const detectedSchema = detectImportSchema(rows)
    const rowsToProcess = detectedSchema.mode === 'header_mapping' && detectedSchema.headerRowIndex !== null
        ? rows.slice(detectedSchema.headerRowIndex + 1)
        : rows

    const schemaWarnings: string[] = []
    if (detectedSchema.mode === 'header_mapping') {
        schemaWarnings.push(`Layout detectado por cabeçalhos (${detectedSchema.detectedFields.length} campo(s) mapeado(s)).`)
    } else {
        schemaWarnings.push('Layout legado por posição fixa detectado. Para novos fornecedores, prefira planilhas com cabeçalhos.')
    }

    // Criar lista no banco
    const { data: lista, error: listaError } = await adminSupabase
        .from('listas')
        .insert({
            tenant_id: context.tenantId,
            nome: listaNome,
            fornecedor,
            arquivo_original: file.name,
            total_registros: rowsToProcess.length,
            importado_por: context.usuarioId
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

    for (const row of rowsToProcess) {
        const nbRaw = detectedSchema.mode === 'header_mapping' ? getMappedCell(row, detectedSchema, 'nb') : row[COL.NB]
        const nomeRaw = detectedSchema.mode === 'header_mapping' ? getMappedCell(row, detectedSchema, 'nome') : row[COL.NOME]
        const statusRaw = detectedSchema.mode === 'header_mapping' ? getMappedCell(row, detectedSchema, 'status') : row[COL.STATUS]

        const nb = nbRaw ? String(nbRaw).trim() : null
        const nome = nomeRaw ? String(nomeRaw).trim() : null
        const status = statusRaw ? String(statusRaw).trim().toLowerCase() : ''

        if (!nb || !nome) continue

        // Deduplicação na planilha
        if (nbsVistas.has(nb)) { totalDuplicados++; continue }
        nbsVistas.add(nb)

        // Filtrar apenas ativos quando a origem informa status
        if (status && !status.includes('ativo')) { totalCessados++; continue }
        totalAtivos++

        const ganho = parseGanho(detectedSchema.mode === 'header_mapping' ? getMappedCell(row, detectedSchema, 'ganho_potencial') : row[COL.GANHO])
        const tipoRaw = detectedSchema.mode === 'header_mapping' ? getMappedCell(row, detectedSchema, 'tipo_beneficio') : row[COL.TIPO]
        const tipo = tipoRaw ? String(tipoRaw).trim() : ''
        const cpf = parseCPF(detectedSchema.mode === 'header_mapping' ? getMappedCell(row, detectedSchema, 'cpf') : row[COL.CPF])
        const telefone = parsePhone(detectedSchema.mode === 'header_mapping' ? getMappedCell(row, detectedSchema, 'telefone') : null)
        const email = parseEmail(detectedSchema.mode === 'header_mapping' ? getMappedCell(row, detectedSchema, 'email') : null)
        const categoriaProfissional = truncate(detectedSchema.mode === 'header_mapping' ? String(getMappedCell(row, detectedSchema, 'categoria_profissional') || '') : null, 255)

        if (ganho) ganhoTotal += ganho

        leads.push({
            tenant_id: context.tenantId,
            lista_id: lista.id,
            responsavel_id: context.usuarioId,
            nb: truncate(nb, 20),
            nome: truncate(nome, 255),
            cpf: cpf.slice(0, 14),
            telefone,
            email,
            aps: truncate(detectedSchema.mode === 'header_mapping' ? String(getMappedCell(row, detectedSchema, 'aps') || '') : (row[COL.APS] ? String(row[COL.APS]) : null), 255),
            banco: truncate(detectedSchema.mode === 'header_mapping' ? String(getMappedCell(row, detectedSchema, 'banco') || '') : (row[COL.BANCO] ? String(row[COL.BANCO]) : null), 100),
            dib: parseDate(detectedSchema.mode === 'header_mapping' ? getMappedCell(row, detectedSchema, 'dib') : row[COL.DIB]),
            tipo_beneficio: truncate(tipo, 255),
            valor_rma: parseGanho(detectedSchema.mode === 'header_mapping' ? getMappedCell(row, detectedSchema, 'valor_rma') : row[COL.VALOR_RMA]),
            categoria_profissional: categoriaProfissional,
            ganho_potencial: ganho,
            score: calcScore(ganho, tipo),
            status: 'new' as const,
            enriquecido: false,
            lgpd_optout: false
        })
    }

    // Atualizar stats da lista
    await adminSupabase
        .from('listas')
        .update({
            total_ativos: totalAtivos,
            total_cessados: totalCessados,
            total_duplicados: totalDuplicados,
            total_leads: 0,
            total_com_whatsapp: 0,
            total_sem_whatsapp: 0,
            total_nao_verificado: 0,
            ganho_potencial_total: ganhoTotal,
            ganho_potencial_medio: totalAtivos > 0 ? ganhoTotal / totalAtivos : 0
        })
        .eq('id', lista.id)

    // Inserir leads em batches de 50 (ignorar duplicatas por NB)
    let inseridos = 0
    let duplicatasNoBanco = 0
    const errosInsercao: string[] = []
    const batchSize = 50

    for (let i = 0; i < leads.length; i += batchSize) {
        const batch = leads.slice(i, i + batchSize)
        const { data, error } = await adminSupabase
            .from('leads')
            .upsert(batch, { onConflict: 'nb', ignoreDuplicates: true })
            .select('id')

        if (!error && data) {
            inseridos += data.length
            duplicatasNoBanco += batch.length - data.length
            continue
        }

        for (const lead of batch) {
            const { data: itemData, error: itemError } = await adminSupabase
                .from('leads')
                .upsert([lead], { onConflict: 'nb', ignoreDuplicates: true })
                .select('id')

            if (itemError) {
                if (errosInsercao.length < 5) {
                    errosInsercao.push(`${lead.nb}: ${itemError.message}`)
                }
                continue
            }

            const insertedCount = itemData?.length || 0
            inseridos += insertedCount
            duplicatasNoBanco += 1 - insertedCount
        }
    }

    if (inseridos === 0) {
        await adminSupabase.from('listas').delete().eq('id', lista.id)
        return NextResponse.json({
            error: errosInsercao[0] || 'Nenhum lead valido foi inserido. Verifique a planilha e tente novamente.',
            details: errosInsercao,
        }, { status: 422 })
    }

    await adminSupabase
        .from('listas')
        .update({
            total_leads: inseridos,
            total_duplicados: totalDuplicados + duplicatasNoBanco,
            total_com_whatsapp: 0,
            total_sem_whatsapp: 0,
            total_nao_verificado: inseridos,
        })
        .eq('id', lista.id)

    return NextResponse.json({
        success: true,
        lista_id: lista.id,
        stats: {
            total_registros: rowsToProcess.length,
            modo_detectado: detectedSchema.mode,
            cabecalho_detectado_linha: detectedSchema.headerRowIndex,
            campos_detectados: detectedSchema.detectedFields,
            total_ativos: totalAtivos,
            total_cessados: totalCessados,
            duplicatas_planilha: totalDuplicados,
            duplicatas_banco: duplicatasNoBanco,
            inseridos,
            falhas_insercao: Math.max(totalAtivos - inseridos - duplicatasNoBanco, 0),
            ganho_potencial_total: ganhoTotal
        },
        warnings: [...schemaWarnings, ...errosInsercao]
    })
}
