export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { contextHasPermission, getTenantContext } from '@/lib/tenant-context'

const LISTA_MANUAL_NOME = 'Cadastro manual'
const LISTA_MANUAL_FORNECEDOR = 'sistema'

function createAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const context = await getTenantContext(supabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!contextHasPermission(context, 'listas_manage')) return NextResponse.json({ error: 'Você não tem permissão para excluir listas' }, { status: 403 })
  if (!context.tenantId) return NextResponse.json({ error: 'Tenant do usuário não configurado' }, { status: 409 })

  const { id } = await params
  const adminSupabase = createAdmin()

  const { data: lista, error: listaError } = await adminSupabase
    .from('listas')
    .select('id, nome, fornecedor')
    .eq('id', id)
    .eq('tenant_id', context.tenantId)
    .maybeSingle()

  if (listaError) return NextResponse.json({ error: listaError.message }, { status: 500 })
  if (!lista) return NextResponse.json({ error: 'Lista não encontrada' }, { status: 404 })

  if (lista.nome === LISTA_MANUAL_NOME && lista.fornecedor === LISTA_MANUAL_FORNECEDOR) {
    return NextResponse.json({ error: 'A lista técnica de cadastro manual não pode ser excluída por esta tela' }, { status: 409 })
  }

  const { error: leadsError } = await adminSupabase
    .from('leads')
    .delete()
    .eq('lista_id', id)
    .eq('tenant_id', context.tenantId)

  if (leadsError) return NextResponse.json({ error: leadsError.message }, { status: 500 })

  const { error: listaDeleteError } = await adminSupabase
    .from('listas')
    .delete()
    .eq('id', id)
    .eq('tenant_id', context.tenantId)

  if (listaDeleteError) return NextResponse.json({ error: listaDeleteError.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
