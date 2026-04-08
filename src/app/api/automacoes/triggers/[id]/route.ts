import { NextResponse } from 'next/server'
import { contextHasPermission, getTenantContext } from '@/lib/tenant-context'
import { createClient } from '@/lib/supabase/server'
import { createAdminSupabase } from '@/lib/internal-collaboration'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
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
        const id = (await params).id
        const body = await req.json()

        const {
            trigger_evento,
            trigger_condicao,
            acao_tipo,
            acao_ref_id,
            ativo,
            cancelar_followups_rodando,
            enviar_mensagem_transicao,
            mensagem_transicao_texto
        } = body

        const updateData: any = {}
        if (trigger_evento !== undefined) updateData.trigger_evento = trigger_evento
        if (trigger_condicao !== undefined) updateData.trigger_condicao = trigger_condicao
        if (acao_tipo !== undefined) updateData.acao_tipo = acao_tipo
        if (acao_ref_id !== undefined) updateData.acao_ref_id = acao_ref_id
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
            .eq('tenant_id', context.tenantId)
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
        const id = (await params).id

        const { error } = await supabase
            .from('event_triggers')
            .delete()
            .eq('id', id)
            .eq('tenant_id', context.tenantId)

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
