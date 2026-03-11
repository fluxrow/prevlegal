'use client'

type Lead = {
  id: string
  nome: string
  status: string
  score: number
  ganho_potencial: number | null
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  new: { label: 'Novo', color: 'var(--accent)', bg: 'var(--accent-glow)' },
  contacted: { label: 'Contatado', color: 'var(--yellow)', bg: 'var(--yellow-bg)' },
  awaiting: { label: 'Aguardando', color: 'var(--orange)', bg: 'var(--orange-bg)' },
  scheduled: { label: 'Agendado', color: 'var(--purple)', bg: 'var(--purple-bg)' },
  converted: { label: 'Convertido', color: 'var(--green)', bg: 'var(--green-bg)' },
  lost: { label: 'Perdido', color: 'var(--red)', bg: 'var(--red-bg)' },
}

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v || 0)
}

export default function RecentLeads({ leads }: { leads: Lead[] }) {
  if (!leads || leads.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '13px' }}>
        Nenhum lead importado ainda.<br />
        <a href="/leads" style={{ color: 'var(--accent)', textDecoration: 'none', marginTop: '8px', display: 'inline-block' }}>
          Importar primeira lista →
        </a>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {leads.map(lead => {
        const sc = statusConfig[lead.status] || statusConfig.new
        return (
          <a key={lead.id} href={`/leads/${lead.id}`} style={{ textDecoration: 'none' }}>
            <div
              style={{ display: 'flex', alignItems: 'center', padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', gap: '12px', transition: 'background 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: lead.score >= 70 ? 'var(--green-bg)' : lead.score >= 40 ? 'var(--yellow-bg)' : 'var(--red-bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: '700', fontFamily: 'Syne, sans-serif',
                color: lead.score >= 70 ? 'var(--green)' : lead.score >= 40 ? 'var(--yellow)' : 'var(--red)',
                flexShrink: 0
              }}>{lead.score}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>{lead.nome}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {lead.ganho_potencial ? fmt(lead.ganho_potencial) : '—'}
                </div>
              </div>
              <div style={{ padding: '3px 10px', borderRadius: '20px', background: sc.bg, color: sc.color, fontSize: '11px', fontWeight: '500' }}>{sc.label}</div>
            </div>
          </a>
        )
      })}
    </div>
  )
}
