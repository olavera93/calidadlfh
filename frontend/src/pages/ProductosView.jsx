import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { Plus, Search, Edit2, Trash2, Package, X, Upload, Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import api from '../services/api'
import { EmptyState } from '../components/ui/EmptyState'
import Paginator from '../components/ui/Paginator'
import ExcelPreviewModal from '../components/ui/ExcelPreviewModal'
import { ExcelExportButton } from '../components/ui/ExcelActions'

export default function ProductosView() {
  // Datos
  const [productos, setProductos] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Referencia para el input de archivo oculto
  const fileInputRef = useRef(null)

  // Filtros y Búsqueda
  const [search, setSearch] = useState('')
  const [proveedorFilter, setProveedorFilter] = useState('')

  // Selección y Paginación
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Modal Producto State
  const [showModalProducto, setShowModalProducto] = useState(false)
  const [editingItem, setEditingItem] = useState(null)

  // Modal Excel State
  const [showExcelModal, setShowExcelModal] = useState(false)
  const [excelModalMode, setExcelModalMode] = useState('export') // 'import' | 'export'
  const [excelData, setExcelData] = useState([])

  // Columnas para la previsualización del mini-excel y generación de plantillas
  const excelColumns = [
    { key: 'codigo', label: 'Código' },
    { key: 'nombre', label: 'Nombre del Producto' },
    { key: 'laboratorio', label: 'Laboratorio' },
    { key: 'proveedor_identificacion', label: 'NIT / ID Proveedor' },
    { key: 'proveedor_nombre', label: 'Nombre Proveedor' }
  ]

  // Formulario State
  const [formProducto, setFormProducto] = useState({
    codigo: '',
    nombre: '',
    laboratorio: '',
    proveedor_id: ''
  })

  /* ── Cargar Datos de la API ──────────────────────────────── */
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [resProd, resProv] = await Promise.all([
        api.get('/productos'),
        api.get('/proveedores')
      ])
      setProductos(resProd.data)
      setProveedores(resProv.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al cargar la información')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  /* ── Filtrado dinámico ────────────────────────────────────── */
  const productosFiltrados = useMemo(() => {
    return productos.filter((p) => {
      const matchSearch =
        p.nombre?.toLowerCase().includes(search.toLowerCase()) ||
        p.codigo?.toLowerCase().includes(search.toLowerCase())
      const matchProv = proveedorFilter ? String(p.proveedor_id) === String(proveedorFilter) : true
      return matchSearch && matchProv
    })
  }, [productos, search, proveedorFilter])

  useEffect(() => {
    setCurrentPage(1)
  }, [search, proveedorFilter, itemsPerPage])

  /* ── Paginación ───────────────────────────────────────────── */
  const productosPaginados = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return productosFiltrados.slice(start, start + itemsPerPage)
  }, [productosFiltrados, currentPage, itemsPerPage])

  /* ── Selección ────────────────────────────────────────────── */
  const toggleSelectOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const isPageFullySelected =
    productosPaginados.length > 0 && productosPaginados.every((p) => selectedIds.has(p.id))

  const toggleSelectPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (isPageFullySelected) {
        productosPaginados.forEach((p) => next.delete(p.id))
      } else {
        productosPaginados.forEach((p) => next.add(p.id))
      }
      return next
    })
  }

  const clearSelection = () => setSelectedIds(new Set())

  /* ── Exportar: Abrir Modal Previo ──────────────────────────── */
  const handleOpenExportModal = () => {
    const productosAExportar =
      selectedIds.size > 0
        ? productos.filter((p) => selectedIds.has(p.id))
        : productosFiltrados

    if (productosAExportar.length === 0) {
      alert('No hay productos para exportar')
      return
    }

    const formattedData = productosAExportar.map((p) => ({
      codigo: p.codigo || '',
      nombre: p.nombre || '',
      laboratorio: p.laboratorio || '',
      proveedor_identificacion: p.proveedor?.identificacion || '',
      proveedor_nombre: p.proveedor?.nombre || ''
    }))

    setExcelData(formattedData)
    setExcelModalMode('export')
    setShowExcelModal(true)
  }

  /* ── Confirmar Exportación a Archivo Excel ────────────────── */
  const handleConfirmExport = () => {
    const dataToExport = excelData.map((p) => ({
      'Código': p.codigo,
      'Nombre del Producto': p.nombre,
      'Laboratorio': p.laboratorio,
      'NIT / ID Proveedor': p.proveedor_identificacion,
      'Nombre Proveedor': p.proveedor_nombre
    }))

    const worksheet = XLSX.utils.json_to_sheet(dataToExport)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Productos')
    XLSX.writeFile(workbook, `productos_${new Date().toISOString().slice(0, 10)}.xlsx`)

    setShowExcelModal(false)
  }

  /* ── Importar: Lectura del Archivo y Abrir Modal Previo ───── */
  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result
        const workbook = XLSX.read(bstr, { type: 'binary' })
        const wsname = workbook.SheetNames[0]
        const ws = workbook.Sheets[wsname]
        const data = XLSX.utils.sheet_to_json(ws)

        if (data.length === 0) {
          alert('El archivo cargado está vacío')
          return
        }

        const productosAImportar = data
          .map((item) => ({
            codigo: String(item['Código'] || item['codigo'] || item['Codigo'] || item['SKU'] || '').trim(),
            nombre: String(item['Nombre del Producto'] || item['nombre'] || item['Producto'] || item['Nombre'] || '').trim(),
            laboratorio: String(item['Laboratorio'] || item['laboratorio'] || '').trim() || null,
            proveedor_identificacion: String(
              item['NIT / ID Proveedor'] || item['proveedor_identificacion'] || item['NIT Proveedor'] || item['NIT'] || ''
            ).trim() || null,
            proveedor_nombre: String(item['Nombre Proveedor'] || item['Proveedor'] || '').trim() || null,
            proveedor_id: item['proveedor_id'] || null
          }))
          .filter((item) => item.codigo !== '' && item.nombre !== '')

        if (productosAImportar.length === 0) {
          alert('No se encontraron productos válidos en el archivo.')
          return
        }

        setExcelData(productosAImportar)
        setExcelModalMode('import')
        setShowExcelModal(true)
      } catch (err) {
        alert('Error al leer el archivo Excel/CSV')
      } finally {
        e.target.value = ''
      }
    }
    reader.readAsBinaryString(file)
  }

  /* ── Confirmar Importación a Backend ───────────────────────── */
  const handleConfirmImport = async (dataToSubmit) => {
    setLoading(true)
    try {
      const response = await api.post('/productos/importar-json', dataToSubmit)
      const { creados, actualizados } = response.data
      alert(`Importación completada: ${creados} creados y ${actualizados} actualizados.`)
      setShowExcelModal(false)
      fetchData()
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al importar productos')
    } finally {
      setLoading(false)
    }
  }

  /* ── Handlers de Guardado ────────────────────────────────── */
  const handleSaveProducto = async (e) => {
    e.preventDefault()
    try {
      if (editingItem) {
        await api.put(`/productos/${editingItem.id}`, formProducto)
      } else {
        await api.post('/productos/', formProducto)
      }
      setShowModalProducto(false)
      fetchData()
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al guardar el producto')
    }
  }

  /* ── Handlers de Eliminación ──────────────────────────────── */
  const handleDeleteProducto = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return
    try {
      await api.delete(`/productos/${id}`)
      fetchData()
    } catch (err) {
      alert('Error al eliminar el producto')
    }
  }

  /* ── Modal Opener ─────────────────────────────────────────── */
  const openProductoModal = (prod = null) => {
    if (prod) {
      setEditingItem(prod)
      setFormProducto({
        codigo: prod.codigo || '',
        nombre: prod.nombre || '',
        laboratorio: prod.laboratorio || '',
        proveedor_id: prod.proveedor_id || ''
      })
    } else {
      setEditingItem(null)
      setFormProducto({
        codigo: '',
        nombre: '',
        laboratorio: '',
        proveedor_id: proveedores[0]?.id || ''
      })
    }
    setShowModalProducto(true)
  }

  return (
    <div className="space-y-4">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".xlsx, .xls, .csv"
        className="hidden"
      />

      {/* Barra de Búsqueda, Filtro y Acciones */}
      <div className="card px-4 py-3 flex items-center justify-between flex-wrap gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
          <input
            type="text"
            placeholder="Buscar por código o nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-base pl-9 w-full"
          />
        </div>

        <select
          value={proveedorFilter}
          onChange={(e) => setProveedorFilter(e.target.value)}
          className="input-base w-auto"
        >
          <option value="">Todos los Proveedores</option>
          {proveedores.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2 shrink-0">
          {/* Componente reusable de Plantilla */}
          <ExcelExportButton
            columns={excelColumns}
            filename="plantilla_productos"
            sheetName="Plantilla Productos"
            label="Plantilla"
            isTemplate={true}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="border border-surface-200 hover:bg-surface-100 text-surface-700 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
            title="Importar Excel/CSV"
            disabled={loading}
          >
            <Upload size={16} /> Importar
          </button>

          <button
            onClick={handleOpenExportModal}
            className="border border-surface-200 hover:bg-surface-100 text-surface-700 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
            title="Exportar a Excel"
          >
            <Download size={16} />
            {selectedIds.size > 0 ? `Exportar (${selectedIds.size})` : 'Exportar'}
          </button>

          <button
            onClick={() => openProductoModal()}
            className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Plus size={16} /> Nuevo Producto
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-danger-50 border border-danger-200 rounded-xl px-4 py-3 text-sm text-danger-700">
          {error}
        </div>
      )}

      {/* TABLA DE PRODUCTOS */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-surface-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-surface-700">
            Listado de Productos
            <span className="ml-2 font-normal text-surface-400">({productosFiltrados.length})</span>
          </h3>
          {selectedIds.size > 0 && (
            <button
              onClick={clearSelection}
              className="text-xs font-medium text-brand-500 hover:text-brand-600"
            >
              Limpiar selección ({selectedIds.size})
            </button>
          )}
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          {productosFiltrados.length === 0 && !loading ? (
            <EmptyState icon={Package} title="No hay productos registrados" />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-100 bg-surface-50 text-xs text-surface-500 uppercase tracking-wide">
                  <th className="text-left px-5 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={isPageFullySelected}
                      onChange={toggleSelectPage}
                      className="rounded border-surface-300"
                    />
                  </th>
                  <th className="text-left px-4 py-3">Código</th>
                  <th className="text-left px-4 py-3">Producto</th>
                  <th className="text-left px-4 py-3">Laboratorio</th>
                  <th className="text-left px-4 py-3">Proveedor</th>
                  <th className="text-right px-5 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {productosPaginados.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-surface-100 last:border-0 hover:bg-surface-50 transition-colors"
                  >
                    <td className="px-5 py-2.5">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(p.id)}
                        onChange={() => toggleSelectOne(p.id)}
                        className="rounded border-surface-300"
                      />
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-surface-500 font-mono text-xs tabular font-bold">
                      {p.codigo}
                    </td>
                    <td className="px-4 py-2.5 text-surface-700 font-medium">{p.nombre}</td>
                    <td className="px-4 py-2.5 text-surface-500">{p.laboratorio || '—'}</td>
                    <td className="px-4 py-2.5 text-surface-600">{p.proveedor?.nombre || '—'}</td>
                    <td className="px-5 py-2.5 text-right whitespace-nowrap">
                      <button
                        onClick={() => openProductoModal(p)}
                        className="p-1 hover:text-brand-500 transition-colors mr-2"
                        title="Editar"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => handleDeleteProducto(p.id)}
                        className="p-1 hover:text-danger-500 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <Paginator
          currentPage={currentPage}
          totalItems={productosFiltrados.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      </div>

      {/* MODAL PREVISUALIZACIÓN EXCEL (IMPORTAR / EXPORTAR) */}
      <ExcelPreviewModal
        isOpen={showExcelModal}
        onClose={() => setShowExcelModal(false)}
        title={excelModalMode === 'import' ? 'Previsualización de Importación' : 'Previsualización de Exportación'}
        columns={excelColumns}
        data={excelData}
        mode={excelModalMode}
        existingItems={productos}
        matchKey="codigo"
        onConfirmExport={handleConfirmExport}
        onConfirmImport={handleConfirmImport}
        loading={loading}
      />

      {/* MODAL PRODUCTO */}
      {showModalProducto && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-modal border border-surface-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-semibold text-surface-800">
                {editingItem ? 'Editar Producto' : 'Nuevo Producto'}
              </h3>
              <button
                onClick={() => setShowModalProducto(false)}
                className="text-surface-400 hover:text-surface-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveProducto} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-surface-600">Código</label>
                <input
                  type="text"
                  required
                  value={formProducto.codigo}
                  onChange={(e) => setFormProducto({ ...formProducto, codigo: e.target.value })}
                  className="input-base w-full mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-surface-600">Nombre del Producto</label>
                <input
                  type="text"
                  required
                  value={formProducto.nombre}
                  onChange={(e) => setFormProducto({ ...formProducto, nombre: e.target.value })}
                  className="input-base w-full mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-surface-600">Laboratorio</label>
                <input
                  type="text"
                  value={formProducto.laboratorio}
                  onChange={(e) => setFormProducto({ ...formProducto, laboratorio: e.target.value })}
                  className="input-base w-full mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-surface-600">Proveedor</label>
                <select
                  required
                  value={formProducto.proveedor_id}
                  onChange={(e) => setFormProducto({ ...formProducto, proveedor_id: e.target.value })}
                  className="input-base w-full mt-1"
                >
                  <option value="">Selecciona un proveedor</option>
                  {proveedores.map((prov) => (
                    <option key={prov.id} value={prov.id}>
                      {prov.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModalProducto(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-surface-600 hover:bg-surface-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-brand-500 text-white hover:bg-brand-600 transition-colors shadow-sm"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}