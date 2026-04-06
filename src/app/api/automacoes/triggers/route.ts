import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
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

        const { data, error } = await supabase
            .from('event_triggers')
            .select('*')
            .eq('tenant_id', dbUser.tenant_id)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Erro GET event_triggers:', error)
            return NextResponse.json({ error: 'Falha ao buscar gatilhos' }, { status: 500 })
        }

        return NextResponse.json(data)
    } catch (e: any) {
        console.error('Catch GET event_triggers:', e)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

export async function POST(req: Request) {
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

        const body = await req.json()

        const {
            trigger_evento,
            trigger_condicao,
            acao_tipo,
            acao_ref_id,
            cancelar_followups_rodando,
            enviar_mensagem_transicao,
            mensagem_transicao_texto,
            is_template_default
        } = body

        if (!trigger_evento || !trigger_condicao || !acao_tipo || !acao_ref_id) {
            return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 })
        }

        const triggerData = {
            tenant_id: dbUser.tenant_id,
            trigger_evento,
            trigger_condicao,
            acao_tipo,
            acao_ref_id,
            cancelar_followups_rodando: cancelar_followups_rodando ?? true,
            enviar_mensagem_transicao: enviar_mensagem_transicao ?? false,
            mensagem_transicao_texto: mensagem_transicao_texto ?? null,
            is_template_default: is_template_default ?? false,
            ativo: true
        }

        const { data, error } = await supabase
            .from('event_triggers')
            .insert(triggerData)
            .select()
            .single()

        if (error) {
            console.error('Erro POST event_triggers:', error)
            return NextResponse.json({ error: 'Falha ao criar gatilho' }, { status: 500 })
        }

        return NextResponse.json(data, { status: 201 })
    } catch (e: any) {
        console.error('Catch POST event_triggers:', e)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}
