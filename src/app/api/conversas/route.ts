import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/tenant-context'
import { canViewConversationForInbox } from '@/lib/inbox-visibility'

const STATUS_VALIDOS = new Set(['agente', 'humano', 'aguardando_cliente', 'resolvido', 'encerrado'])

export async function GET() {
  const supabase = await createClient()
  const context = await getTenantContext(supabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('conversas')
    .select('*, leads(id, nome, nb, status, responsavel_id)')
    .eq('tenant_id', context.tenantId)
    .order('ultima_mensagem_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(
    (data || [])
      .filter((conversa) => canViewConversationForInbox(context, conversa))
      .map((conversa) => ({
        ...conversa,
        status: STATUS_VALIDOS.has(conversa.status) ? conversa.status : 'agente',
      })),
  )
}
