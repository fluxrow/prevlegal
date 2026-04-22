'use client'
import { useEffect, useState } from 'react'
import { UserPlus, Copy, Check, Shield, Eye, Edit3, Crown, ToggleLeft, ToggleRight, X, Mail, ChevronDown, ChevronUp } from 'lucide-react'
import { DEFAULT_PERMISSIONS_BY_ROLE, resolvePermissions, type PermissionKey, type PermissionMap, type Role } from '@/lib/permissions'

interface Usuario {
  id: string; nome: string; email: string; role: string
  ativo: boolean; convidado_em: string; ultimo_acesso: string | null
  google_calendar_email?: string | null
  google_calendar_connected_at?: string | null
  permissions?: Partial<PermissionMap> | null
}
interface Convite {
  id: string; email: string; role: string; created_at: string; expires_at: string
}

type InvitePermissionState = 'default' | 'allow' | 'deny'

const PERMISSION_INFO: Array<{ key: PermissionKey; label: string; descricao: string }> = [
  { key: 'usuarios_manage', label: 'Gestão de usuários', descricao: 'Convidar pessoas, trocar roles e editar permissões.' },
  { key: 'agentes_manage', label: 'Gestão de agentes', descricao: 'Criar, editar e semear agentes do escritório.' },
  { key: 'automacoes_manage', label: 'Gestão de automações', descricao: 'Editar gatilhos, réguas e seeds operacionais.' },
  { key: 'financeiro_manage', label: 'Acesso ao financeiro', descricao: 'Acessar contratos, parcelas e visão financeira.' },
  { key: 'listas_manage', label: 'Gestão de listas', descricao: 'Gerenciar exclusão e manutenção de listas importadas.' },
  { key: 'agendamentos_assign', label: 'Atribuir agendamentos', descricao: 'Mover agendamentos entre responsáveis.' },
  { key: 'inbox_humana_manage', label: 'Gestão da inbox humana', descricao: 'Assumir, responder, pausar e resolver conversas humanas.' },
  { key: 'configuracoes_manage', label: 'Configurações do sistema', descricao: 'Administrar áreas sensíveis de configuração do escritório.' },
]

function createInvitePermissionDraft(): Record<PermissionKey, InvitePermissionState> {
  return Object.fromEntries(
    PERMISSION_INFO.map((permission) => [permission.key, 'default']),
  ) as Record<PermissionKey, InvitePermissionState>
}

const ROLE_INFO: Record<string, { label: string; cor: string; icon: React.ReactNode; descricao: string }> = {
  admin:        { label: 'Admin',        cor: '#f5c842', icon: <Crown size={12} />,  descricao: 'Acesso total — configurações, usuários, todas as funções' },
  operador:     { label: 'Operador',     cor: '#4f7aff', icon: <Edit3 size={12} />,  descricao: 'Opera leads, conversas e campanhas — sem acesso a configurações' },
  visualizador: { label: 'Visualizador', cor: '#2dd4a0', icon: <Eye size={12} />,    descricao: 'Somente leitura — não pode criar ou editar dados' },
}

export default function GestaoUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [convites, setConvites] = useState<Convite[]>([])
  const [meuRole, setMeuRole] = useState<Role>('operador')
  const [loading, setLoading] = useState(true)
  const [showConvidar, setShowConvidar] = useState(false)
  const [emailConvite, setEmailConvite] = useState('')
  const [roleConvite, setRoleConvite] = useState('operador')
  const [showAdvancedPermissions, setShowAdvancedPermissions] = useState(false)
  const [invitePermissionDraft, setInvitePermissionDraft] = useState<Record<PermissionKey, InvitePermissionState>>(createInvitePermissionDraft)
  const [enviando, setEnviando] = useState(false)
  const [urlConvite, setUrlConvite] = useState('')
  const [copiado, setCopiado] = useState(false)
  const [erro, setErro] = useState('')
  const [usuarioPermissoes, setUsuarioPermissoes] = useState<Usuario | null>(null)
  const [permissionDraft, setPermissionDraft] = useState<PermissionMap>(DEFAULT_PERMISSIONS_BY_ROLE.operador)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    const res = await fetch('/api/usuarios')
    const json = await res.json()
    setUsuarios(json.usuarios || [])
    setConvites(json.convites || [])
    setMeuRole((json.role || 'operador') as Role)
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

  function abrirPermissoes(usuario: Usuario) {
    setUsuarioPermissoes(usuario)
    setPermissionDraft(resolvePermissions(usuario.role as Role, usuario.permissions || null))
  }

  async function salvarPermissoes() {
    if (!usuarioPermissoes) return

    const res = await fetch('/api/usuarios', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: usuarioPermissoes.id,
        role: usuarioPermissoes.role,
        ativo: usuarioPermissoes.ativo,
        permissions: permissionDraft,
      }),
    })

    if (res.ok) {
      setUsuarioPermissoes(null)
      fetchData()
    } else {
      setErro('Não foi possível salvar as permissões desse usuário')
    }
  }

  async function convidar() {
    if (!emailConvite) { setErro('Informe o email'); return }
    setEnviando(true); setErro('')
    const permissionOverrides = Object.entries(invitePermissionDraft).reduce((acc, [key, value]) => {
      if (value === 'allow') acc[key as PermissionKey] = true
      if (value === 'deny') acc[key as PermissionKey] = false
      return acc
    }, {} as Partial<PermissionMap>)

    const res = await fetch('/api/usuarios/convidar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailConvite,
        role: roleConvite,
        ...(Object.keys(permissionOverrides).length > 0 ? { permissions: permissionOverrides } : {}),
      }),
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

  const isAdmin = resolvePermissions(meuRole, null).usuarios_manage
  const invitePermissionOverridesCount = Object.values(invitePermissionDraft).filter((value) => value !== 'default').length
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
          <button onClick={() => { setShowConvidar(true); setUrlConvite(''); setEmailConvite(''); setRoleConvite('operador'); setShowAdvancedPermissions(false); setInvitePermissionDraft(createInvitePermissionDraft()); setErro('') }}
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
          const resolvedPermissions = resolvePermissions(u.role as Role, u.permissions || null)
          const permissaoCount = Object.values(resolvedPermissions).filter(Boolean).length
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
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', minWidth: '92px', textAlign: 'center' }}>
                {permissaoCount} permissões
              </span>
              {isAdmin && (
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <button
                    onClick={() => abrirPermissoes(u)}
                    title="Editar permissões"
                    style={{ height: '30px', padding: '0 10px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '600', fontFamily: 'DM Sans' }}
                  >
                    Permissões
                  </button>
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
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 'min(440px, calc(100vw - 32px))', maxHeight: '80vh', overflowY: 'auto', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px', zIndex: 1000 }}>
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
                <div style={{ marginBottom: '22px', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
                  <button
                    onClick={() => setShowAdvancedPermissions((value) => !value)}
                    style={{ width: '100%', background: 'var(--bg)', border: 'none', borderBottom: showAdvancedPermissions ? '1px solid var(--border)' : 'none', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', color: 'var(--text-primary)', fontFamily: 'DM Sans' }}
                  >
                    <div style={{ textAlign: 'left' }}>
                      <p style={{ margin: '0 0 3px', fontSize: '12px', fontWeight: '700' }}>Permissões avançadas</p>
                      <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>
                        Fechado por padrão. Use somente se quiser desviar do preset do papel.
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: invitePermissionOverridesCount > 0 ? 'var(--accent)' : 'var(--text-muted)' }}>
                      {invitePermissionOverridesCount > 0 && (
                        <span style={{ fontSize: '10px', fontWeight: '700', background: 'rgba(79,122,255,0.12)', border: '1px solid rgba(79,122,255,0.18)', borderRadius: '999px', padding: '3px 8px' }}>
                          {invitePermissionOverridesCount} ajuste{invitePermissionOverridesCount !== 1 ? 's' : ''}
                        </span>
                      )}
                      {showAdvancedPermissions ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>
                  </button>

                  {showAdvancedPermissions && (
                    <div style={{ padding: '12px 14px', background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {PERMISSION_INFO.map((permission) => {
                        const state = invitePermissionDraft[permission.key]

                        return (
                          <div key={permission.key} style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '12px', background: 'var(--bg)' }}>
                            <div style={{ marginBottom: '10px' }}>
                              <p style={{ margin: '0 0 3px', fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>{permission.label}</p>
                              <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{permission.descricao}</p>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px' }}>
                              {([
                                { value: 'default', label: 'Padrão do papel' },
                                { value: 'allow', label: 'Permitir' },
                                { value: 'deny', label: 'Bloquear' },
                              ] as const).map((option) => {
                                const active = state === option.value
                                return (
                                  <button
                                    key={option.value}
                                    onClick={() => setInvitePermissionDraft((current) => ({ ...current, [permission.key]: option.value }))}
                                    style={{
                                      minHeight: '36px',
                                      background: active ? 'rgba(79,122,255,0.12)' : 'var(--bg-card)',
                                      border: `1px solid ${active ? 'rgba(79,122,255,0.24)' : 'var(--border)'}`,
                                      borderRadius: '8px',
                                      cursor: 'pointer',
                                      color: active ? 'var(--accent)' : 'var(--text-secondary)',
                                      fontSize: '11px',
                                      fontWeight: '600',
                                      fontFamily: 'DM Sans',
                                      padding: '8px 10px',
                                    }}
                                  >
                                    {option.label}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}

                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>
                          Se tudo ficar em “Padrão do papel”, o convite segue exatamente o fluxo atual.
                        </p>
                        <button
                          onClick={() => setInvitePermissionDraft(createInvitePermissionDraft())}
                          style={{ fontSize: '11px', color: 'var(--text-secondary)', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer', fontFamily: 'DM Sans' }}
                        >
                          Restaurar padrão do papel
                        </button>
                      </div>
                    </div>
                  )}
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
                  <p style={{ fontSize: '13px', color: 'var(--text-primary)', margin: 0 }}>Link gerado! O envio ainda é manual. Copie o link abaixo e envie para <strong>{emailConvite}</strong> por WhatsApp ou email.</p>
                </div>
                <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '9px', padding: '10px 12px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{urlConvite}</p>
                  <button onClick={copiarUrl} style={{ background: 'var(--accent)', border: 'none', borderRadius: '6px', padding: '5px 10px', color: '#fff', fontSize: '11px', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'DM Sans' }}>
                    {copiado ? <><Check size={11} /> Copiado</> : <><Copy size={11} /> Copiar</>}
                  </button>
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '16px' }}>O convite expira em 7 dias. O usuário cria a própria senha ao acessar o link. Nesta fase de go-live, emails já cadastrados em outra conta do PrevLegal precisam usar outro endereço para entrar neste escritório.</p>
                <button onClick={() => { setShowConvidar(false); setUrlConvite('') }} style={{ width: '100%', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '9px', padding: '10px', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer', fontFamily: 'DM Sans' }}>Fechar</button>
              </div>
            )}
          </div>
        </>
      )}

      {usuarioPermissoes && (
        <>
          <div onClick={() => setUsuarioPermissoes(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 999 }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 'min(760px, calc(100vw - 32px))', maxHeight: '80vh', overflowY: 'auto', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px', zIndex: 1000 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif', margin: '0 0 4px' }}>
                  Permissões de {usuarioPermissoes.nome}
                </h3>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                  Base atual: {ROLE_INFO[usuarioPermissoes.role]?.label || usuarioPermissoes.role}. Você pode ajustar ponto a ponto sem trocar a role.
                </p>
              </div>
              <button onClick={() => setUsuarioPermissoes(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={16} /></button>
            </div>

            <div style={{ display: 'grid', gap: '10px', marginBottom: '18px' }}>
              {PERMISSION_INFO.map((permission) => (
                <label key={permission.key} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 14px', borderRadius: '10px', background: 'var(--bg)', border: '1px solid var(--border)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={permissionDraft[permission.key]}
                    onChange={(e) => setPermissionDraft((prev) => ({ ...prev, [permission.key]: e.target.checked }))}
                    style={{ marginTop: '2px' }}
                  />
                  <div>
                    <p style={{ margin: '0 0 3px', fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>{permission.label}</p>
                    <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{permission.descricao}</p>
                  </div>
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => setPermissionDraft(resolvePermissions(usuarioPermissoes.role as Role, null))}
                style={{ fontSize: '12px', color: 'var(--text-secondary)', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '8px', padding: '9px 14px', cursor: 'pointer', fontFamily: 'DM Sans' }}
              >
                Restaurar preset da role
              </button>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setUsuarioPermissoes(null)} style={{ fontSize: '13px', color: 'var(--text-secondary)', background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '9px 16px', cursor: 'pointer', fontFamily: 'DM Sans' }}>Cancelar</button>
                <button onClick={() => void salvarPermissoes()} style={{ fontSize: '13px', fontWeight: '600', color: '#fff', background: 'var(--accent)', border: 'none', borderRadius: '8px', padding: '9px 18px', cursor: 'pointer', fontFamily: 'DM Sans' }}>
                  Salvar permissões
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
