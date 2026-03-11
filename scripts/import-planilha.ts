import { createClient } from '@supabase/supabase-js'
import * as xlsx from 'xlsx'
import fs from 'fs'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Faltam variáveis de ambiente (NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY)")
    process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Helpers do parser original
function parseDateBR(dateStr: string | number) {
    try {
        if (!dateStr) return null;
        if (typeof dateStr === 'number') {
            const date = new Date((dateStr - (25567 + 1)) * 86400 * 1000);
            return date.toISOString().split('T')[0];
        }
        const str = String(dateStr).trim();
        if (str === '00/00/0000' || str === '00/00/00') return null;
        const parts = str.split('/');
        if (parts.length === 3) {
            return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        return null;
    } catch { return null; }
}

function parseCurrency(val: string | number) {
    if (!val) return null;
    if (typeof val === 'number') return val;
    const str = String(val).replace(/R\$\s*/g, '').replace(/\./g, '').replace(',', '.').trim();
    const num = parseFloat(str);
    return isNaN(num) ? null : num;
}

function calcScore(status: string, db: string, diff: number) {
    if (status !== 'Ativo') return 0;
    
    let base = 50;

    const dbId = parseInt(db) || 0;
    const highProb = [42, 46, 32, 92];
    const medProb = [87, 88, 31];
    
    if (highProb.includes(dbId)) base += 25;
    else if (medProb.includes(dbId)) base += 10;
    else base -= 10;
    
    if (diff > 50000) base += 25;
    else if (diff > 20000) base += 15;
    else if (diff > 5000) base += 5;
    else base -= 5;
    
    return Math.max(0, Math.min(100, base));
}

async function runImport() {
    const listPath = process.argv[2]
    if (!listPath || !fs.existsSync(listPath)) {
        console.error("❌ Por favor, passe o caminho completo do arquivo como argumento ou o arquivo não existe.")
        console.error("Ex: npx tsx scripts/import-planilha.ts /caminho/do/arquivo.xlsx")
        process.exit(1)
    }

    console.log(`Buscando admin owner do tenant para relatar os dados...`)
    const { data: usuario, error: userErr } = await supabase
        .from('usuarios')
        .select('id')
        .eq('email', 'jessica@alexandrini.com.br')
        .single()
        
    if (userErr || !usuario) throw new Error("Usuário (admin tenant) não encontrado!")

    const listaId = crypto.randomUUID()
    console.log("Registrando Lista:", listaId, "para usuária:", usuario.id)
    const { error: listaErr } = await supabase.from('listas').insert({
        id: listaId,
        nome: "Importação Final de Leads (Script)",
        fornecedor: "Script CLI",
        importado_por: usuario.id
    })

    if (listaErr) {
        console.error("❌ Erro ao criar a lista (parent record):", listaErr)
        process.exit(1)
    }

    console.log(`Lendo arquivo: ${listPath}...`)
    const workbook = xlsx.readFile(listPath)
    const sheetName = workbook.SheetNames[0]
    
    // Ler como array bidimensional porque a planilha real NÃO tem cabeçalho
    const rowsArray = xlsx.utils.sheet_to_json<any[]>(workbook.Sheets[sheetName], { header: 1 })

    console.log(`Registros brutos lidos (sem cabeçalho na planilha): ${rowsArray.length}`)
    
    // Deduplicate on script run by NB (coluna 3 - índice 2 do array da linha de dados?)
    // Inspecionando a saída do script anterior (primeira linha tinha chaves como '847126110', e valores como '846924595')
    // A planilha parece ter a primeira linha como um item do 'data'. O 'sheet_to_json' converteu mal.
    // Usando { header: 1 } resultará num array puro sem chaves de objeto.
    // Vamos rever os índices com base na amostra do log anterior:
    // [0] = NB
    // [1] = NOME
    // [3] = APS
    // [5] = AGENCIA
    // [6] = BANCO
    // [7] = CPF
    // [9] = DIB
    // [22] = BENEFICIO
    // [25] = VALOR_RMA
    // [43] = STATUS
    // [49] = GANHO_POT

    const uniqueLeadsMap = new Map();
    rowsArray.forEach((r, idx) => {
        if (!r || r.length < 5) return;
        
        // Pular array com cabeçalhos se existirem (índice 0 string NB)
        if (idx === 0 && String(r[0]).toLowerCase() === 'nb') return;

        const _nbStr = String(r[0] || '').replace(/\D/g, '');
        if (_nbStr && !uniqueLeadsMap.has(_nbStr)) {
            uniqueLeadsMap.set(_nbStr, r);
        }
    });

    const dedupedRows = Array.from(uniqueLeadsMap.values());
    console.log(`Registros após filtro de colisão (duplicatas): ${dedupedRows.length}`)

    const batch = [];
    let pot = 0;
    let ignored = 0;

    for (const row of dedupedRows) {
        let nbStr = String(row[0] || '').replace(/\D/g, '');
        const statusRow = String(row[43] || '').trim();
        const cpf = String(row[7] || '').replace(/\D/g, '');

        if (!nbStr || statusRow.toLowerCase() !== 'ativo') {
            ignored++;
            continue;
        }

        const dib = parseDateBR(row[9] || row[10] || row[11] || row[12]);
        const beneficio = String(row[22] || '').split('-')[0].trim();
        const valor_rma = parseCurrency(row[25]);
        const ganho_pot = parseCurrency(row[49] || 0);

        const score = calcScore('Ativo', beneficio, ganho_pot || 0);

        batch.push({
            nb: nbStr,
            cpf: cpf || null,
            nome: String(row[1] || 'Desconhecido').trim(),
            banco: String(row[6] || '').trim() || null,
            aps: String(row[3] || '').trim() || null,
            dib: dib,
            tipo_beneficio: beneficio || null,
            valor_rma: valor_rma,
            ganho_potencial: ganho_pot,
            telefone: null,
            score: score,
            lista_id: listaId,
            status: 'new'
        });
        
        if (ganho_pot) pot += ganho_pot;
    }

    console.log(`Leads ativos válidos: ${batch.length} (Cessados ou sem NB ignorados: ${ignored})`)

    const CHUNK_SIZE = 1000;
    let inseridos = 0;
    let duplicados_bd = 0;

    for (let i = 0; i < batch.length; i += CHUNK_SIZE) {
        process.stdout.write(`\rEnviando lote ${Math.round(i / CHUNK_SIZE) + 1} de ${Math.ceil(batch.length / CHUNK_SIZE)}...`);
        const chunk = batch.slice(i, i + CHUNK_SIZE);

        // First find out what exists to do UPSERT effectively or just catch err on ON CONFLICT
        const { error, data } = await supabase.from('leads').upsert(chunk, {
            onConflict: 'nb',
            ignoreDuplicates: true
        }).select('id');

        if (error) {
            console.error("\n❌ ERRO batch Supabase:", error);
        } else {
            inseridos += data?.length || 0;
            duplicados_bd += (chunk.length - (data?.length || 0));
        }
    }
    console.log("\nAtualizando estatísticas da Lista...");

    await supabase.from('listas').update({
        total_registros: rowsArray.length,
        ativos_importados: inseridos,
        cessados_ignorados: ignored,
        duplicatas_planilha: rowsArray.length - dedupedRows.length,
        duplicatas_banco: duplicados_bd,
        potencial_total: pot
    }).eq('id', listaId);

    console.log(`\n✅ IMPORTE CONCLUIDO!`);
    console.log(`   🔸 Leads na planilha: ${rowsArray.length}`);
    console.log(`   🔸 Inseridos Ativos: ${inseridos}`);
    console.log(`   🔸 Duplicatas evitadas BD: ${duplicados_bd}`);
    console.log(`   🔸 Potencial total desta lista: R$ ${pot.toLocaleString('pt-br')}`);
    process.exit(0);
}

runImport()
