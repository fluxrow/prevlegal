const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const lines = envContent.split('\n');
let url = '', key = '';
lines.forEach(l => {
    if (l.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = l.split('=')[1].trim();
    if (l.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) key = l.split('=')[1].trim();
});

const supabase = createClient(url, key);
const planilhaPath = '/Users/cauafarias/Documents/Documentos - MacBook Air de Cauã/Fluxrow/VEM SAMBAR CURITIBA/PREVLEGAL/NOMES RJ BNG.xlsx';

const COL = {
    NB: 0, NOME: 1, APS: 3, BANCO: 6, CPF: 7,
    DIB: 9, TIPO: 22, VALOR_RMA: 25, STATUS: 43, GANHO: 49,
}

function parseGanho(val) {
    if (!val) return null
    const str = String(val).replace(/[R$\s.]/g, '').replace(',', '.')
    const num = parseFloat(str)
    return isNaN(num) ? null : num
}

function parseCPF(val) {
    if (!val) return ''
    return String(val).replace(/\D/g, '').padStart(11, '0')
}

function parseDate(val) {
    if (!val) return null
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

function calcScore(ganho, tipo) {
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

async function run() {
    console.log('Validando usuario interno (public.usuarios)...');
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const jessica = users.find(u => u.email === 'jessica@alexandrini.com.br');

    if (!jessica) {
        console.error('Usuário auth não encontrado');
        return;
    }

    let { data: pubUser } = await supabase.from('usuarios').select('id').eq('email', jessica.email).single();
    if (!pubUser) {
        const { data, error } = await supabase.from('usuarios').insert({
            auth_id: jessica.id,
            email: jessica.email,
            nome: 'Jessica Alexandrini',
            role: 'admin'
        }).select().single();
        if (error) { console.error('Error insert pub user:', error); return; }
        pubUser = data;
    }
    console.log('ID public.usuarios:', pubUser.id);

    console.log('Lendo planilha:', planilhaPath);
    const buffer = fs.readFileSync(planilhaPath);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

    console.log('Criando Lista no banco...');
    const { data: lista, error: listaError } = await supabase
        .from('listas')
        .insert({
            nome: 'NOMES RJ BNG',
            fornecedor: 'Importação Direta CLI',
            arquivo_original: 'NOMES RJ BNG.xlsx',
            total_registros: rows.length,
            importado_por: pubUser.id
        })
        .select()
        .single();

    if (listaError || !lista) {
        console.error('Erro ao criar lista:', listaError);
        return;
    }

    console.log('Processando leads...');
    const leads = [];
    let totalAtivos = 0;
    let totalCessados = 0;
    let totalDuplicados = 0;
    let ganhoTotal = 0;
    const nbsVistas = new Set();

    for (const row of rows) {
        const nb = row[COL.NB] ? String(row[COL.NB]).trim() : null;
        const nome = row[COL.NOME] ? String(row[COL.NOME]).trim() : null;
        const status = row[COL.STATUS] ? String(row[COL.STATUS]).trim().toLowerCase() : '';

        if (!nb || !nome) continue;

        if (nbsVistas.has(nb)) { totalDuplicados++; continue; }
        nbsVistas.add(nb);

        if (!status.includes('ativo')) { totalCessados++; continue; }
        totalAtivos++;

        const ganho = parseGanho(row[COL.GANHO]);
        const tipo = row[COL.TIPO] ? String(row[COL.TIPO]).trim() : '';
        const cpf = parseCPF(row[COL.CPF]);

        if (ganho) ganhoTotal += ganho;

        leads.push({
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
            status: 'new',
            enriquecido: false,
            lgpd_optout: false
        });
    }

    console.log(`Leads válidos para importar: ${leads.length}`);

    await supabase
        .from('listas')
        .update({
            total_ativos: totalAtivos,
            total_cessados: totalCessados,
            total_duplicados: totalDuplicados,
            ganho_potencial_total: ganhoTotal,
            ganho_potencial_medio: totalAtivos > 0 ? ganhoTotal / totalAtivos : 0
        })
        .eq('id', lista.id);

    let inseridos = 0;
    let duplicatasNoBanco = 0;
    const batchSize = 50;

    process.stdout.write('Inserindo batches... ');
    for (let i = 0; i < leads.length; i += batchSize) {
        const batch = leads.slice(i, i + batchSize);
        const { data, error } = await supabase
            .from('leads')
            .upsert(batch, { onConflict: 'nb', ignoreDuplicates: true })
            .select('id');

        if (!error && data) {
            inseridos += data.length;
            duplicatasNoBanco += batch.length - data.length;
        } else if (error) {
            console.error('Erro no lote:', error);
        }
    }

    console.log('\n--- Resultado Final ---');
    console.log(`Total na planilha: ${rows.length}`);
    console.log(`Duplicatas Planilha: ${totalDuplicados}`);
    console.log(`Cessados/Ignorados: ${totalCessados}`);
    console.log(`Ativos Válidos: ${leads.length}`);
    console.log(`Inseridos com Sucesso: ${inseridos}`);
    console.log(`Duplicatas no Banco (pulados): ${duplicatasNoBanco}`);
    console.log(`Potencial Total Estimado: R$ ${ganhoTotal.toFixed(2)}`);
}

run().catch(console.error);
