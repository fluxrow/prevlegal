'use client'
import { useEffect, useState } from 'react'
import { UserPlus, Copy, Check, Shield, Eye, Edit3, Crown, ToggleLeft, ToggleRight, X, Mail } from 'lucide-react'

interface Usuario {
  id: string; nome: string; email: string; role: string
  ativo: boolean; convidado_em: string; ultimo_acesso: string | null
  google_calendar_email?: string | null
  google_calendar_connected_at?: string | null
}
interface Convite {
  id: string; email: string; role: string; created_at: string; expires_at: string
}

const ROLE_INFO: Record<string, { label: string; cor: string; icon: React.ReactNode; descricao: string }> = {
  admin:        { label: 'Admin',        cor: '#f5c842', icon: <Crown size={12} />,  descricao: 'Acesso total — configurações, usuários, todas as funções' },
  operador:     { label: 'Operador',     cor: '#4f7aff', icon: <Edit3 size={12} />,  descricao: 'Opera leads, conversas e campanhas — sem acesso a configurações' },
  visualizador: { label: 'Visualizador', cor: '#2dd4a0', icon: <Eye size={12} />,    descricao: 'Somente leitura — não pode criar ou editar dados' },
}

export default function GestaoUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [convites, setConvites] = useState<Convite[]>([])
  const [meuRole, setMeuRole] = useState<string>('operador')
  const [loading, setLoading] = useState(true)
  const [showConvidar, setShowConvidar] = useState(false)
  const [emailConvite, setEmailConvite] = useState('')
  const [roleConvite, setRoleConvite] = useState('operador')
  const [enviando, setEnviando] = useState(false)
  const [urlConvite, setUrlConvite] = useState('')
  const [copiado, setCopiado] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    const res = await fetch('/api/usuarios')
    const json = await res.json()
    setUsuarios(json.usuarios || [])
    setConvites(json.convites || [])
    setMeuRole(json.role || 'operador')
    setLoading(false)
  }

  async function alterarRole(id: string, role: string, ativo: boolean) {
    await fetch('/api/usuarios', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, role, ativo }),
    })
    fetchData()
  }

  async function convidar() {
    if (!emailConvite) { setErro('Informe o email'); return }
    setEnviando(true); setErro('')
    const res = await fetch('/api/usuarios/convidar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailConvite, role: roleConvite }),
    })
    const json = await res.json()
    if (res.ok) { setUrlConvite(json.url); fetchData() }
    else setErro(json.error || 'Erro ao enviar convite')
    setEnviando(false)
  }

  async function cancelarConvite(id: string) {
    await fetch('/api/usuarios/convidar', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    fetchData()
  }

  async function copiarUrl() {
    await navigator.clipboard.writeText(urlConvite)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2500)
  }

  const isAdmin = meuRole === 'admin'
  const inp: React.CSSProperties = { width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '9px', padding: '9px 12px', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'DM Sans', outline: 'none', boxSizing: 'border-box' }
  const lbl: React.CSSProperties = { fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '5px' }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif', margin: '0 0 3px' }}>Usuários do escritório</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>{usuarios.length} usuário{usuarios.length !== 1 ? 's' : ''} cadastrado{usuarios.length !== 1 ? 's' : ''}</p>
        </div>
        {isAdmin && (
          <button onClick={() => { setShowConvidar(true); setUrlConvite(''); setEmailConvite(''); setErro('') }}
            style={{ display: 'flex', alignItems: 'center', gap: '7px', background: 'var(--accent)', border: 'none', borderRadius: '9px', padding: '9px 16px', color: '#fff', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'DM Sans' }}>
            <UserPlus size={13} /> Convidar usuário
          </button>
        )}
      </div>

      {/* Lista de usuários */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
        {loading && <p style={{ fontSize: '13px', color: 'var(--text-muted)', padding: '20px 0' }}>Carregando...</p>}
        {usuarios.map(u => {
          const ri = ROLE_INFO[u.role] || ROLE_INFO.operador
          return (
            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px 16px', opacity: u.ativo ? 1 : 0.5 }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: `${ri.cor}20`, border: `1px solid ${ri.cor}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '15px', fontWeight: '700', color: ri.cor, fontFamily: 'Syne, sans-serif' }}>
                {u.nome?.charAt(0).toUpperCase() || '?'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.nome}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>{u.email}</p>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    borderRadius: '20px',
                    padding: '2px 8px',
                    fontSize: '10px',
                    fontWeight: '600',
                    background: u.google_calendar_connected_at ? 'rgba(45,212,160,0.12)' : 'rgba(148,163,184,0.08)',
                    color: u.google_calendar_connected_at ? '#2dd4a0' : '#94a3b8',
                    border: u.google_calendar_connected_at ? '1px solid rgba(45,212,160,0.18)' : '1px solid rgba(148,163,184,0.16)',
                  }}>
                    {u.google_calendar_connected_at ? 'Agenda conectada' : 'Sem agenda própria'}
                  </span>
                </div>
              </div>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', background: `${ri.cor}15`, color: ri.cor, border: `1px solid ${ri.cor}30`, borderRadius: '20px', padding: '3px 10px', fontSize: '11px', fontWeight: '600', flexShrink: 0 }}>
                {ri.icon} {ri.label}
              </span>
              {isAdmin && (
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <button onClick={() => alterarRole(u.id, u.role, !u.ativo)} title={u.ativo ? 'Suspender' : 'Reativar'}
                    style={{ width: '30px', height: '30px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: u.ativo ? 'var(--green)' : 'var(--text-muted)' }}>
                    {u.ativo ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                  </button>
                  <select value={u.role} onChange={e => alterarRole(u.id, e.target.value, u.ativo)}
                    style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '7px', padding: '0 8px', color: 'var(--text-secondary)', fontSize: '11px', cursor: 'pointer', height: '30px', fontFamily: 'DM Sans', outline: 'none' }}>
                    <option value="admin">Admin</option>
                    <option value="operador">Operador</option>
                    <option value="visualizador">Visualizador</option>
                  </select>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Convites pendentes */}
      {convites.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Convites pendentes</p>
          {convites.map(c => {
            const ri = ROLE_INFO[c.role] || ROLE_INFO.operador
            return (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 14px', marginBottom: '6px', opacity: 0.75 }}>
                <Mail size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, flex: 1 }}>{c.email}</p>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', background: `${ri.cor}15`, color: ri.cor, border: `1px solid ${ri.cor}30`, borderRadius: '20px', padding: '2px 8px', fontSize: '10px', fontWeight: '600' }}>
                  {ri.label}
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  Expira {new Date(c.expires_at).toLocaleDateString('pt-BR')}
                </span>
                {isAdmin && (
                  <button onClick={() => cancelarConvite(c.id)}
                    style={{ width: '26px', height: '26px', background: 'transparent', border: '1px solid rgba(255,87,87,0.2)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--red)' }}>
                    <X size={11} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Legenda de roles */}
      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 16px' }}>
        <p style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Níveis de acesso</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
          {Object.entries(ROLE_INFO).map(([key, ri]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', background: `${ri.cor}15`, color: ri.cor, borderRadius: '20px', padding: '2px 8px', fontSize: '10px', fontWeight: '600', flexShrink: 0, minWidth: '80px' }}>
                {ri.icon} {ri.label}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{ri.descricao}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Modal convidar */}
      {showConvidar && (
        <>
          <div onClick={() => setShowConvidar(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 999 }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '440px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px', zIndex: 1000 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif', margin: 0 }}>Convidar usuário</h3>
              <button onClick={() => setShowConvidar(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={16} /></button>
            </div>

            {!urlConvite ? (
              <>
                <div style={{ marginBottom: '14px' }}>
                  <label style={lbl}>Email do usuário</label>
                  <input type="email" value={emailConvite} onChange={e => setEmailConvite(e.target.value)} placeholder="advogado@escritorio.com.br" style={inp} />
                </div>
                <div style={{ marginBottom: '22px' }}>
                  <label style={lbl}>Nível de acesso</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {Object.entries(ROLE_INFO).map(([key, ri]) => (
                      <button key={key} onClick={() => setRoleConvite(key)}
                        style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', background: roleConvite === key ? `${ri.cor}10` : 'var(--bg)', border: `1px solid ${roleConvite === key ? ri.cor + '40' : 'var(--border)'}`, borderRadius: '9px', padding: '10px 14px', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                        <span style={{ marginTop: '1px', color: ri.cor }}>{ri.icon}</span>
                        <div>
                          <p style={{ fontSize: '13px', fontWeight: '600', color: roleConvite === key ? ri.cor : 'var(--text-primary)', margin: '0 0 2px', fontFamily: 'DM Sans' }}>{ri.label}</p>
                          <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>{ri.descricao}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                {erro && <p style={{ color: 'var(--red)', fontSize: '12px', marginBottom: '14px' }}>{erro}</p>}
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button onClick={() => setShowConvidar(false)} style={{ fontSize: '13px', color: 'var(--text-secondary)', background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '9px 16px', cursor: 'pointer', fontFamily: 'DM Sans' }}>Cancelar</button>
                  <button onClick={convidar} disabled={enviando || !emailConvite}
                    style={{ fontSize: '13px', fontWeight: '600', color: '#fff', background: (!emailConvite || enviando) ? 'var(--bg-hover)' : 'var(--accent)', border: 'none', borderRadius: '8px', padding: '9px 18px', cursor: 'pointer', fontFamily: 'DM Sans' }}>
                    {enviando ? 'Gerando...' : 'Gerar convite'}
                  </button>
                </div>
              </>
            ) : (
              <div>
                <div style={{ background: 'rgba(45,212,160,0.06)', border: '1px solid rgba(45,212,160,0.2)', borderRadius: '10px', padding: '14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Check size={15} color="var(--green)" />
                  <p style={{ fontSize: '13px', color: 'var(--text-primary)', margin: 0 }}>Convite gerado! Envie o link abaixo para <strong>{emailConvite}</strong></p>
                </div>
                <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '9px', padding: '10px 12px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{urlConvite}</p>
                  <button onClick={copiarUrl} style={{ background: 'var(--accent)', border: 'none', borderRadius: '6px', padding: '5px 10px', color: '#fff', fontSize: '11px', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'DM Sans' }}>
                    {copiado ? <><Check size={11} /> Copiado</> : <><Copy size={11} /> Copiar</>}
                  </button>
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '16px' }}>O convite expira em 7 dias. O usuário cria a própria senha ao acessar o link.</p>
                <button onClick={() => { setShowConvidar(false); setUrlConvite('') }} style={{ width: '100%', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '9px', padding: '10px', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer', fontFamily: 'DM Sans' }}>Fechar</button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
