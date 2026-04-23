export type Role = 'admin' | 'operador' | 'visualizador'

export type LeadStatus = 'new' | 'contacted' | 'awaiting' | 'scheduled' | 'converted' | 'lost'

export interface Tenant {
    id: string
    nome: string
    slug: string
    supabase_url: string
    plano: 'starter' | 'pro' | 'enterprise'
    ativo: boolean
    created_at: string
}

export interface Usuario {
    id: string
    tenant_id: string
    nome: string
    email: string
    role: Role
    avatar_url?: string
    ativo: boolean
    created_at: string
}

export interface Lista {
    id: string
    tenant_id: string
    nome: string
    fornecedor?: string
    total_registros: number
    total_ativos: number
    ganho_potencial_medio: number
    importado_por: string
    created_at: string
}

export interface Campanha {
    id: string
    tenant_id: string
    lista_id: string
    nome: string
    descricao?: string
    agente_id?: string
    responsavel_id?: string
    status: 'rascunho' | 'ativa' | 'pausada' | 'encerrada'
    contato_alvo_tipo?: 'titular' | 'conjuge' | 'filho' | 'irmao' | null
    created_at: string
}

export interface Lead {
    id: string
    tenant_id: string
    lista_id: string
    campanha_id?: string
    nb: string
    nome: string
    cpf?: string | null
    telefone?: string
    email?: string | null
    telefone_enriquecido?: string | null
    conjuge_nome?: string | null
    conjuge_celular?: string | null
    conjuge_telefone?: string | null
    filho_nome?: string | null
    filho_celular?: string | null
    filho_telefone?: string | null
    irmao_nome?: string | null
    irmao_celular?: string | null
    irmao_telefone?: string | null
    contato_abordagem_tipo?: 'titular' | 'conjuge' | 'filho' | 'irmao' | 'outro' | null
    contato_abordagem_origem?: string | null
    contato_alternativo_tipo?: 'titular' | 'conjuge' | 'filho' | 'irmao' | 'outro' | null
    contato_alternativo_origem?: string | null
    anotacao?: string | null
    aps?: string
    banco?: string
    dib?: string
    tipo_beneficio?: string
    valor_rma?: number
    ganho_potencial?: number
    score: number
    status: LeadStatus
    responsavel_id?: string
    enriquecido: boolean
    lgpd_optout: boolean
    created_at: string
    updated_at: string
}

export interface Interaction {
    id: string
    lead_id: string
    tenant_id: string
    canal: 'whatsapp' | 'email' | 'telefone' | 'manual'
    tipo: 'enviado' | 'recebido' | 'anotacao'
    conteudo: string
    por_agente: boolean
    usuario_id?: string
    created_at: string
}

export interface Agendamento {
    id: string
    lead_id: string
    tenant_id: string
    usuario_id: string
    google_event_id?: string
    meet_link?: string
    data_hora: string
    status: 'agendado' | 'confirmado' | 'realizado' | 'cancelado' | 'remarcado'
    honorario?: number
    created_at: string
}

export interface Agente {
    id: string
    tenant_id: string
    nome: string
    perfil_operacao?: 'beneficios_previdenciarios' | 'planejamento_previdenciario'
    prompt_base: string
    horario_inicio: string
    horario_fim: string
    dias_ativos: number[]
    escalada_keywords: string[]
    ativo: boolean
    created_at: string
}
