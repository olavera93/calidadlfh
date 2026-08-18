import React, { useState, useEffect, useRef } from 'react'
import { Search, ChevronDown, Check, X } from 'lucide-react'

export function SearchableSelect({ options, value, onChange, placeholder, required }) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const containerRef = useRef(null)

  // Obtener el objeto seleccionado actualmente
  const selectedOption = options.find((opt) => String(opt.id) === String(value))

  // Cerrar menú al hacer clic fuera del componente
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filtrar opciones en base a la búsqueda
  const filteredOptions = options.filter((opt) => {
    const term = searchTerm.toLowerCase()
    return (
      opt.label.toLowerCase().includes(term) ||
      (opt.subtext && opt.subtext.toLowerCase().includes(term))
    )
  })

  return (
    <div ref={containerRef} className="relative mt-1">
      {/* Campo principal con visualización del ítem seleccionado */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="input-base w-full flex items-center justify-between cursor-pointer select-none bg-white py-2 px-3 border rounded-xl"
      >
        <span className={selectedOption ? 'text-surface-800 font-medium' : 'text-surface-400'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <div className="flex items-center gap-1">
          {selectedOption && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onChange('')
                setSearchTerm('')
              }}
              className="p-1 text-surface-400 hover:text-surface-600 rounded-full"
            >
              <X size={14} />
            </button>
          )}
          <ChevronDown size={16} className="text-surface-400" />
        </div>
      </div>

      {/* Menú desplegable con buscador integrador */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-surface-200 rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-surface-100 flex items-center gap-2 bg-surface-50">
            <Search size={14} className="text-surface-400 shrink-0" />
            <input
              type="text"
              autoFocus
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs bg-transparent border-none outline-none text-surface-800"
            />
          </div>

          <ul className="max-h-52 overflow-y-auto divide-y divide-surface-50 text-xs">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.id) === String(value)
                return (
                  <li
                    key={opt.id}
                    onClick={() => {
                      onChange(opt.id)
                      setIsOpen(false)
                      setSearchTerm('')
                    }}
                    className={`p-2.5 flex items-center justify-between cursor-pointer hover:bg-brand-50 hover:text-brand-700 transition-colors ${
                      isSelected ? 'bg-brand-50/60 font-semibold text-brand-600' : 'text-surface-700'
                    }`}
                  >
                    <div>
                      <div className="truncate">{opt.label}</div>
                      {opt.subtext && (
                        <div className="text-[11px] text-surface-400 font-normal">
                          {opt.subtext}
                        </div>
                      )}
                    </div>
                    {isSelected && <Check size={14} className="text-brand-500 shrink-0" />}
                  </li>
                )
              })
            ) : (
              <li className="p-3 text-center text-surface-400">Sin coincidencias</li>
            )}
          </ul>
        </div>
      )}

      {/* Input oculto para soporte de 'required' nativo de HTML */}
      <input
        type="text"
        required={required}
        value={value}
        onChange={() => {}}
        className="opacity-0 absolute inset-0 pointer-events-none h-0 w-0"
      />
    </div>
  )
}