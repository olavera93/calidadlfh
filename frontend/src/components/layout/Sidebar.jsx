import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  Thermometer, LogOut, ChevronLeft, ChevronRight,
  PackageCheck, CalendarX2, Settings, FlaskConical, LayoutDashboard, Package, Users, FileText
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { cn } from '../../lib/utils'
import PuedeEditar from '../PuedeEditar'

function Tooltip({ label, show }) {
  if (!show) return null
  return (
    <div
      className={cn(
        'absolute left-full top-1/2 -translate-y-1/2 ml-2.5 z-50',
        'px-2.5 py-1.5 rounded-lg bg-surface-800 text-surface-50',
        'text-xs font-medium whitespace-nowrap shadow-cardMd',
        'opacity-0 group-hover:opacity-100 pointer-events-none',
        'transition-opacity duration-150',
      )}
    >
      {/* Flecha izquierda */}
      <span className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-surface-800" />
      {label}
    </div>
  )
}

function NavItem({ to, icon: Icon, label, collapsed }) {
  return (
    <div className="relative group">
      <NavLink
        to={to}
        className={({ isActive }) =>
          cn(
            'relative flex items-center gap-3 px-2.5 py-2 rounded-xl text-sm transition-all duration-150',
            collapsed ? 'justify-center' : '',
            isActive
              ? 'bg-brand-600/20 text-brand-300 font-medium'
              : 'text-surface-400 hover:bg-surface-800 hover:text-surface-100',
          )
        }
      >
        {({ isActive }) => (
          <>
            {isActive && !collapsed && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand-400 rounded-r-full" />
            )}
            <Icon size={17} className="shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </>
        )}
      </NavLink>
      <Tooltip label={label} show={collapsed} />
    </div>
  )
}

function SectionLabel({ label, collapsed }) {
  if (collapsed) return <div className="border-t border-surface-700/60 my-2" />
  return (
    <p className="px-2.5 pt-4 pb-1 text-2xs font-semibold text-surface-600 uppercase tracking-widest">
      {label}
    </p>
  )
}

export default function Sidebar() {
  const { user, logout, isAdmin } = useAuth()
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('sidebar-collapsed') === 'true'
  )

  function toggle() {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('sidebar-collapsed', String(next))
  }

  const initials = user?.nombre
    ? user.nombre.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  return (
    <aside
      className={cn(
        /* Ajuste clave para fijar el Sidebar */
        'sticky top-0 h-screen z-40',
        'shrink-0 bg-surface-900 text-surface-100 flex flex-col',
        'transition-[width] duration-250',
        collapsed ? 'w-14' : 'w-56',
      )}
    >
      {/* ── Header: logo + toggle ── */}
      <div className="flex items-center justify-between px-3 py-4 border-b border-surface-700/60 min-h-[60px]">
        <div className={cn('flex items-center gap-2 min-w-0', collapsed && 'mx-auto')}>
          <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center shrink-0">
            <FlaskConical size={14} className="text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="text-xs font-bold leading-tight truncate text-surface-50">Calidad</h1>
              <p className="text-2xs text-surface-500 truncate">Farmacéutica</p>
            </div>
          )}
        </div>

        {!collapsed && (
          <button
            onClick={toggle}
            className="ml-1 p-1 rounded-lg hover:bg-surface-800 transition-colors text-surface-500 hover:text-surface-300 shrink-0"
            title="Colapsar menú"
          >
            <ChevronLeft size={15} />
          </button>
        )}
      </div>

      {/* ── Botón expand (solo visible colapsado) ── */}
      {collapsed && (
        <button
          onClick={toggle}
          className="mx-auto mt-2 p-1 rounded-lg hover:bg-surface-800 transition-colors text-surface-500 hover:text-surface-300"
          title="Expandir menú"
        >
          <ChevronRight size={15} />
        </button>
      )}

      {/* ── Navegación ── */}
      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto scrollbar-hide">
        <NavItem to="/"                   icon={LayoutDashboard} label="Inicio"        collapsed={collapsed} />

        <SectionLabel label="Monitoreo" collapsed={collapsed} />
        <NavItem to="/temperaturas"      icon={Thermometer}   label="Temperaturas"   collapsed={collapsed} />

        <NavItem to="/Productos"         icon={Package}       label="Productos"      collapsed={collapsed} />
        <NavItem to="/Proveedores"       icon={Users}         label="Proveedores"    collapsed={collapsed} />
        <NavItem to="/documentos"        icon={FileText}      label="Documentos"     collapsed={collapsed} />
        <NavItem to="/contactos"         icon={Users}         label="Contactos"      collapsed={collapsed} />
        <NavItem to="/devoluciones"      icon={Package}       label="Devoluciones"   collapsed={collapsed} /> 
        <SectionLabel label="Odoo" collapsed={collapsed} />
        <NavItem to="/odoo/recepciones"  icon={PackageCheck}  label="Recepciones"    collapsed={collapsed} />
        <NavItem to="/odoo/vencimientos" icon={CalendarX2}    label="Vencimientos"   collapsed={collapsed} />

        <SectionLabel label="Sistema" collapsed={collapsed} />
        <PuedeEditar>
          <NavItem to="/configuracion" icon={Settings} label="Configuración" collapsed={collapsed} />
        </PuedeEditar>
      </nav>

      {/* ── Footer: usuario + logout ── */}
      <div className="px-2 py-3 border-t border-surface-700/60">
        <div className={cn('flex items-center gap-2 px-1 mb-2', collapsed && 'justify-center')}>
          <div className="w-7 h-7 rounded-full bg-brand-700 flex items-center justify-center shrink-0">
            <span className="text-2xs font-bold text-brand-100">{initials}</span>
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate text-surface-200">{user?.nombre}</p>
              <p className="text-2xs text-surface-500 capitalize">{user?.rol}</p>
            </div>
          )}
          {!collapsed && isAdmin && (
            <span className="shrink-0 bg-brand-600/30 text-brand-300 text-2xs font-semibold px-1.5 py-0.5 rounded-full">
              Admin
            </span>
          )}
        </div>

        <div className="relative group">
          <button
            onClick={logout}
            title="Cerrar sesión"
            className={cn(
              'flex items-center gap-2 text-xs text-surface-500 hover:text-surface-200',
              'transition-colors w-full rounded-lg py-1.5 px-2 hover:bg-surface-800',
              collapsed && 'justify-center',
            )}
          >
            <LogOut size={14} className="shrink-0" />
            {!collapsed && <span>Cerrar sesión</span>}
          </button>
          <Tooltip label="Cerrar sesión" show={collapsed} />
        </div>
      </div>
    </aside>
  )
}