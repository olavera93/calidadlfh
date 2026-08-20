import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Search, X, Check } from 'lucide-react'

/**
 * Combobox con búsqueda/autocompletado.
 *
 * Props:
 * - options: Array<{ id, label, sublabel? }>
 * - value: id seleccionado (string/number) o '' si no hay selección
 * - onChange: (id) => void
 * - placeholder: texto cuando no hay selección
 * - clearable: si true, muestra la X para limpiar la selección
 * - disabled
 * - className: clases extra para el contenedor
 */
export default function ProveedorSearchSelect({
  options = [],
  value,
  onChange,
  placeholder = 'Buscar...',
  clearable = false,
  disabled = false,
  className = ''
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlighted, setHighlighted] = useState(0)
  const containerRef = useRef(null)
  const inputRef = useRef(null)

  const selected = useMemo(
    () => options.find((o) => String(o.id) === String(value)) || null,
    [options, value]
  )

  const filtered = useMemo(() => {
    if (!query.trim()) return options
    const q = query.trim().toLowerCase()
    return options.filter(
      (o) =>
        o.label?.toLowerCase().includes(q) ||
        o.sublabel?.toLowerCase().includes(q)
    )
  }, [options, query])

  // Cierra al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    setHighlighted(0)
  }, [query, open])

  const openDropdown = () => {
    if (disabled) return
    setOpen(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const handleSelect = (option) => {
    onChange(option.id)
    setOpen(false)
    setQuery('')
  }

  const handleClear = (e) => {
    e.stopPropagation()
    onChange('')
    setQuery('')
  }

  const handleKeyDown = (e) => {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered[highlighted]) handleSelect(filtered[highlighted])
    } else if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
    }
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Control visible (cerrado) */}
      {!open && (
        <button
          type="button"
          onClick={openDropdown}
          disabled={disabled}
          className="input-base w-full flex items-center justify-between gap-2 text-left disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <span className={`truncate ${selected ? 'text-surface-700' : 'text-surface-400'}`}>
            {selected ? selected.label : placeholder}
          </span>
          <span className="flex items-center gap-1 shrink-0">
            {clearable && selected && (
              <X
                size={14}
                className="text-surface-400 hover:text-surface-600"
                onClick={handleClear}
              />
            )}
            <ChevronDown size={15} className="text-surface-400" />
          </span>
        </button>
      )}

      {/* Input de búsqueda (abierto) */}
      {open && (
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={selected ? selected.label : placeholder}
            className="input-base w-full pl-8 pr-8"
          />
          <X
            size={14}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 cursor-pointer"
            onClick={() => {
              setOpen(false)
              setQuery('')
            }}
          />
        </div>
      )}

      {/* Lista desplegable */}
      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto scrollbar-thin bg-white border border-surface-200 rounded-xl shadow-modal py-1">
          {clearable && (
            <button
              type="button"
              onClick={() => handleSelect({ id: '', label: placeholder })}
              className="w-full text-left px-3 py-2 text-sm text-surface-500 hover:bg-surface-50 transition-colors"
            >
              {placeholder}
            </button>
          )}

          {filtered.length === 0 ? (
            <div className="px-3 py-3 text-xs text-surface-400 text-center">
              Sin resultados para "{query}"
            </div>
          ) : (
            filtered.map((option, idx) => (
              <button
                key={option.id}
                type="button"
                onClick={() => handleSelect(option)}
                onMouseEnter={() => setHighlighted(idx)}
                className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2 transition-colors ${
                  idx === highlighted ? 'bg-brand-50 text-brand-700' : 'text-surface-700 hover:bg-surface-50'
                }`}
              >
                <span className="truncate">
                  <span className="block truncate">{option.label}</span>
                  {option.sublabel && (
                    <span className="block text-xs text-surface-400 truncate">{option.sublabel}</span>
                  )}
                </span>
                {String(option.id) === String(value) && (
                  <Check size={14} className="text-brand-500 shrink-0" />
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}