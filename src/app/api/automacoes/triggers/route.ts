import { NextResponse } from 'next/server'
import { contextHasPermission, getTenantContext } from '@/lib/tenant-context'
import { createClient } from '@/lib/supabase/server'
import { createAdminSupabase } from '@/lib/internal-collaboration'

export async function GET() {
    try {
        const authSupabase = await createClient()
        const context = await getTenantContext(authSupabase)
        if (!context) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }
        if (!context.tenantId) {
            return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 400 })
        }
        if (!contextHasPermission(context, 'automacoes_manage')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const supabase = createAdminSupabase()
        const { data, error } = await supabase
            .from('event_triggers')
            .select('*')
            .eq('tenant_id', context.tenantId)
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
        const authSupabase = await createClient()
        const context = await getTenantContext(authSupabase)
        if (!context) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }
        if (!context.tenantId) {
            return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 400 })
        }
        if (!contextHasPermission(context, 'automacoes_manage')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const supabase = createAdminSupabase()
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
            tenant_id: context.tenantId,
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
