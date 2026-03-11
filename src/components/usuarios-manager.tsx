'use client'

import { useState, useEffect } from 'react'
import { UserPlus, Shield, User, ToggleLeft, ToggleRight, Loader2, X, Eye, EyeOff } from 'lucide-react'

type Usuario = {
  id: string; nome: string; email: string
  role: 'admin' | 'operador'; ativo: boolean; created_at: string
}

export default function UsuariosManager() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({ nome: '', email: '', password: '', role: 'operador' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => { fetchUsuarios() }, [])

  async function fetchUsuarios() {
    setLoading(true)
    const res = await fetch('/api/usuarios')
    const data = await res.json()
    setUsuarios(data.usuarios || [])
    setLoading(false)
  }

  async function criarUsuario() {
    if (!form.nome || !form.email || !form.password) { setError('Preencha todos os campos'); return }
    setSaving(true); setError('')
    const res = await fetch('/api/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    const data = await res.json()
    if (data.success) {
      setUsuarios(prev => [...prev, data.usuario])
      setForm({ nome: '', email: '', password: '', role: 'operador' })
      setShowForm(false)
      setSuccess('Usuário criado com sucesso!')
      setTimeout(() => setSuccess(''), 3000)
    } else { setError(data.error || 'Erro ao criar usuário') }
    setSaving(false)
  }

  async function toggleAtivo(u: Usuario) {
    const novo = !u.ativo
    setUsuarios(prev => prev.map(x => x.id === u.id ? { ...x, ativo: novo } : x))
    const res = await fetch(`/api/usuarios/${u.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: novo })
    })
    if (!res.ok) setUsuarios(prev => prev.map(x => x.id === u.id ? { ...x, ativo: u.ativo } : x))
  }

  async function toggleRole(u: Usuario) {
    const novo = u.role === 'admin' ? 'operador' : 'admin'
    setUsuarios(prev => prev.map(x => x.id === u.id ? { ...x, role: novo } : x))
    const res = await fetch(`/api/usuarios/${u.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: novo })
    })
    if (!res.ok) setUsuarios(prev => prev.map(x => x.id === u.id ? { ...x, role: u.role } : x))
  }

  const inp = {
    width: '100%', padding: '10px 14px',
    background: 'var(--bg-surface)', border: '1px solid var(--border)',
    borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px',
    outline: 'none', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' as const
  }
  const focusIn = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) =>
    (e.target.style.borderColor = 'var(--accent)')
  const blurIn = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) =>
    (e.target.style.borderColor = 'var(--border)')

  return (
    <div style={{ maxWidth: '700px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '2px' }}>
            Usuários do escritório
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {usuarios.length} usuário{usuarios.length !== 1 ? 's' : ''} cadastrado{usuarios.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '8px 16px', background: 'var(--accent)', color: '#fff',
          borderRadius: '8px', border: 'none', fontSize: '13px', fontWeight: '600',
          cursor: 'pointer', fontFamily: 'Syne, sans-serif'
        }}>
          <UserPlus size={14} /> Novo usuário
        </button>
      </div>

      {success && (
        <div style={{ padding: '10px 14px', background: '#2dd4a015', border: '1px solid #2dd4a030', borderRadius: '8px', color: '#2dd4a0', fontSize: '13px', marginBottom: '16px' }}>
          {success}
        </div>
      )}

      {showForm && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>Criar novo usuário</h3>
            <button onClick={() => { setShowForm(false); setError('') }} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <X size={16} />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Nome completo</label>
              <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: Maria Silva" style={inp} onFocus={focusIn} onBlur={blurIn} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>E-mail</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="maria@escritorio.com.br" style={inp} onFocus={focusIn} onBlur={blurIn} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Senha inicial</label>
              <div style={{ position: 'relative' }}>
                <input type={showPassword ? 'text' : 'password'} value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Mínimo 8 caracteres"
                  style={{ ...inp, paddingRight: '36px' }} onFocus={focusIn} onBlur={blurIn} />
                <button onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Perfil de acesso</label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                style={{ ...inp, cursor: 'pointer' }} onFocus={focusIn} onBlur={blurIn}>
                <option value="operador">Operador — acesso padrão</option>
                <option value="admin">Admin — acesso total</option>
              </select>
            </div>
          </div>
          {error && (
            <div style={{ padding: '8px 12px', background: '#ff575715', border: '1px solid #ff575730', borderRadius: '6px', color: '#ff5757', fontSize: '12px', marginBottom: '12px' }}>
              {error}
            </div>
          )}
          <button onClick={criarUsuario} disabled={saving} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '9px 20px', background: 'var(--accent)', color: '#fff',
            border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600',
            cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'Syne, sans-serif', opacity: saving ? 0.7 : 1
          }}>
            {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <UserPlus size={14} />}
            {saving ? 'Criando...' : 'Criar usuário'}
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <Loader2 size={24} color="var(--accent)" style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {usuarios.map(u => (
            <div key={u.id} style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              padding: '14px 18px', background: 'var(--bg-card)',
              border: '1px solid var(--border)', borderRadius: '12px',
              opacity: u.ativo ? 1 : 0.5, transition: 'all 0.2s'
            }}>
              <div style={{
                width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0,
                background: u.role === 'admin' ? 'var(--accent-glow)' : 'var(--bg-surface)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '15px', fontWeight: '700', fontFamily: 'Syne, sans-serif',
                color: u.role === 'admin' ? 'var(--accent)' : 'var(--text-muted)',
                border: `1px solid ${u.role === 'admin' ? 'var(--accent-border, var(--border))' : 'var(--border)'}`
              }}>
                {u.nome.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '2px' }}>{u.nome}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{u.email}</div>
              </div>
              <button onClick={() => toggleRole(u)} title="Clique para alternar role" style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '4px 10px', borderRadius: '20px', cursor: 'pointer', border: 'none',
                background: u.role === 'admin' ? 'var(--accent-glow)' : 'var(--bg-surface)',
                color: u.role === 'admin' ? 'var(--accent)' : 'var(--text-muted)',
                fontSize: '11px', fontWeight: '600', fontFamily: 'Syne, sans-serif',
              }}>
                {u.role === 'admin' ? <Shield size={11} /> : <User size={11} />}
                {u.role === 'admin' ? 'Admin' : 'Operador'}
              </button>
              <button onClick={() => toggleAtivo(u)} title={u.ativo ? 'Desativar' : 'Ativar'} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: u.ativo ? 'var(--green)' : 'var(--text-muted)', padding: '4px' }}>
                {u.ativo ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
