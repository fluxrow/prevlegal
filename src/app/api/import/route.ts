export const runtime = 'nodejs'

import { createHash } from 'crypto'
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
    const digits = String(val).replace(/\D/g, '')
    if (!digits) return null
    return digits.slice(0, 20)
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

function normalizeHeader(value: unknown) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
}

type HeaderLookup = Map<string, number>

function buildHeaderLookup(row: unknown[]): HeaderLookup {
    return new Map(
        row
            .map((cell, index) => [normalizeHeader(cell), index] as const)
            .filter(([header]) => Boolean(header))
    )
}

function getCellByHeaderAliases(row: unknown[], lookup: HeaderLookup, aliases: string[]) {
    for (const alias of aliases) {
        const index = lookup.get(normalizeHeader(alias))
        if (index !== undefined) {
            return row[index] ?? null
        }
    }

    return null
}

function buildSyntheticNb(cpf: string, nome: string | null, dataNascimento: string | null) {
    if (cpf) return `CPF-${cpf}`.slice(0, 20)
    const digest = createHash('sha1')
        .update(`${nome || ''}|${dataNascimento || ''}`)
        .digest('hex')
        .slice(0, 16)
        .toUpperCase()
    return `IMP-${digest}`.slice(0, 20)
}

function pickPrioritizedContact(row: unknown[], lookup: HeaderLookup) {
    const contactCandidates = [
        { source: 'CELULAR_WHATSAPP_1', value: getCellByHeaderAliases(row, lookup, ['CELULAR_WHATSAPP_1', 'CELULAR WHATSAPP 1']), direct: true, whatsapp: true },
        { source: 'TELEFONE_WHATSAPP_1', value: getCellByHeaderAliases(row, lookup, ['TELEFONE_WHATSAPP_1', 'TELEFONE WHATSAPP 1']), direct: true, whatsapp: true },
        { source: 'TELEFONE1', value: getCellByHeaderAliases(row, lookup, ['TELEFONE1', 'TELEFONE 1']), direct: true, whatsapp: false },
        { source: 'TELEFONE2', value: getCellByHeaderAliases(row, lookup, ['TELEFONE2', 'TELEFONE 2']), direct: true, whatsapp: false },
        { source: 'CONJUGE_CELULAR_1', value: getCellByHeaderAliases(row, lookup, ['CONJUGE_CELULAR_1', 'CONJUGE CELULAR 1']), direct: false, whatsapp: false },
        { source: 'FILHO_1_CELULAR_1', value: getCellByHeaderAliases(row, lookup, ['FILHO_1_CELULAR_1', 'FILHO 1 CELULAR 1']), direct: false, whatsapp: false },
        { source: 'IRMAO_1_CELULAR_1', value: getCellByHeaderAliases(row, lookup, ['IRMAO_1_CELULAR_1', 'IRMAO 1 CELULAR 1']), direct: false, whatsapp: false },
    ]

    for (const candidate of contactCandidates) {
        const parsed = parsePhone(candidate.value)
        if (parsed) {
            return {
                telefone: parsed,
                source: candidate.source,
                direct: candidate.direct,
                whatsapp: candidate.whatsapp,
            }
        }
    }

    return {
        telefone: null,
        source: null,
        direct: true,
        whatsapp: false,
    }
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
    const headerLookup = detectedSchema.mode === 'header_mapping' && detectedSchema.headerRowIndex !== null
        ? buildHeaderLookup(rows[detectedSchema.headerRowIndex] || [])
        : new Map<string, number>()

    const schemaWarnings: string[] = []
    if (detectedSchema.mode === 'header_mapping') {
        if (detectedSchema.coreStrategy === 'cpf_nome' && !('nb' in detectedSchema.fieldMap)) {
            schemaWarnings.push('Layout enriquecido detectado por CPF + nome. O importador vai gerar um identificador técnico por lead e escolher automaticamente o melhor contato de abordagem.')
        } else {
            schemaWarnings.push(`Layout detectado por cabeçalhos (${detectedSchema.detectedFields.length} campo(s) mapeado(s)).`)
        }
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
        const cpf = parseCPF(detectedSchema.mode === 'header_mapping' ? getMappedCell(row, detectedSchema, 'cpf') : row[COL.CPF])
        const dataNascimento = detectedSchema.mode === 'header_mapping'
            ? parseDate(getCellByHeaderAliases(row, headerLookup, ['DATANASC', 'DATA NASC', 'DATA DE NASCIMENTO']))
            : null
        const syntheticNb = buildSyntheticNb(cpf, nome, dataNascimento)
        const effectiveNb = nb || syntheticNb

        if (!effectiveNb || !nome) continue

        // Deduplicação na planilha
        if (nbsVistas.has(effectiveNb)) { totalDuplicados++; continue }
        nbsVistas.add(effectiveNb)

        // Filtrar apenas ativos quando a origem informa status
        if (status && !status.includes('ativo')) { totalCessados++; continue }
        totalAtivos++

        const ganho = parseGanho(detectedSchema.mode === 'header_mapping' ? getMappedCell(row, detectedSchema, 'ganho_potencial') : row[COL.GANHO])
        const tipoRaw = detectedSchema.mode === 'header_mapping' ? getMappedCell(row, detectedSchema, 'tipo_beneficio') : row[COL.TIPO]
        const tipo = tipoRaw ? String(tipoRaw).trim() : ''
        const prioritizedContact = detectedSchema.mode === 'header_mapping'
            ? pickPrioritizedContact(row, headerLookup)
            : { telefone: parsePhone(getMappedCell(row, detectedSchema, 'telefone')), source: 'telefone', direct: true, whatsapp: false }
        const telefone = prioritizedContact.telefone
        const email = parseEmail(detectedSchema.mode === 'header_mapping' ? getMappedCell(row, detectedSchema, 'email') : null)
        const categoriaProfissional = truncate(detectedSchema.mode === 'header_mapping' ? String(getMappedCell(row, detectedSchema, 'categoria_profissional') || '') : null, 255)
        const anotacoesImportacao = [
            dataNascimento ? `Data de nascimento: ${dataNascimento}` : null,
            prioritizedContact.source
                ? prioritizedContact.direct
                    ? `Contato prioritário importado de ${prioritizedContact.source}.`
                    : `Contato prioritário importado de ${prioritizedContact.source} (contato relacionado; ajuste a abordagem da campanha).`
                : null,
        ].filter(Boolean).join(' ')

        if (ganho) ganhoTotal += ganho

        leads.push({
            tenant_id: context.tenantId,
            lista_id: lista.id,
            responsavel_id: context.usuarioId,
            nb: truncate(effectiveNb, 20),
            nome: truncate(nome, 255),
            cpf: cpf ? cpf.slice(0, 14) : null,
            telefone,
            telefone_enriquecido: prioritizedContact.direct ? null : telefone,
            aps: truncate(detectedSchema.mode === 'header_mapping' ? String(getMappedCell(row, detectedSchema, 'aps') || '') : (row[COL.APS] ? String(row[COL.APS]) : null), 255),
            banco: truncate(detectedSchema.mode === 'header_mapping' ? String(getMappedCell(row, detectedSchema, 'banco') || '') : (row[COL.BANCO] ? String(row[COL.BANCO]) : null), 100),
            dib: parseDate(detectedSchema.mode === 'header_mapping' ? getMappedCell(row, detectedSchema, 'dib') : row[COL.DIB]),
            tipo_beneficio: truncate(tipo, 255),
            valor_rma: parseGanho(detectedSchema.mode === 'header_mapping' ? getMappedCell(row, detectedSchema, 'valor_rma') : row[COL.VALOR_RMA]),
            categoria_profissional: categoriaProfissional,
            ganho_potencial: ganho,
            score: calcScore(ganho, tipo),
            status: 'new' as const,
            anotacao: truncate(anotacoesImportacao, 1000),
            enriquecido: Boolean(prioritizedContact.source),
            enriquecido_em: prioritizedContact.source ? new Date().toISOString() : null,
            tem_whatsapp: prioritizedContact.whatsapp ? true : null,
            lgpd_optout: false,
            ...(email ? { email } : {}),
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
