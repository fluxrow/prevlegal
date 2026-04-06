import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const supabase = await createClient()

        const { data: userData, error: authError } = await supabase.auth.getUser()
        if (authError || !userData?.user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const { data: dbUser } = await supabase
            .from('usuarios')
            .select('tenant_id')
            .eq('id', userData.user.id)
            .single()

        if (!dbUser?.tenant_id) {
            return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 400 })
        }

        const id = (await params).id
        const body = await req.json()

        const {
            ativo,
            cancelar_followups_rodando,
            enviar_mensagem_transicao,
            mensagem_transicao_texto
        } = body

        // Apenas permite atualizar configurações ou status ativo
        const updateData: any = {}
        if (ativo !== undefined) updateData.ativo = ativo
        if (cancelar_followups_rodando !== undefined) updateData.cancelar_followups_rodando = cancelar_followups_rodando
        if (enviar_mensagem_transicao !== undefined) updateData.enviar_mensagem_transicao = enviar_mensagem_transicao
        if (mensagem_transicao_texto !== undefined) updateData.mensagem_transicao_texto = mensagem_transicao_texto

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
        }

        const { data, error } = await supabase
            .from('event_triggers')
            .update(updateData)
            .eq('id', id)
            .eq('tenant_id', dbUser.tenant_id) // Segurança para não atualizar gatilho de outro tenant
            .select()
            .single()

        if (error) {
            console.error('Erro PATCH event_triggers:', error)
            return NextResponse.json({ error: 'Falha ao atualizar gatilho' }, { status: 500 })
        }

        return NextResponse.json(data)
    } catch (e: any) {
        console.error('Catch PATCH event_triggers:', e)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const supabase = await createClient()

        const { data: userData, error: authError } = await supabase.auth.getUser()
        if (authError || !userData?.user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const { data: dbUser } = await supabase
            .from('usuarios')
            .select('tenant_id')
            .eq('id', userData.user.id)
            .single()

        if (!dbUser?.tenant_id) {
            return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 400 })
        }

        const id = (await params).id

        const { error } = await supabase
            .from('event_triggers')
            .delete()
            .eq('id', id)
            .eq('tenant_id', dbUser.tenant_id)

        if (error) {
            console.error('Erro DELETE event_triggers:', error)
            return NextResponse.json({ error: 'Falha ao excluir gatilho' }, { status: 500 })
        }

        return new NextResponse(null, { status: 204 })
    } catch (e: any) {
        console.error('Catch DELETE event_triggers:', e)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
