import * as XLSX from 'xlsx'
import { createClient } from '@supabase/supabase-js'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const PLANILHA = process.env.PLANILHA_PATH || '/Users/cauafarias/Documents/Documentos - MacBook Air de Cauã/Fluxrow/NOMES RJ BNG.xlsx'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function parseDate(val: unknown): string | null {
  if (!val) return null;
  // Se já for numérico (dado cru do excel sem formatação)
  if (typeof val === 'number') {
    try {
      const parsed = XLSX.SSF.parse_date_code(val);
      if (parsed) {
        // Garantir zero-padding no mês e dia
        const m = String(parsed.m).padStart(2, '0');
        const d = String(parsed.d).padStart(2, '0');
        return `${parsed.y}-${m}-${d}`;
      }
    } catch { }
  }

  // Falhou numérico, tentativa padrão
  if (val instanceof Date) return val.toISOString().split('T')[0];
  const s = String(val).trim();
  if (s === '00/00/0000' || s === '00/00') return null;
  
  try {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  } catch { }
  
  return null;
}

function parseGanho(val: unknown): number | null {
  if (!val) return null
  const s = String(val).replace(/[R$\s.]/g, '').replace(',', '.')
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

async function main() {
  console.log('📂 Lendo planilha...')
  const wb = XLSX.readFile(PLANILHA)
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })

  console.log(`📊 ${rows.length} linhas encontradas`)

  // Buscar todos os leads do banco (por NB)
  const { data: leadsDB, error } = await supabase
    .from('leads')
    .select('id, nb')
  
  if (error) { console.error('Erro ao buscar leads:', error); process.exit(1) }

  const nbMap = new Map(leadsDB!.map(l => [String(l.nb), l.id]))
  console.log(`🗃️  ${nbMap.size} leads no banco`)

  let updated = 0
  let skipped = 0

  for (const row of rows) {
    const nb = row[0] ? String(row[0]) : null
    if (!nb) { skipped++; continue }

    const leadId = nbMap.get(nb)
    if (!leadId) { skipped++; continue }

    // Sexo (col 42)
    const sexoRaw = row[42] ? String(row[42]).trim().toUpperCase() : null
    const sexo = sexoRaw === 'FEMININO' ? 'F' : sexoRaw === 'MASCULINO' ? 'M' : null

    const payload = {
      data_nascimento: parseDate(row[30]),
      sexo,
      categoria_profissional: row[41] ? String(row[41]).trim() : null,
      isencao_ir: row[46] ? String(row[46]).trim() : null,
      pensionista: row[51] ? String(row[51]).trim() : null,
      bloqueado: row[39] ? String(row[39]).toUpperCase() === 'SIM' : false,
      forma_pagamento: row[27] ? String(row[27]).trim() : null,
      der: parseDate(row[8]),
      aps: row[3] ? String(row[3]).replace(' PRISMA', '').trim() : null,
      nit: row[24] ? String(row[24]).trim() : null,
      dib: parseDate(row[9]),
    }

    const { error: updateError } = await supabase
      .from('leads')
      .update(payload)
      .eq('id', leadId)

    if (updateError) {
      console.error(`❌ Erro ao atualizar NB ${nb}:`, updateError.message)
    } else {
      updated++
      if (updated % 10 === 0) console.log(`✅ ${updated} leads atualizados...`)
    }
  }

  console.log(`\n✅ Concluído! ${updated} atualizados, ${skipped} ignorados.`)
}

main().catch(console.error)
