'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus } from 'lucide-react'
import NovoLeadModal from './novo-lead-modal'

export default function LeadsNovoLeadButton() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: '7px',
          background: 'var(--accent)', border: 'none', borderRadius: '10px',
          padding: '9px 18px', color: '#fff', fontSize: '13px',
          fontWeight: '600', cursor: 'pointer', fontFamily: 'DM Sans',
        }}>
        <UserPlus size={14} /> Novo lead
      </button>

      {open && (
        <NovoLeadModal
          onClose={() => setOpen(false)}
          onCriado={() => {
            setOpen(false)
            router.refresh()
          }}
        />
      )}
    </>
  )
}
