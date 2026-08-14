import React, { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * Paginador reutilizable con selector de "registros por página" editable.
 *
 * Props:
 * - currentPage: número de página actual (1-indexed)
 * - totalItems: total de registros (ya filtrados)
 * - itemsPerPage: cantidad de registros por página
 * - onPageChange: (page: number) => void
 * - onItemsPerPageChange: (n: number) => void
 * - maxPerPage: límite superior opcional (default 500)
 */
export default function Paginator({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  maxPerPage,
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage))

  // Input de texto libre, separado del valor numérico real,
  // para permitir borrar por completo sin que salte a "1" y genere
  // concatenaciones raras (ej: borrar y escribir 16 -> queda 116).
  const [inputValue, setInputValue] = useState(String(itemsPerPage))

  // Si itemsPerPage cambia desde afuera, sincroniza el input
  useEffect(() => {
    setInputValue(String(itemsPerPage))
  }, [itemsPerPage])

  const handleInputChange = (e) => {
    const value = e.target.value
    if (value === '' || /^\d+$/.test(value)) {
      setInputValue(value)
    }
  }

  const commitValue = () => {
    let n = parseInt(inputValue, 10)
    if (isNaN(n) || n < 1) n = 1
    if (n > maxPerPage) n = maxPerPage
    setInputValue(String(n))
    onItemsPerPageChange(n)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.target.blur() // dispara onBlur -> commitValue
    }
  }

  const goToPage = (page) => {
    onPageChange(Math.min(Math.max(1, page), totalPages))
  }

  if (totalItems === 0) return null

  return (
    <div className="px-5 py-3 border-t border-surface-100 flex items-center justify-between text-xs text-surface-500 flex-wrap gap-3">
      <div className="flex items-center gap-2">
        <span>Mostrar</span>
        <input
          type="text"
          inputMode="numeric"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={commitValue}
          onKeyDown={handleKeyDown}
          className="input-base w-14 text-center py-1"
        />
        <span>por página</span>
      </div>

      <span>
        Página {currentPage} de {totalPages} · {totalItems} registros
      </span>

      <div className="flex items-center gap-1">
        <button
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-1.5 rounded-lg border border-surface-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-100 transition-colors"
        >
          <ChevronLeft size={14} />
        </button>
        <button
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-1.5 rounded-lg border border-surface-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-100 transition-colors"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}