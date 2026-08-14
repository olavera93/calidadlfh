import React from 'react'
import { Download, FileSpreadsheet } from 'lucide-react'
import * as XLSX from 'xlsx'

export function ExcelExportButton({
  data,
  columns,
  filename = 'export',
  sheetName = 'Datos',
  label = 'Exportar',
  isTemplate = false,
  className = ''
}) {
  /* ── Extraer valor limpio asegurando que IDs por defecto (0, null, '0') salgan vacíos ── */
  const getValue = (item, key) => {
    if (!item) return ''

    let val = undefined

    // 1. Extraer el valor directo o anidado
    if (key.includes('proveedor') && (key.includes('identificacion') || key.includes('nit') || key.includes('id'))) {
      val = item.proveedor?.identificacion ?? item.proveedor_identificacion ?? item.proveedor_id ?? item.nit
    } else if (key.includes('proveedor')) {
      val = item.proveedor?.nombre ?? item.proveedor_nombre ?? item.proveedor
    } else if (key.includes('laboratorio')) {
      val = item.laboratorio?.nombre ?? item.laboratorio_nombre ?? item.laboratorio
    } else {
      val = item[key]
    }

    if (val === null || val === undefined) return ''

    // 2. Si el valor es 0, '0' o similares (el valor por defecto del select sin proveedor)
    const strVal = String(val).trim().toLowerCase()
    if (strVal === '0' || strVal === 'null' || strVal === 'undefined' || strVal === '—') {
      return ''
    }

    return val
  }

  const handleExport = () => {
    let exportData = []

    if (isTemplate) {
      const templateRow = {}
      columns.forEach((col) => {
        templateRow[col.label] = ''
      })
      exportData = [templateRow]
    } else {
      exportData = data.map((item) => {
        const row = {}
        columns.forEach((col) => {
          row[col.label] = getValue(item, col.key)
        })
        return row
      })
    }

    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
    XLSX.writeFile(
      workbook,
      `${filename}_${isTemplate ? 'plantilla_' : ''}${new Date().toISOString().slice(0, 10)}.xlsx`
    )
  }

  return (
    <button
      onClick={handleExport}
      className={`border border-surface-200 hover:bg-surface-100 text-surface-700 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${className}`}
    >
      {isTemplate ? <FileSpreadsheet size={16} /> : <Download size={16} />}
      {label}
    </button>
  )
}