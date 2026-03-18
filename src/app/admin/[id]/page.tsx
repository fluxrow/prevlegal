'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import SessionActivityTracker from '@/components/session-activity-tracker'
import { ADMIN_IDLE_MINUTES } from '@/lib/session-config'
import {
  ArrowLeft, Building2, Users, MessageSquare, TrendingUp,
  CheckCircle, DollarSign, ExternalLink, Calendar, Zap,
} from 'lucide-react'

interface Metricas {
  totalLeads: number
  leadsConvertidos: number
  taxaConversao: string
  totalConversas: number
  conversasHumano: number
  totalCampanhas: number
  totalContratos: number
  receitaTotal: number
  portalNaoLidas: number
  totalAgendamentos: number
  totalUsuarios: number
}

interface Tenant {
  id: string
  nome: string
  slug: string
  responsavel_nome: string
  responsavel_email: string
  responsavel_telefone: string
  plano: string
  status: string
  trial_expira_em: string | null
  created_at: string
  notas: string
}

interface ConversaResumo {
  telefone: string | null
  ultima_mensagem: string | null
  ultima_mensagem_at: string | null
  status: string
}

interface CampanhaResumo {
  nome: string
  status: string
  total_enviados: number | null
  total_convertidos: number | null
  created_at: string
}

const STATUS: Record<string, { label: string; color: string }> = {
  ativo:     { label: 'Ativo',     color: '#22c55e' },
  trial:     { label: 'Trial',     color: '#f5c842' },
  suspenso:  { label: 'Suspenso',  color: '#ff5757' },
  cancelado: { label: 'Cancelado', color: '#6b7280' },
}

const PLANO: Record<string, { label: string; color: string }> = {
  entrada:      { label: 'Entrada',      color: '#6b7280' },
  profissional: { label: 'Profissional', color: '#4f7aff' },
  enterprise:   { label: 'Enterprise',   color: '#7c3aed' },
  basico:       { label: 'Básico',       color: '#6b7280' },
}

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(v)
}

function KpiCard({ label, value, color, icon }: { label: string; value: string | number; color: string; icon: React.ReactNode }) {
  return (
    <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '12px', padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '8px' }}>
        <span style={{ color }}>{icon}</span>
        <span style={{ fontSize: '10px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      </div>
      <p style={{ fontSize: '26px', fontWeight: '700', color: '#fff', fontFamily: 'Syne, sans-serif', margin: 0 }}>{value}</p>
    </div>
  )
}

export default function TenantDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [data, setData] = useState<{
    tenant: Tenant
    metricas: Metricas
    ultimasConversas: ConversaResumo[]
    ultimosCampanhas: CampanhaResumo[]
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/admin/tenants/${id}/metricas`)
      .then(r => {
        if (r.status === 401) {
          router.push('/admin/login')
          return null
        }
        if (r.status === 428) {
          router.push(`/admin/reauth?next=${encodeURIComponent(`/admin/${id}`)}`)
          return null
        }
        return r.json()
      })
      .then(json => {
        if (json) setData(json)
      })
      .finally(() => setLoading(false))
  }, [id, router])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#080b14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#6b7280', fontSize: '14px', fontFamily: 'DM Sans, sans-serif' }}>Carregando...</div>
      </div>
    )
  }

  if (!data) return null

  const { tenant, metricas, ultimasConversas, ultimosCampanhas } = data
  const status = STATUS[tenant.status] || STATUS.trial
  const plano = PLANO[tenant.plano] || PLANO.profissional
  const plataformaUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://prevlegal.vercel.app'

  return (
    <div style={{ minHeight: '100vh', background: '#080b14', fontFamily: 'DM Sans, sans-serif', color: '#fff' }}>
      <SessionActivityTracker mode="admin" idleMinutes={ADMIN_IDLE_MINUTES} touchUrl="/api/admin/session/touch" loginUrl="/admin/login" logoutUrl="/api/admin/auth" />
      <div style={{ height: '56px', background: '#111827', borderBottom: '1px solid #1f2937', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => router.push('/admin')} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '13px' }}>
            <ArrowLeft size={15} /> Voltar
          </button>
          <span style={{ color: '#374151' }}>|</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 size={15} color="#4f7aff" />
            <span style={{ fontSize: '15px', fontWeight: '700', fontFamily: 'Syne, sans-serif' }}>{tenant.nome}</span>
            <span style={{ fontSize: '11px', background: `${status.color}20`, color: status.color, border: `1px solid ${status.color}40`, borderRadius: '20px', padding: '2px 10px', fontWeight: '600' }}>{status.label}</span>
            <span style={{ fontSize: '11px', background: `${plano.color}20`, color: plano.color, border: `1px solid ${plano.color}40`, borderRadius: '20px', padding: '2px 10px', fontWeight: '600' }}>{plano.label}</span>
          </div>
        </div>
        <a
          href={plataformaUrl}
          target="_blank"
          rel="noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#4f7aff', textDecoration: 'none' }}
        >
          <ExternalLink size={12} /> Abrir plataforma
        </a>
      </div>

      <div style={{ padding: '28px', maxWidth: '1300px', margin: '0 auto' }}>
        <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '14px', padding: '20px 24px', marginBottom: '24px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
          <div>
            <p style={{ fontSize: '10px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Responsável</p>
            <p style={{ fontSize: '14px', fontWeight: '600', color: '#fff', margin: '0 0 2px' }}>{tenant.responsavel_nome || '—'}</p>
            <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>{tenant.responsavel_email}</p>
          </div>
          <div>
            <p style={{ fontSize: '10px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Telefone</p>
            <p style={{ fontSize: '14px', color: '#d1d5db', margin: 0 }}>{tenant.responsavel_telefone || '—'}</p>
          </div>
          <div>
            <p style={{ fontSize: '10px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Cliente desde</p>
            <p style={{ fontSize: '14px', color: '#d1d5db', margin: 0 }}>{new Date(tenant.created_at).toLocaleDateString('pt-BR')}</p>
          </div>
          <div>
            <p style={{ fontSize: '10px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Slug</p>
            <p style={{ fontSize: '13px', color: '#6b7280', margin: 0, fontFamily: 'monospace' }}>{tenant.slug}</p>
          </div>
          {tenant.notas && (
            <div style={{ gridColumn: '1 / -1' }}>
              <p style={{ fontSize: '10px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Notas</p>
              <p style={{ fontSize: '13px', color: '#9ca3af', margin: 0, lineHeight: '1.5' }}>{tenant.notas}</p>
            </div>
          )}
        </div>

        <h3 style={{ fontSize: '12px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '14px' }}>Métricas de uso</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px', marginBottom: '28px' }}>
          <KpiCard label="Leads" value={metricas.totalLeads.toLocaleString('pt-BR')} color="#4f7aff" icon={<Users size={15} />} />
          <KpiCard label="Convertidos" value={metricas.leadsConvertidos} color="#22c55e" icon={<CheckCircle size={15} />} />
          <KpiCard label="Conversão" value={`${metricas.taxaConversao}%`} color="#2dd4a0" icon={<TrendingUp size={15} />} />
          <KpiCard label="Conversas" value={metricas.totalConversas} color="#a855f7" icon={<MessageSquare size={15} />} />
          <KpiCard label="Campanhas" value={metricas.totalCampanhas} color="#f97316" icon={<Zap size={15} />} />
          <KpiCard label="Receita" value={fmt(metricas.receitaTotal)} color="#f5c842" icon={<DollarSign size={15} />} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '14px', padding: '20px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: '600', color: '#fff', fontFamily: 'Syne, sans-serif', marginBottom: '16px' }}>Últimas conversas</h3>
            {ultimasConversas.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#6b7280', textAlign: 'center', padding: '20px 0' }}>Nenhuma conversa ainda</p>
            ) : ultimasConversas.map((conversa, index) => (
              <div key={`${conversa.telefone || 'sem-telefone'}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 0', borderBottom: index < ultimasConversas.length - 1 ? '1px solid #1f2937' : 'none' }}>
                <div>
                  <p style={{ fontSize: '13px', color: '#d1d5db', margin: '0 0 3px', fontFamily: 'monospace' }}>{conversa.telefone || 'Sem telefone'}</p>
                  <p style={{ fontSize: '11px', color: '#6b7280', margin: 0, maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conversa.ultima_mensagem || '—'}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '10px', color: conversa.status === 'humano' ? '#22c55e' : conversa.status === 'agente' ? '#4f7aff' : '#6b7280', fontWeight: '600' }}>
                    {conversa.status === 'humano' ? '👤 Humano' : conversa.status === 'agente' ? '🤖 Agente' : '✓ Enc.'}
                  </span>
                  {conversa.ultima_mensagem_at && (
                    <p style={{ fontSize: '10px', color: '#6b7280', margin: '3px 0 0' }}>
                      {new Date(conversa.ultima_mensagem_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '14px', padding: '20px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: '600', color: '#fff', fontFamily: 'Syne, sans-serif', marginBottom: '16px' }}>Últimas campanhas</h3>
            {ultimosCampanhas.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#6b7280', textAlign: 'center', padding: '20px 0' }}>Nenhuma campanha ainda</p>
            ) : ultimosCampanhas.map((campanha, index) => (
              <div key={`${campanha.nome}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 0', borderBottom: index < ultimosCampanhas.length - 1 ? '1px solid #1f2937' : 'none' }}>
                <div>
                  <p style={{ fontSize: '13px', color: '#d1d5db', margin: '0 0 3px', fontWeight: '500' }}>{campanha.nome}</p>
                  <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>
                    {(campanha.total_enviados || 0).toLocaleString('pt-BR')} disparos · {campanha.total_convertidos || 0} convertidos
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '10px', fontWeight: '600', color: campanha.status === 'concluida' ? '#22c55e' : campanha.status === 'ativa' ? '#4f7aff' : '#6b7280' }}>
                    {campanha.status}
                  </span>
                  <p style={{ fontSize: '10px', color: '#6b7280', margin: '3px 0 0' }}>
                    {new Date(campanha.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '14px', padding: '20px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: '600', color: '#fff', fontFamily: 'Syne, sans-serif', marginBottom: '16px' }}>Resumo operacional</h3>
            {[
              { label: 'Conversas com humano ativo', value: metricas.conversasHumano, color: '#22c55e' },
              { label: 'Msgs portal não lidas', value: metricas.portalNaoLidas, color: '#4f7aff' },
              { label: 'Agendamentos', value: metricas.totalAgendamentos, color: '#a855f7' },
              { label: 'Contratos registrados', value: metricas.totalContratos, color: '#2dd4a0' },
              { label: 'Usuários do sistema', value: metricas.totalUsuarios, color: '#f97316' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #1f2937' }}>
                <span style={{ fontSize: '13px', color: '#9ca3af' }}>{item.label}</span>
                <span style={{ fontSize: '16px', fontWeight: '700', color: item.color, fontFamily: 'Syne, sans-serif' }}>{item.value}</span>
              </div>
            ))}
          </div>

          <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '14px', padding: '20px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: '600', color: '#fff', fontFamily: 'Syne, sans-serif', marginBottom: '16px' }}>Saúde da conta</h3>
            {[
              { label: 'Agente IA configurado', ok: metricas.totalConversas > 0, info: 'Baseado em conversas ativas' },
              { label: 'Leads importados', ok: metricas.totalLeads > 0, info: `${metricas.totalLeads} leads` },
              { label: 'Campanhas criadas', ok: metricas.totalCampanhas > 0, info: `${metricas.totalCampanhas} campanhas` },
              { label: 'Receita registrada', ok: metricas.receitaTotal > 0, info: fmt(metricas.receitaTotal) },
              { label: 'Equipe configurada', ok: metricas.totalUsuarios > 0, info: `${metricas.totalUsuarios} usuário(s)` },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid #1f2937' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.ok ? '#22c55e' : '#374151', flexShrink: 0 }} />
                  <span style={{ fontSize: '13px', color: '#9ca3af' }}>{item.label}</span>
                </div>
                <span style={{ fontSize: '11px', color: item.ok ? '#6b7280' : '#374151' }}>{item.info}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
