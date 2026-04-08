import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { resolveUsuarioAtual } from '@/lib/current-usuario'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const usuario = await resolveUsuarioAtual(user)
  if (!usuario) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

  const formData = await request.formData()
  const arquivo = formData.get('arquivo') as File
  const tipo = formData.get('tipo') as string // 'foto' | 'logo'
  if (!arquivo || !tipo) return NextResponse.json({ error: 'Arquivo ou tipo ausente' }, { status: 400 })

  const ext = arquivo.name.split('.').pop()
  const path = `${usuario.id}/${tipo}.${ext}`
  const buffer = Buffer.from(await arquivo.arrayBuffer())

  const { error: upError } = await supabase.storage
    .from('perfil-advogado')
    .upload(path, buffer, { contentType: arquivo.type, upsert: true })

  if (upError) return NextResponse.json({ error: upError.message }, { status: 500 })

  const { data: signedData } = await supabase.storage
    .from('perfil-advogado')
    .createSignedUrl(path, 60 * 60 * 24 * 365)

  const signedUrl = signedData?.signedUrl || ''
  const campo = tipo === 'foto' ? 'foto_url' : 'escritorio_logo_url'

  await supabase
    .from('advogados')
    .upsert(
      { usuario_id: usuario.id, [campo]: signedUrl, updated_at: new Date().toISOString() },
      { onConflict: 'usuario_id' }
    )

  return NextResponse.json({ url: signedUrl })
}
