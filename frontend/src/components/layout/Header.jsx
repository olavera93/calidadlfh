import React from 'react'
import { useLocation } from 'react-router-dom'
import { ChevronRight, Search } from 'lucide-react'

const ROUTE_MAP = {
  '/':                  { section: null,       page: 'Inicio' },
  '/temperaturas':      { section: 'Monitoreo', page: 'Temperaturas' },
  '/odoo/recepciones':  { section: 'Odoo',      page: 'Recepciones' },
  '/odoo/vencimientos': { section: 'Odoo',      page: 'Vencimientos' },
  '/configuracion':     { section: 'Sistema',   page: 'Configuración' },
}

function useFormattedDate() {
  return new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())
}

export default function Header({ onOpenCommand }) {
  const { pathname } = useLocation()
  const route = ROUTE_MAP[pathname] ?? { section: null, page: '' }
  const date = useFormattedDate()

  return (
    <header className="h-14 bg-[#0b1329] border-b border-slate-800/60 sticky top-0 z-10 flex items-center px-6 gap-4 shrink-0">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm min-w-0">
        {route.section && (
          <>
            <span className="text-slate-400 truncate">{route.section}</span>
            <ChevronRight size={13} className="text-slate-600 shrink-0" />
          </>
        )}
        <span className="font-semibold text-white truncate">{route.page}</span>
      </nav>

      <div className="flex-1" />

      {/* Fecha */}
      <time className="hidden md:block text-sm text-slate-400 capitalize tabular">
        {date}
      </time>

      {/* Trigger Command Palette */}
      <button
        onClick={onOpenCommand}
        className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#131c35] border border-slate-700/60 text-xs text-slate-300 hover:border-cyan-500/50 hover:text-white transition-all shadow-sm"
      >
        <Search size={13} className="text-slate-400" />
        <span>Buscar</span>
        <span className="flex items-center gap-0.5 ml-1">
          <kbd className="px-1.5 py-0.5 rounded bg-[#0b1329] border border-slate-700 font-mono text-[10px] text-slate-300 leading-none">⌘</kbd>
          <kbd className="px-1.5 py-0.5 rounded bg-[#0b1329] border border-slate-700 font-mono text-[10px] text-slate-300 leading-none">K</kbd>
        </span>
      </button>
    </header>
  )
}