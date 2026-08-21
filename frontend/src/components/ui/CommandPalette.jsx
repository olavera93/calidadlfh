import React from 'react'
import { createPortal } from 'react-dom'
import { Command } from 'cmdk'
import { useNavigate } from 'react-router-dom'
import { 
  CalendarX2, 
  FileText, 
  LayoutDashboard, 
  Package, 
  Settings, 
  Thermometer, 
  Users 
} from 'lucide-react'

const NAV = [
  { id: 'dashboard',    label: 'Inicio',        keywords: 'home principal',              icon: LayoutDashboard, path: '/' },
  { id: 'temperaturas', label: 'Temperaturas',  keywords: 'monitoreo sensor nevera',     icon: Thermometer,     path: '/temperaturas' },
  { id: 'productos',    label: 'Productos',     keywords: 'inventario catalogo items',   icon: Package,         path: '/Productos' },
  { id: 'proveedores',  label: 'Proveedores',   keywords: 'suplidores compras',          icon: Users,           path: '/Proveedores' },
  { id: 'documentos',   label: 'Documentos',    keywords: 'archivos expedientes pdf',    icon: FileText,        path: '/documentos' },
  { id: 'contactos',    label: 'Contactos',     keywords: 'directorio clientes personas',icon: Users,           path: '/contactos' },
  { id: 'devoluciones', label: 'Devoluciones',  keywords: 'retornos garantias cambios',  icon: Package,         path: '/devoluciones' },
  { id: 'recepciones',  label: 'Recepciones',   keywords: 'odoo stock entrada',          icon: Package,         path: '/odoo/recepciones' },
  { id: 'vencimientos', label: 'Vencimientos',  keywords: 'odoo lotes expirar',          icon: CalendarX2,      path: '/odoo/vencimientos' },
  { id: 'config',       label: 'Configuración', keywords: 'areas sedes usuarios odoo api', icon: Settings,      path: '/configuracion' },
]

export function CommandPalette({ open, onClose }) {
  const navigate = useNavigate()

  function handleSelect(path) {
    navigate(path)
    onClose()
  }

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[18vh] px-4"
      onKeyDown={e => e.key === 'Escape' && onClose()}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-surface-950/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Palette */}
      <Command className="relative w-full max-w-lg bg-white rounded-2xl shadow-modal border border-surface-200 animate-scale-in overflow-hidden">
        {/* Search row */}
        <div className="flex items-center gap-3 px-4 border-b border-surface-100">
          <svg className="w-4 h-4 text-surface-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z" />
          </svg>
          <Command.Input
            placeholder="Buscar páginas o acciones…"
            autoFocus
            className="flex-1 h-12 text-sm bg-transparent outline-none text-surface-900 placeholder:text-surface-400"
          />
        </div>

        {/* Results */}
        <Command.List className="max-h-64 overflow-y-auto py-2 scrollbar-thin">
          <Command.Empty className="py-10 text-center text-sm text-surface-400">
            Sin resultados
          </Command.Empty>

          <Command.Group heading="Navegación">
            {NAV.map(({ id, label, keywords, icon: Icon, path }) => (
              <Command.Item
                key={id}
                value={`${label} ${keywords}`}
                onSelect={() => handleSelect(path)}
                className="cmd-item flex items-center gap-3 mx-2 px-3 py-2.5 rounded-xl text-sm text-surface-700 cursor-pointer transition-colors outline-none"
              >
                <span className="cmd-icon w-7 h-7 rounded-lg bg-surface-100 flex items-center justify-center shrink-0 transition-colors">
                  <Icon size={14} className="text-surface-500 transition-colors" />
                </span>
                {label}
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>

        {/* Footer */}
        <div className="border-t border-surface-100 px-4 py-2.5 flex items-center gap-4">
          <Hint keys={['↑', '↓']} label="navegar" />
          <Hint keys={['↵']} label="abrir" />
          <Hint keys={['Esc']} label="cerrar" />
        </div>
      </Command>
    </div>,
    document.body
  )
}

function Hint({ keys, label }) {
  return (
    <span className="flex items-center gap-1 text-xs text-surface-400">
      {keys.map(k => (
        <kbd key={k} className="px-1.5 py-0.5 rounded bg-surface-100 text-surface-500 font-mono text-[10px] font-medium leading-none">
          {k}
        </kbd>
      ))}
      <span>{label}</span>
    </span>
  )
}