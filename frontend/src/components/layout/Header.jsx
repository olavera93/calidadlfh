import React from 'react'
import { useLocation } from 'react-router-dom'
import { ChevronRight, Search } from 'lucide-react'

const ROUTE_MAP = {
  '/':                   { section: null,        page: 'Inicio' },
  '/temperaturas':       { section: 'Monitoreo', page: 'Temperaturas' },
  '/odoo/recepciones':   { section: 'Odoo',      page: 'Recepciones' },
  '/odoo/vencimientos':  { section: 'Odoo',      page: 'Vencimientos' },
  '/odoo/configuracion': { section: 'Odoo',      page: 'Configuración' },
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
  const route = ROUTE_MAP[pathname] ?? { section: null, page: 'Inicio' }
  const date = useFormattedDate()

  return (
    <header className="h-14 bg-white/80 backdrop-blur-sm border-b border-surface-200 sticky top-0 z-10 flex items-center px-6 gap-4 shrink-0">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm min-w-0">
        {route.section && (
          <>
            <span className="text-surface-400 truncate">{route.section}</span>
            <ChevronRight size={13} className="text-surface-300 shrink-0" />
          </>
        )}
        <span className="font-semibold text-surface-800 truncate">{route.page}</span>
      </nav>

      <div className="flex-1" />

      {/* Fecha */}
      <time className="hidden md:block text-sm text-surface-400 capitalize tabular">
        {date}
      </time>

      {/* Trigger Command Palette */}
      <button
        onClick={onOpenCommand}
        className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-surface-200 text-xs text-surface-400 hover:border-surface-300 hover:text-surface-600 transition-colors"
      >
        <Search size={12} />
        <span>Buscar</span>
        <span className="flex items-center gap-0.5 ml-0.5">
          <kbd className="px-1 py-0.5 rounded bg-surface-100 font-mono text-[10px] leading-none">⌘</kbd>
          <kbd className="px-1 py-0.5 rounded bg-surface-100 font-mono text-[10px] leading-none">K</kbd>
        </span>
      </button>
    </header>
  )
}
