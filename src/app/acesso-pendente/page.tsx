import Link from 'next/link'
import { AlertCircle } from 'lucide-react'

export default function AcessoPendentePage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '620px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '18px', padding: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '12px',
            background: 'rgba(79,122,255,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <AlertCircle size={20} color="var(--accent)" />
          </div>
          <div>
            <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
              Acesso incompleto
            </p>
            <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '24px', color: 'var(--text-primary)', margin: '4px 0 0' }}>
              Seu login foi aceito, mas seu acesso ao escritório ainda não está pronto
            </h1>
          </div>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '15px', lineHeight: 1.7, marginBottom: '14px' }}>
          Isso normalmente acontece quando o usuário autenticou no Supabase, mas ainda está sem vínculo ativo em <strong>usuarios</strong>, sem
          <strong> tenant</strong> definido, ou aguardando liberação do escritório.
        </p>

        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '16px 18px',
          marginBottom: '22px',
        }}>
          <p style={{ margin: '0 0 8px', color: 'var(--text-primary)', fontSize: '14px', fontWeight: 600 }}>
            O que verificar agora
          </p>
          <p style={{ margin: '0 0 6px', color: 'var(--text-secondary)', fontSize: '14px' }}>
            1. Se este e-mail foi realmente convidado para o escritório correto.
          </p>
          <p style={{ margin: '0 0 6px', color: 'var(--text-secondary)', fontSize: '14px' }}>
            2. Se o usuário está ativo e com <strong>tenant_id</strong> preenchido.
          </p>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>
            3. Se o acesso não está bloqueado por contenção temporária do ambiente.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Link
            href="/login"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '11px 16px',
              borderRadius: '10px',
              background: 'var(--accent)',
              color: '#fff',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '14px',
            }}
          >
            Voltar ao login
          </Link>
          <a
            href="mailto:suporte@prevlegal.com.br"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '11px 16px',
              borderRadius: '10px',
              background: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '14px',
              border: '1px solid var(--border)',
            }}
          >
            Avisar suporte
          </a>
        </div>
      </div>
    </div>
  )
}
