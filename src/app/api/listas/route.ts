export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

const adminClient = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const { data: listas, error } = await adminClient
      .from('listas')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const listasComTotal = await Promise.all(
      (listas || []).map(async (lista) => {
        const { count } = await adminClient
          .from('lista_leads')
          .select('*', { count: 'exact', head: true })
          .eq('lista_id', lista.id)
        return { ...lista, total_leads: count || lista.total_leads || 0 }
      })
    )

    return NextResponse.json({ listas: listasComTotal })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
