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
  const handleExport = () => {
    let exportData = []

    if (isTemplate) {
      // Si es plantilla, crea una fila de ejemplo vacía con los nombres de las columnas
      const templateRow = {}
      columns.forEach((col) => {
        templateRow[col.label] = ''
      })
      exportData = [templateRow]
    } else {
      // Mapear los datos según el formato de columnas recibido
      exportData = data.map((item) => {
        const row = {}
        columns.forEach((col) => {
          row[col.label] = item[col.key] || ''
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