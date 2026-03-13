import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  const formData = await request.formData()
  const arquivo = formData.get('arquivo') as File
  const tipo = formData.get('tipo') as string // 'foto' | 'logo'

  if (!arquivo || !tipo) {
    return NextResponse.json({ error: 'Arquivo ou tipo ausente' }, { status: 400 })
  }

  const ext = arquivo.name.split('.').pop()
  const path = `${tipo}-${Date.now()}.${ext}`
  const buffer = Buffer.from(await arquivo.arrayBuffer())

  const { error: upError } = await supabase.storage
    .from('perfil-advogado')
    .upload(path, buffer, { contentType: arquivo.type, upsert: true })

  if (upError) return NextResponse.json({ error: upError.message }, { status: 500 })

  const { data: signedData } = await supabase.storage
    .from('perfil-advogado')
    .createSignedUrl(path, 60 * 60 * 24 * 365)

  const signedUrl = signedData?.signedUrl || ''
  const campo = tipo === 'foto' ? 'advogado_foto_url' : 'escritorio_logo_url'

  const { data: existing } = await supabase
    .from('configuracoes')
    .select('id')
    .limit(1)
    .single()

  if (existing) {
    await supabase.from('configuracoes').update({ [campo]: signedUrl }).eq('id', existing.id)
  }

  return NextResponse.json({ url: signedUrl })
}
