'use client'
import { useEffect, useState, useRef } from 'react'
import { User, Building2, FileText, Camera, Save, CheckCircle, AlertCircle, Upload } from 'lucide-react'

const ESTADOS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

interface Perfil {
  advogado_nome?: string
  advogado_email?: string
  advogado_telefone?: string
  advogado_cpf?: string
  advogado_foto_url?: string
  oab_numero?: string
  oab_estado?: string
  oab_tipo?: string
  oab_situacao?: string
  escritorio_nome?: string
  escritorio_cnpj?: string
  escritorio_endereco?: string
  escritorio_cidade?: string
  escritorio_estado?: string
  escritorio_cep?: string
  escritorio_telefone?: string
  escritorio_email?: string
  escritorio_logo_url?: string
  assinatura_texto?: string
  assinatura_rodape?: string
}

type Toast = { tipo: 'ok' | 'erro'; msg: string } | null

export default function PerfilPage() {
  const [perfil, setPerfil] = useState<Perfil>({})
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [toast, setToast] = useState<Toast>(null)
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const fotoRef = useRef<HTMLInputElement>(null)
  const logoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/perfil')
      .then(r => r.json())
      .then(d => { setPerfil(d.perfil || {}); setLoading(false) })
  }, [])

  function set(field: keyof Perfil, value: string) {
    setPerfil(p => ({ ...p, [field]: value }))
  }

  function showToast(tipo: 'ok' | 'erro', msg: string) {
    setToast({ tipo, msg })
    setTimeout(() => setToast(null), 3500)
  }

  async function salvar() {
    setSalvando(true)
    const res = await fetch('/api/perfil', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(perfil),
    })
    if (res.ok) showToast('ok', 'Perfil salvo com sucesso')
    else showToast('erro', 'Erro ao salvar perfil')
    setSalvando(false)
  }

  async function uploadImagem(arquivo: File, tipo: 'foto' | 'logo') {
    if (tipo === 'foto') setUploadingFoto(true)
    else setUploadingLogo(true)
    const fd = new FormData()
    fd.append('arquivo', arquivo)
    fd.append('tipo', tipo)
    const res = await fetch('/api/perfil/upload', { method: 'POST', body: fd })
    const json = await res.json()
    if (json.url) {
      setPerfil(p => ({ ...p, [tipo === 'foto' ? 'advogado_foto_url' : 'escritorio_logo_url']: json.url }))
      showToast('ok', tipo === 'foto' ? 'Foto atualizada' : 'Logo atualizada')
    } else {
      showToast('erro', 'Erro no upload')
    }
    if (tipo === 'foto') setUploadingFoto(false)
    else setUploadingLogo(false)
  }

  const inputSt: React.CSSProperties = {
    width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
    borderRadius: '10px', padding: '10px 12px', color: 'var(--text-primary)',
    fontSize: '13px', boxSizing: 'border-box', fontFamily: 'DM Sans, sans-serif', outline: 'none',
  }
  const labelSt: React.CSSProperties = {
    fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)',
    display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.06em',
  }

  function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
    return (
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '24px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '20px' }}>
          <span style={{ color: 'var(--accent)' }}>{icon}</span>
          <h2 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif', margin: 0 }}>{title}</h2>
        </div>
        {children}
      </div>
    )
  }

  function Grid({ children }: { children: React.ReactNode }) {
    return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>{children}</div>
  }

  function Field({ label, field, type = 'text', col, placeholder }: {
    label: string; field: keyof Perfil; type?: string; col?: string; placeholder?: string
  }) {
    return (
      <div style={{ gridColumn: col }}>
        <label style={labelSt}>{label}</label>
        <input
          type={type}
          value={perfil[field] || ''}
          onChange={e => set(field, e.target.value)}
          placeholder={placeholder}
          style={inputSt}
        />
      </div>
    )
  }

  function SelectField({ label, field, options, col }: {
    label: string; field: keyof Perfil
    options: { value: string; label: string }[]; col?: string
  }) {
    return (
      <div style={{ gridColumn: col }}>
        <label style={labelSt}>{label}</label>
        <select value={perfil[field] || ''} onChange={e => set(field, e.target.value)} style={inputSt}>
          <option value="">Selecione</option>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
    )
  }

  const saveBtnStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '7px',
    background: 'var(--accent)', border: 'none', borderRadius: '10px',
    padding: '10px 20px', color: '#fff', fontSize: '13px', fontWeight: '600',
    cursor: salvando ? 'not-allowed' : 'pointer', opacity: salvando ? 0.7 : 1,
    fontFamily: 'DM Sans, sans-serif',
  }

  if (loading) {
    return (
      <div style={{ padding: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontFamily: 'DM Sans, sans-serif' }}>Carregando perfil...</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '32px', maxWidth: '900px' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '24px', right: '24px', zIndex: 9999,
          display: 'flex', alignItems: 'center', gap: '10px',
          background: toast.tipo === 'ok' ? '#0d2318' : '#2a0e0e',
          border: `1px solid ${toast.tipo === 'ok' ? '#22c55e' : '#ff5757'}`,
          borderRadius: '10px', padding: '12px 18px', boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        }}>
          {toast.tipo === 'ok'
            ? <CheckCircle size={15} color="#22c55e" />
            : <AlertCircle size={15} color="#ff5757" />}
          <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif' }}>{toast.msg}</span>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.5px', margin: '0 0 4px' }}>
            Perfil do Advogado
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0, fontFamily: 'DM Sans, sans-serif' }}>
            Dados usados em documentos, petições e assinaturas geradas pela IA
          </p>
        </div>
        <button onClick={salvar} disabled={salvando} style={saveBtnStyle}>
          <Save size={14} /> {salvando ? 'Salvando...' : 'Salvar perfil'}
        </button>
      </div>

      {/* Dados Pessoais + Foto */}
      <Section icon={<User size={16} />} title="Dados Pessoais">
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--bg)', border: '2px solid var(--border)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {perfil.advogado_foto_url
                ? <img src={perfil.advogado_foto_url} alt="Foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <User size={28} color="var(--text-muted)" />}
            </div>
            <button
              onClick={() => fotoRef.current?.click()}
              disabled={uploadingFoto}
              style={{ position: 'absolute', bottom: 0, right: 0, width: '26px', height: '26px', borderRadius: '50%', background: 'var(--accent)', border: '2px solid var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              {uploadingFoto
                ? <div style={{ width: '10px', height: '10px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                : <Camera size={11} color="#fff" />}
            </button>
            <input ref={fotoRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => e.target.files?.[0] && uploadImagem(e.target.files[0], 'foto')} />
          </div>
          <div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 4px', fontFamily: 'DM Sans, sans-serif' }}>Foto do advogado</p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, fontFamily: 'DM Sans, sans-serif' }}>Aparece em documentos e comunicações. JPG, PNG ou WEBP.</p>
          </div>
        </div>
        <Grid>
          <Field label="Nome completo *" field="advogado_nome" col="1 / -1" placeholder="Dr. João Silva" />
          <Field label="Email profissional" field="advogado_email" type="email" placeholder="joao@escritorio.com.br" />
          <Field label="Telefone" field="advogado_telefone" placeholder="(41) 99999-9999" />
          <Field label="CPF" field="advogado_cpf" placeholder="000.000.000-00" />
        </Grid>
      </Section>

      {/* Registro OAB */}
      <Section icon={<FileText size={16} />} title="Registro OAB">
        <Grid>
          <Field label="Número OAB *" field="oab_numero" placeholder="123456" />
          <SelectField
            label="Estado (Seccional)"
            field="oab_estado"
            options={ESTADOS.map(e => ({ value: e, label: e }))}
          />
          <SelectField
            label="Tipo"
            field="oab_tipo"
            options={[
              { value: 'advogado', label: 'Advogado' },
              { value: 'estagiario', label: 'Estagiário' },
              { value: 'sociedade', label: 'Sociedade' },
            ]}
          />
          <SelectField
            label="Situação"
            field="oab_situacao"
            options={[
              { value: 'ativo', label: 'Ativo' },
              { value: 'suspenso', label: 'Suspenso' },
              { value: 'licenciado', label: 'Licenciado' },
              { value: 'cancelado', label: 'Cancelado' },
            ]}
          />
        </Grid>

        {(perfil.advogado_nome || perfil.oab_numero) && (
          <div style={{ marginTop: '16px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '38px', height: '38px', background: 'var(--accent)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <FileText size={16} color="#fff" />
            </div>
            <div>
              <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 2px', fontFamily: 'DM Sans, sans-serif' }}>
                {perfil.advogado_nome || 'Advogado'}
              </p>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, fontFamily: 'DM Sans, sans-serif' }}>
                OAB/{perfil.oab_estado || '??'} {perfil.oab_numero || '000000'} — {perfil.oab_situacao === 'ativo' ? '✅ Ativo' : perfil.oab_situacao || 'Situação'}
              </p>
            </div>
          </div>
        )}
      </Section>

      {/* Escritório */}
      <Section icon={<Building2 size={16} />} title="Escritório">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
          <div style={{ width: '64px', height: '64px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {perfil.escritorio_logo_url
              ? <img src={perfil.escritorio_logo_url} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '6px' }} />
              : <Building2 size={22} color="var(--text-muted)" />}
          </div>
          <div>
            <button
              onClick={() => logoRef.current?.click()}
              disabled={uploadingLogo}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '8px', padding: '7px 14px', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
            >
              <Upload size={12} /> {uploadingLogo ? 'Enviando...' : 'Enviar logo'}
            </button>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '5px 0 0', fontFamily: 'DM Sans, sans-serif' }}>PNG ou SVG com fundo transparente recomendado</p>
            <input ref={logoRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => e.target.files?.[0] && uploadImagem(e.target.files[0], 'logo')} />
          </div>
        </div>
        <Grid>
          <Field label="Nome do escritório" field="escritorio_nome" col="1 / -1" placeholder="Advocacia Silva & Associados" />
          <Field label="CNPJ" field="escritorio_cnpj" placeholder="00.000.000/0001-00" />
          <Field label="Telefone" field="escritorio_telefone" placeholder="(41) 3333-3333" />
          <Field label="Email" field="escritorio_email" type="email" placeholder="contato@escritorio.com.br" col="1 / -1" />
          <Field label="Endereço" field="escritorio_endereco" col="1 / -1" placeholder="Rua das Flores, 123 — Sala 45" />
          <Field label="Cidade" field="escritorio_cidade" placeholder="Curitiba" />
          <SelectField
            label="Estado"
            field="escritorio_estado"
            options={ESTADOS.map(e => ({ value: e, label: e }))}
          />
          <Field label="CEP" field="escritorio_cep" placeholder="80000-000" />
        </Grid>
      </Section>

      {/* Assinatura */}
      <Section icon={<FileText size={16} />} title="Assinatura em Documentos">
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px', marginTop: 0, fontFamily: 'DM Sans, sans-serif' }}>
          Texto usado no rodapé de petições, procurações e documentos gerados pela IA.
        </p>
        <div style={{ marginBottom: '14px' }}>
          <label style={labelSt}>Linha de assinatura</label>
          <input
            value={perfil.assinatura_texto || ''}
            onChange={e => set('assinatura_texto', e.target.value)}
            placeholder={`Dr. ${perfil.advogado_nome || 'Nome'} — OAB/${perfil.oab_estado || 'XX'} ${perfil.oab_numero || '000000'}`}
            style={inputSt}
          />
        </div>
        <div>
          <label style={labelSt}>Rodapé do escritório</label>
          <textarea
            value={perfil.assinatura_rodape || ''}
            onChange={e => set('assinatura_rodape', e.target.value)}
            rows={3}
            placeholder={`${perfil.escritorio_nome || 'Nome do Escritório'}\n${perfil.escritorio_endereco || 'Endereço'} — ${perfil.escritorio_cidade || 'Cidade'}/${perfil.escritorio_estado || 'UF'}`}
            style={{ ...inputSt, resize: 'vertical' }}
          />
        </div>

        {(perfil.assinatura_texto || perfil.assinatura_rodape) && (
          <div style={{ marginTop: '16px', background: 'var(--bg)', border: '1px solid var(--border)', borderLeft: '3px solid var(--accent)', borderRadius: '10px', padding: '16px' }}>
            <p style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px', fontFamily: 'DM Sans, sans-serif' }}>
              Preview da assinatura
            </p>
            {perfil.assinatura_texto && (
              <p style={{ fontSize: '13px', color: 'var(--text-primary)', margin: '0 0 6px', fontWeight: '500', fontFamily: 'DM Sans, sans-serif' }}>
                {perfil.assinatura_texto}
              </p>
            )}
            {perfil.assinatura_rodape && (
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, whiteSpace: 'pre-line', fontFamily: 'DM Sans, sans-serif' }}>
                {perfil.assinatura_rodape}
              </p>
            )}
          </div>
        )}
      </Section>

      {/* Salvar bottom */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingBottom: '48px' }}>
        <button onClick={salvar} disabled={salvando} style={{ ...saveBtnStyle, padding: '11px 24px', fontSize: '14px' }}>
          <Save size={15} /> {salvando ? 'Salvando...' : 'Salvar perfil'}
        </button>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
