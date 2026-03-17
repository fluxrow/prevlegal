import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json({ resultados: [] })

  const termo = `%${q}%`

  const [{ data: leads }, { data: documentos }, { data: conversas }] = await Promise.all([
    supabase
      .from('leads')
      .select('id, nome, cpf, telefone, nb, status, origem')
      .or(`nome.ilike.${termo},cpf.ilike.${termo},telefone.ilike.${termo},nb.ilike.${termo}`)
      .limit(6),

    supabase
      .from('lead_documentos')
      .select('id, lead_id, nome, tipo, gerado_por_ia, created_at, leads(nome)')
      .ilike('nome', termo)
      .limit(4),

    supabase
      .from('conversas')
      .select('id, lead_id, status, ultima_mensagem_em, leads!inner(id, nome, telefone)')
      .ilike('leads.nome', termo)
      .limit(4),
  ])

  const resultados = [
    ...(leads || []).map(l => ({
      tipo: 'lead' as const,
      id: l.id,
      titulo: l.nome,
      subtitulo: l.telefone || l.cpf || l.nb || '',
      badge: l.status,
      href: `/leads/${l.id}`,
    })),
    ...(conversas || []).map(c => ({
      tipo: 'conversa' as const,
      id: c.id,
      titulo: `Conversa — ${(c.leads as any)?.nome || 'Lead'}`,
      subtitulo: c.status === 'agente' ? 'Com agente IA' : c.status === 'humano' ? 'Com advogado' : 'Encerrada',
      badge: c.status,
      href: `/caixa-de-entrada`,
    })),
    ...(documentos || []).map(d => ({
      tipo: 'documento' as const,
      id: d.id,
      titulo: d.nome,
      subtitulo: `Lead: ${(d.leads as any)?.nome || ''}`,
      badge: d.gerado_por_ia ? 'IA' : d.tipo,
      href: `/leads/${d.lead_id}`,
    })),
  ]

  return NextResponse.json({ resultados })
}
