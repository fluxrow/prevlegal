import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { buildInboxHref } from '@/lib/contact-shortcuts'
import { getTenantContext } from '@/lib/tenant-context'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const supabase = await createClient()
  const context = await getTenantContext(supabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!context.tenantId) return NextResponse.json({ resultados: [] })

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json({ resultados: [] })

  const termo = `%${q}%`
  const adminSupabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const [{ data: leads }, { data: documentos }, { data: conversas }] = await Promise.all([
    adminSupabase
      .from('leads')
      .select('id, nome, cpf, telefone, nb, status, origem')
      .eq('tenant_id', context.tenantId)
      .or(`nome.ilike.${termo},cpf.ilike.${termo},telefone.ilike.${termo},nb.ilike.${termo}`)
      .limit(6),

    adminSupabase
      .from('lead_documentos')
      .select('id, lead_id, nome, tipo, gerado_por_ia, created_at, leads(nome)')
      .eq('tenant_id', context.tenantId)
      .ilike('nome', termo)
      .limit(4),

    adminSupabase
      .from('conversas')
      .select('id, lead_id, status, ultima_mensagem_em, leads!inner(id, nome, telefone)')
      .eq('tenant_id', context.tenantId)
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
      href: buildInboxHref({ conversaId: c.id, telefone: (c.leads as any)?.telefone }),
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
