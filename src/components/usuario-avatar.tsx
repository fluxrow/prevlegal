'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface UsuarioInfo {
  nome: string
  role: string
  foto_url?: string
}

const ROLE_COR: Record<string, string> = {
  admin: '#f5c842',
  operador: '#4f7aff',
  visualizador: '#2dd4a0',
}

export default function UsuarioAvatar() {
  const [usuario, setUsuario] = useState<UsuarioInfo | null>(null)

  useEffect(() => {
    fetch('/api/perfil')
      .then(r => r.json())
      .then(d => {
        if (d.usuario) {
          setUsuario({
            nome: d.perfil?.nome || d.usuario.nome || 'Usuário',
            role: d.usuario.role,
            foto_url: d.perfil?.foto_url,
          })
        }
      })
      .catch(() => {})
  }, [])

  if (!usuario) return null

  const inicial = usuario.nome.charAt(0).toUpperCase()
  const cor = ROLE_COR[usuario.role] || '#4f7aff'

  return (
    <Link
      href="/perfil"
      style={{
        display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none',
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: '9px', padding: '5px 10px 5px 5px', cursor: 'pointer',
      }}
    >
      <div style={{
        width: '26px', height: '26px', borderRadius: '50%',
        background: usuario.foto_url ? 'transparent' : `${cor}20`,
        border: `1px solid ${cor}40`, overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {usuario.foto_url
          ? <img src={usuario.foto_url} alt={usuario.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontSize: '11px', fontWeight: '700', color: cor, fontFamily: 'Syne, sans-serif' }}>{inicial}</span>}
      </div>
      <div>
        <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', margin: 0, whiteSpace: 'nowrap', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {usuario.nome}
        </p>
        <p style={{ fontSize: '9px', color: cor, margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '700' }}>
          {usuario.role}
        </p>
      </div>
    </Link>
  )
}
