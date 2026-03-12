'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, Megaphone, Bot, Plug, Settings,
  CreditCard, ChevronRight, LogOut, Building2, Zap, CalendarDays,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useTenant } from '@/hooks/useTenant'
import toast from 'react-hot-toast'

const NAV_ITEMS = [
  { href: '/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/leads',        label: 'Leads / Kanban',icon: Users },
  { href: '/dashboard/agendamentos', label: 'Agendamentos',  icon: CalendarDays },
  { href: '/campaigns',   label: 'Campanhas',    icon: Megaphone },
  { href: '/agent',        label: 'Agente Jéssica',icon: Bot },
  { href: '/integrations', label: 'Integrações',  icon: Plug },
  { href: '/settings',     label: 'Configurações',icon: Settings },
  { href: '/billing',      label: 'Plano & Fatura',icon: CreditCard },
]

export function Sidebar() {
  const pathname  = usePathname()
  const router    = useRouter()
  const { tenant, profile } = useTenant()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    toast.success('Sessão encerrada')
  }

  return (
    <aside className="w-60 flex-shrink-0 h-screen sticky top-0 flex flex-col
                      bg-[#0c0c18] border-r border-[#1e1e30]">

      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#1e1e30]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600
                          flex items-center justify-center flex-shrink-0">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">PrevLegal</p>
            <p className="text-xs text-slate-500">Previdenciário</p>
          </div>
        </div>
      </div>

      {/* Tenant info */}
      {tenant && (
        <div className="px-4 py-3 border-b border-[#1e1e30]">
          <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg bg-[#13131f]">
            <div className="w-7 h-7 rounded-md bg-blue-600/20 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-200 truncate">{tenant.name}</p>
              <span className="text-[10px] text-blue-400 capitalize">{tenant.plan}</span>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={active ? 'nav-item-active' : 'nav-item'}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="w-3 h-3 opacity-50" />}
            </Link>
          )
        })}
      </nav>

      {/* Footer — user */}
      <div className="px-3 py-3 border-t border-[#1e1e30]">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600
                          flex items-center justify-center flex-shrink-0 text-xs font-bold text-white">
            {profile?.full_name?.charAt(0) ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-200 truncate">{profile?.full_name}</p>
            <p className="text-[10px] text-slate-500 capitalize">{profile?.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-md text-slate-500 hover:text-red-400 hover:bg-red-400/10
                       transition-colors"
            title="Sair"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  )
}
