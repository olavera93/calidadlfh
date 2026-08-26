import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { Plus, Search, Edit2, Trash2, Package, X, Upload, Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import api from '../services/api'
import { EmptyState } from '../components/ui/EmptyState'
import Paginator from '../components/ui/Paginator'
import ExcelPreviewModal from '../components/ui/ExcelPreviewModal'
import { ExcelExportButton } from '../components/ui/ExcelActions'
import { useNavigate, useSearchParams } from 'react-router-dom'
import ProveedorSearchSelect from '../components/ui/ProveedorSearchSelect'
import { useAuth } from '../context/AuthContext'
import PuedeEditar from '../components/PuedeEditar'

export default function ProductosView() {
  // Datos
  const [productos, setProductos] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Referencia para el input de archivo oculto
  const fileInputRef = useRef(null)

  // Filtros y Búsqueda
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  // Se inicializa con lo que venga en la URL (ej. ?proveedor_id=5 al llegar
  // desde el botón "Ver productos" en el detalle de un Proveedor)
  const [proveedorFilter, setProveedorFilter] = useState(searchParams.get('proveedor_id') || '')
  const [estadoFilter, setEstadoFilter] = useState('')

  // Selección (Map<id, producto> para que sobreviva el cambio de página) y Paginación
  const [selectedItems, setSelectedItems] = useState(new Map())
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [totalItems, setTotalItems] = useState(0)

  // Modal Producto State
  const [showModalProducto, setShowModalProducto] = useState(false)
  const [editingItem, setEditingItem] = useState(null)

  /* ── Estados para Modal de Eliminación de Producto ──────── */
  const [showModalDelete, setShowModalDelete] = useState(false)
  const [prodToDelete, setProdToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Modal Excel State
  const [showExcelModal, setShowExcelModal] = useState(false)
  const [excelModalMode, setExcelModalMode] = useState('export') // 'import' | 'export'
  const [excelData, setExcelData] = useState([])
  // Lista completa de productos existentes (todos, no solo la página actual) para que el
  // modal de importación pueda detectar correctamente duplicados por código
  const [allProductosForImport, setAllProductosForImport] = useState([])

  // Columnas para la previsualización del mini-excel y generación de plantillas
  const excelColumns = [
    { key: 'codigo', label: 'Código' },
    { key: 'nombre', label: 'Nombre del Producto' },
    { key: 'laboratorio', label: 'Laboratorio' },
    { key: 'registro_sanitario', label: 'Registro Sanitario' },
    { key: 'estado', label: 'Estado' },
    { key: 'proveedor_identificacion', label: 'NIT / ID Proveedor' },
    { key: 'proveedor_nombre', label: 'Nombre Proveedor' }
  ]

  const navigate = useNavigate()

  // Formulario State
  const [formProducto, setFormProducto] = useState({
    codigo: '',
    nombre: '',
    laboratorio: '',
    registro_sanitario: '',
    estado: 'ACTIVO',
    proveedor_id: ''
  })

  /* ── Cargar Proveedores (una sola vez, lista corta para el combobox) ── */
  useEffect(() => {
    api.get('/proveedores')
      .then((res) => setProveedores(res.data))
      .catch((err) => setError(err.response?.data?.detail || 'Error al cargar proveedores'))
  }, [])

  /* ── Opciones de proveedor para el combobox con búsqueda (filtro y modal) ── */
  const proveedorOptions = useMemo(
    () => proveedores.map((p) => ({
      id: p.id,
      label: p.nombre,
      sublabel: p.identificacion || undefined
    })),
    [proveedores]
  )

  /* ── Debounce de la búsqueda: espera 350ms tras dejar de teclear ──── */
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350)
    return () => clearTimeout(timer)
  }, [search])

  /* ── Sincroniza el filtro con la URL (ej. al llegar desde el botón
     "Ver productos de este proveedor" en el detalle de un Proveedor) ── */
  useEffect(() => {
    const proveedorIdUrl = searchParams.get('proveedor_id') || ''
    setProveedorFilter(proveedorIdUrl)
  }, [searchParams])

  /* ── Cambiar el filtro también actualiza la URL ─── */
  const handleProveedorFilterChange = (value) => {
    setProveedorFilter(value)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value) {
        next.set('proveedor_id', value)
      } else {
        next.delete('proveedor_id')
      }
      return next
    })
  }

  /* ── Volver a página 1 cuando cambian filtros/búsqueda/tamaño ─────── */
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, proveedorFilter, estadoFilter, itemsPerPage])

  /* ── Cargar Productos de la API (server-side pagination + search) ─── */
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/productos', {
        params: {
          skip: (currentPage - 1) * itemsPerPage,
          limit: itemsPerPage,
          search: debouncedSearch || undefined,
          proveedor_id: proveedorFilter || undefined,
          estado: estadoFilter || undefined
        }
      })

      // 1. Si el backend devuelve la estructura paginada { items, total }
      if (res.data && Array.isArray(res.data.items)) {
        setProductos(res.data.items)
        setTotalItems(res.data.total ?? res.data.items.length)
      } 
      // 2. Si por alguna razón el backend devuelve el array directo [...]
      else if (Array.isArray(res.data)) {
        setProductos(res.data)
        setTotalItems(res.data.length)
      } 
      // 3. Fallback en caso de un formato inesperado
      else {
        setProductos([])
        setTotalItems(0)
      }

    } catch (err) {
      setError(err.response?.data?.detail || 'Error al cargar la información')
      setProductos([]) // Limpiamos para evitar inconsistencias
    } finally {
      setLoading(false)
    }
  }, [currentPage, itemsPerPage, debouncedSearch, proveedorFilter, estadoFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  /* ── Selección (persiste entre páginas gracias al Map) ───────────── */
  const toggleSelectOne = (producto) => {
    setSelectedItems((prev) => {
      const next = new Map(prev)
      if (next.has(producto.id)) next.delete(producto.id)
      else next.set(producto.id, producto)
      return next
    })
  }

  const isPageFullySelected =
    productos.length > 0 && productos.every((p) => selectedItems.has(p.id))

  const toggleSelectPage = () => {
    setSelectedItems((prev) => {
      const next = new Map(prev)
      if (isPageFullySelected) {
        productos.forEach((p) => next.delete(p.id))
      } else {
        productos.forEach((p) => next.set(p.id, p))
      }
      return next
    })
  }

  const clearSelection = () => setSelectedItems(new Map())

  /* ── Exportar: Abrir Modal Previo ──────────────────────────── */
  const handleOpenExportModal = async () => {
    let productosAExportar = []

    if (selectedItems.size > 0) {
      productosAExportar = Array.from(selectedItems.values())
    } else {
      // Sin selección: traer TODOS los productos que coinciden con el filtro/búsqueda actual,
      // no solo los de la página visible.
      setLoading(true)
      try {
        const res = await api.get('/productos', {
          params: {
            skip: 0,
            limit: 100000,
            search: debouncedSearch || undefined,
            proveedor_id: proveedorFilter || undefined
          }
        })
        productosAExportar = res.data.items
      } catch (err) {
        alert(err.response?.data?.detail || 'Error al preparar la exportación')
        setLoading(false)
        return
      }
      setLoading(false)
    }

    if (productosAExportar.length === 0) {
      alert('No hay productos para exportar')
      return
    }

    const formattedData = productosAExportar.map((p) => ({
      codigo: p.codigo || '',
      nombre: p.nombre || '',
      laboratorio: p.laboratorio || '',
      registro_sanitario: p.registro_sanitario || '',
      estado: p.estado || 'ACTIVO',
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
      'Registro Sanitario': p.registro_sanitario,
      'Estado': p.estado,
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
    reader.onload = async (evt) => {
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
            registro_sanitario: String(item['Registro Sanitario'] || item['registro_sanitario'] || item['Registro'] || '').trim() || null,
            estado: String(item['Estado'] || item['estado'] || 'ACTIVO').trim().toUpperCase(),
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

        // Traer TODOS los productos existentes (no solo la página visible) para que el
        // modal pueda comparar por código y marcar correctamente nuevos vs. actualizaciones
        try {
          const res = await api.get('/productos', { params: { skip: 0, limit: 100000 } })
          setAllProductosForImport(res.data.items)
        } catch (err) {
          setAllProductosForImport([])
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
  const handleOpenDeleteModal = (prod) => {
    setProdToDelete(prod)
    setShowModalDelete(true)
  }

  const handleDeleteProducto = async () => {
    if (!prodToDelete) return

    setDeleting(true)
    try {
      await api.delete(`/productos/${prodToDelete.id}`)
      setShowModalDelete(false)
      setProdToDelete(null)
      fetchData()
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al eliminar el producto')
    } finally {
      setDeleting(false)
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
        registro_sanitario: prod.registro_sanitario || '',
        estado: prod.estado || 'ACTIVO',
        proveedor_id: prod.proveedor_id || ''
      })
    } else {
      setEditingItem(null)
      setFormProducto({
        codigo: '',
        nombre: '',
        laboratorio: '',
        registro_sanitario: '',
        estado: 'ACTIVO',
        proveedor_id: proveedores[0]?.id || ''
      })
    }
    setShowModalProducto(true)
  }
// ── Estado para Modal de Eliminación Masiva ─────────────────
const [showModalBulkDelete, setShowModalBulkDelete] = useState(false)
const [deletingBulk, setDeletingBulk] = useState(false)

// ── Handler para Eliminación Masiva ────────────────────────
const handleConfirmBulkDelete = async () => {
  const idsToDelete = Array.from(selectedItems.keys())
  if (idsToDelete.length === 0) return

  setDeletingBulk(true)
  try {
    await api.post('/productos/eliminar-masivo', { ids: idsToDelete })
    clearSelection()
    setShowModalBulkDelete(false)
    fetchData()
  } catch (err) {
    alert(err.response?.data?.detail || 'Error al eliminar los productos seleccionados')
  } finally {
    setDeletingBulk(false)
  
  
  }
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
            placeholder="Buscar por código, nombre o reg. sanitario..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-base pl-9 w-full"
          />
        </div>

        <ProveedorSearchSelect
          options={proveedorOptions}
          value={proveedorFilter}
          onChange={(id) => handleProveedorFilterChange(id)}
          placeholder="Todos los Proveedores"
          clearable
          className="w-56"
        />

        <select
          value={estadoFilter}
          onChange={(e) => setEstadoFilter(e.target.value)}
          className="input-base w-40 shrink-0 text-xs"
        >
          <option value="">Todos los Estados</option>
          <option value="ACTIVO">Activo</option>
          <option value="INACTIVO">Inactivo</option>
        </select>

        {selectedItems.size > 0 && (


    <PuedeEditar>
        <button
          onClick={() => setShowModalBulkDelete(true)}
          className="bg-danger-50 hover:bg-danger-100 text-danger-600 border border-danger-200 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
          title="Eliminar elementos seleccionados"
        >
          <Trash2 size={16} /> Eliminar ({selectedItems.size})
        </button>
        </PuedeEditar>
      
    )}

        <div className="flex items-center gap-2 shrink-0">
          <ExcelExportButton
            columns={excelColumns}
            filename="plantilla_productos"
            sheetName="Plantilla Productos"
            label="Plantilla"
            isTemplate={true}
          />

<PuedeEditar>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="border border-surface-200 hover:bg-surface-100 text-surface-700 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
            title="Importar Excel/CSV"
            disabled={loading}
          >
            <Upload size={16} /> Importar
          </button>
</PuedeEditar>

          <button
            onClick={handleOpenExportModal}
            className="border border-surface-200 hover:bg-surface-100 text-surface-700 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
            title="Exportar a Excel"
          >
            <Download size={16} />
            {selectedItems.size > 0 ? `Exportar (${selectedItems.size})` : 'Exportar'}
          </button>

          <PuedeEditar>
            <button
              onClick={() => openProductoModal()}
              className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Plus size={16} /> Nuevo Producto
            </button>
          </PuedeEditar>
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
            <span className="ml-2 font-normal text-surface-400">({totalItems})</span>
          </h3>
          {selectedItems.size > 0 && (
            <button
              onClick={clearSelection}
              className="text-xs font-medium text-brand-500 hover:text-brand-600"
            >
              Limpiar selección ({selectedItems.size})
            </button>
          )}
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          {totalItems === 0 && !loading ? (
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
                  <th className="text-left px-4 py-3">Reg. Sanitario</th>
                  <th className="text-center px-4 py-3">Estado</th>
                  <th className="text-left px-4 py-3">Proveedor</th>
                  <th className="text-right px-5 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {productos.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-surface-100 last:border-0 hover:bg-surface-50 transition-colors"
                  >
                    <td className="px-5 py-2.5">
                      <input
                        type="checkbox"
                        checked={selectedItems.has(p.id)}
                        onChange={() => toggleSelectOne(p)}
                        className="rounded border-surface-300"
                      />
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-surface-500 font-mono text-xs tabular font-bold">
                      {p.codigo}
                    </td>
                    <td className="px-4 py-2.5 text-surface-700 font-medium">
                      <button
                        type="button"
                        onClick={() => navigate(`/productos/${p.id}`)}
                        className="hover:text-brand-600 hover:underline text-left cursor-pointer transition-colors"
                      >
                        {p.nombre}
                      </button>
                    </td>
                    <td className="px-4 py-2.5 text-surface-500">{p.laboratorio || '—'}</td>
                    <td className="px-4 py-2.5 text-surface-500 font-mono text-xs">
                      {p.registro_sanitario || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          p.estado === 'INACTIVO'
                            ? 'bg-danger-50 text-danger-600 border border-danger-200'
                            : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                        }`}
                      >
                        {p.estado || 'ACTIVO'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-surface-600">{p.proveedor?.nombre || '—'}</td>
                    <td className="px-5 py-2.5 text-right whitespace-nowrap">

                      <PuedeEditar>
                      <button
                        onClick={() => openProductoModal(p)}
                        className="p-1 hover:text-brand-500 transition-colors mr-2"
                        title="Editar"
                      >
                        <Edit2 size={15} />
                      </button>
                      </PuedeEditar>

                      <PuedeEditar>
                      <button
                        onClick={() => handleOpenDeleteModal(p)}
                        className="p-1 hover:text-danger-500 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={15} />
                      </button>
                      </PuedeEditar>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <Paginator
          currentPage={currentPage}
          totalItems={totalItems}
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
        existingItems={excelModalMode === 'import' ? allProductosForImport : productos}
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
                <label className="text-xs font-semibold text-surface-600">Registro Sanitario</label>
                <input
                  type="text"
                  value={formProducto.registro_sanitario}
                  onChange={(e) => setFormProducto({ ...formProducto, registro_sanitario: e.target.value })}
                  placeholder="Ej. INVIMA 2020M-0001234"
                  className="input-base w-full mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-surface-600">Estado</label>
                <select
                  value={formProducto.estado}
                  onChange={(e) => setFormProducto({ ...formProducto, estado: e.target.value })}
                  className="input-base w-full mt-1"
                >
                  <option value="ACTIVO">ACTIVO</option>
                  <option value="INACTIVO">INACTIVO</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-surface-600">Proveedor</label>
                <ProveedorSearchSelect
                  options={proveedorOptions}
                  value={formProducto.proveedor_id}
                  onChange={(id) => setFormProducto({ ...formProducto, proveedor_id: id })}
                  placeholder="Selecciona un proveedor"
                  className="mt-1"
                />
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

{/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN MASIVA */}
      {showModalBulkDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-modal border border-surface-100 space-y-4">
            <h3 className="text-base font-semibold text-surface-800">
              ¿Eliminar productos seleccionados?
            </h3>
            <p className="text-xs text-surface-600">
              Estás a punto de eliminar <strong className="text-surface-800">{selectedItems.size}</strong> producto(s). Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowModalBulkDelete(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-surface-600 hover:bg-surface-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkDelete}
                disabled={deletingBulk}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-danger-500 text-white hover:bg-danger-600 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {deletingBulk ? 'Eliminando...' : 'Eliminar Selección'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
      {showModalDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-modal border border-surface-100 space-y-4">
            <h3 className="text-base font-semibold text-surface-800">
              ¿Eliminar producto?
            </h3>
            <p className="text-xs text-surface-600">
              ¿Estás seguro de que deseas eliminar el producto{' '}
              <strong className="text-surface-800">{prodToDelete?.nombre}</strong>? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowModalDelete(false)
                  setProdToDelete(null)
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-surface-600 hover:bg-surface-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteProducto}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-danger-500 text-white hover:bg-danger-600 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

}