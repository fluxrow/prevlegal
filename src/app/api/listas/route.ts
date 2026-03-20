export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/tenant-context'

const LISTA_MANUAL_NOME = 'Cadastro manual'
const LISTA_MANUAL_FORNECEDOR = 'sistema'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const context = await getTenantContext(supabase)
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { searchParams } = new URL(request.url)
    const includeSystem = searchParams.get('include_system') === '1'

    let query = supabase
      .from('listas')
      .select('*')
      .order('created_at', { ascending: false })

    if (context.tenantId) {
      query = query.eq('tenant_id', context.tenantId)
    }

    const { data: listas, error } = await query

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const listasComTotal = await Promise.all(
      (listas || [])
      .filter((lista) => includeSystem || !(lista.nome === LISTA_MANUAL_NOME && lista.fornecedor === LISTA_MANUAL_FORNECEDOR))
      .map(async (lista) => {
        let countQuery = supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('lista_id', lista.id)

        if (context.tenantId) {
          countQuery = countQuery.eq('tenant_id', context.tenantId)
        }

        const { count } = await countQuery
        return {
          ...lista,
          total_leads: count || lista.total_leads || 0,
          com_whatsapp: lista.total_com_whatsapp ?? lista.com_whatsapp ?? 0,
          sem_whatsapp: lista.total_sem_whatsapp ?? lista.sem_whatsapp ?? 0,
          nao_verificado: lista.total_nao_verificado ?? lista.nao_verificado ?? 0,
          is_sistema: lista.nome === LISTA_MANUAL_NOME && lista.fornecedor === LISTA_MANUAL_FORNECEDOR,
        }
      })
    )

    return NextResponse.json({ listas: listasComTotal })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
