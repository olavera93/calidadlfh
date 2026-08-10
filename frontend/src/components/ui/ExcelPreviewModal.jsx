import React, { useMemo } from 'react'
import { X, Upload, Download, FileSpreadsheet, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'

export default function ExcelPreviewModal({
  isOpen,
  onClose,
  title,
  columns,
  data = [],
  mode = 'export', // 'import' | 'export'
  existingItems = [], // Lista actual para comparar en importación
  matchKey = 'codigo', // Clave primaria/única para buscar duplicados (ej: 'codigo' o 'identificacion')
  onConfirmImport,
  onConfirmExport,
  loading = false
}) {
  if (!isOpen) return null

/* ── Helper para extraer y normalizar valores comparables ── */
  const getNormalizedValue = (item, key) => {
    let val = ''

    // Manejo de relaciones anidadas (ej: proveedor.identificacion)
    if (key === 'proveedor_identificacion') {
      val = item.proveedor?.identificacion || item.proveedor_identificacion || ''
    } else if (key === 'proveedor_nombre') {
      val = item.proveedor?.nombre || item.proveedor_nombre || ''
    } else {
      val = item[key] ?? ''
    }

    return String(val).trim().toLowerCase()
  }

  /* ── Analizar Estado de Importación (Nuevo / Modificado / Repetido) ── */
  const processedData = useMemo(() => {
    if (mode !== 'import') return data

    const existingMap = new Map(
      existingItems.map((item) => [String(item[matchKey] || '').trim().toLowerCase(), item])
    )

    return data.map((row) => {
      const rowKey = String(row[matchKey] || '').trim().toLowerCase()
      const existing = existingMap.get(rowKey)

      if (!existing) {
        return { ...row, _status: 'nuevo' }
      }

      // Comparar solo las columnas visibles definidas
      const keysToCompare = columns.map((col) => col.key).filter((k) => k !== matchKey)

      const isModified = keysToCompare.some((key) => {
        const valNew = getNormalizedValue(row, key)
        const valOld = getNormalizedValue(existing, key)
        return valNew !== valOld
      })

      return {
        ...row,
        _status: isModified ? 'modificado' : 'repetido'
      }
    })
  }, [data, mode, existingItems, matchKey, columns])

  // Contadores para el resumen
  const stats = useMemo(() => {
    if (mode !== 'import') return null
    const nuevos = processedData.filter((d) => d._status === 'nuevo').length
    const modificados = processedData.filter((d) => d._status === 'modificado').length
    const repetidos = processedData.filter((d) => d._status === 'repetido').length
    return { nuevos, modificados, repetidos }
  }, [processedData, mode])

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-5xl w-full flex flex-col max-h-[90vh] shadow-2xl border border-surface-100 overflow-hidden">
        
        {/* Cabecera */}
        <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between bg-surface-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-brand-50 text-brand-600">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-surface-800">{title}</h3>
              <p className="text-xs text-surface-500">
                {mode === 'import'
                  ? `Se procesarán ${processedData.length} registros del archivo`
                  : `Vista previa de ${data.length} registros listos para exportar`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-surface-400 hover:text-surface-600 hover:bg-surface-100 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Resumen de Estados (solo para Importación) */}
        {mode === 'import' && stats && (
          <div className="px-6 py-2.5 bg-surface-50 border-b border-surface-100 flex items-center gap-4 text-xs font-medium">
            <span className="text-surface-500">Resumen:</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle size={13} /> {stats.nuevos} Nuevos
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              <RefreshCw size={13} /> {stats.modificados} Modificados
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-100 text-surface-600 border border-surface-200">
              <AlertCircle size={13} /> {stats.repetidos} Repetidos (Sin cambios)
            </span>
          </div>
        )}

        {/* Tabla / Preview Estilo Excel */}
        <div className="flex-1 overflow-auto p-4 bg-surface-50/30 scrollbar-thin">
          <div className="border border-surface-200 rounded-xl bg-white overflow-hidden shadow-sm">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-surface-100/70 border-b border-surface-200 text-surface-600 font-semibold uppercase tracking-wider">
                  <th className="py-2.5 px-3 border-r border-surface-200 text-center w-10">#</th>
                  {mode === 'import' && (
                    <th className="py-2.5 px-3 border-r border-surface-200 text-center w-28">Estado</th>
                  )}
                  {columns.map((col) => (
                    <th key={col.key} className="py-2.5 px-3 border-r border-surface-200 last:border-r-0">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {processedData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-brand-50/20 transition-colors">
                    <td className="py-2 px-3 border-r border-surface-100 text-center text-surface-400 font-mono">
                      {idx + 1}
                    </td>

                    {mode === 'import' && (
                      <td className="py-2 px-3 border-r border-surface-100 text-center">
                        {row._status === 'nuevo' && (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Nuevo
                          </span>
                        )}
                        {row._status === 'modificado' && (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                            Modificado
                          </span>
                        )}
                        {row._status === 'repetido' && (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-surface-100 text-surface-600">
                            Repetido
                          </span>
                        )}
                      </td>
                    )}

                    {columns.map((col) => (
                      <td key={col.key} className="py-2 px-3 border-r border-surface-100 last:border-r-0 text-surface-700">
                        {row[col.key] ?? '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Acciones de pie de página */}
        <div className="px-6 py-3.5 border-t border-surface-100 flex items-center justify-between bg-surface-50/50">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-surface-600 hover:bg-surface-200 transition-colors"
          >
            Cancelar
          </button>

          {mode === 'import' ? (
            <button
              onClick={() => onConfirmImport(processedData)}
              disabled={loading || processedData.length === 0}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-brand-500 hover:bg-brand-600 text-white transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <Upload size={15} />
              {loading ? 'Importando...' : 'Confirmar e Importar'}
            </button>
          ) : (
            <button
              onClick={onConfirmExport}
              disabled={data.length === 0}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-brand-500 hover:bg-brand-600 text-white transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <Download size={15} /> Descargar Excel
            </button>
          )}
        </div>
      </div>
    </div>
  )
}