import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { Plus, Search, Edit2, Trash2, FileText, X, Upload, Download, Tag, Paperclip, ExternalLink } from 'lucide-react'
import * as XLSX from 'xlsx'
import api from '../services/api'
import { EmptyState } from '../components/ui/EmptyState'
import Paginator from '../components/ui/Paginator'
import ExcelPreviewModal from '../components/ui/ExcelPreviewModal'
import { ExcelExportButton } from '../components/ui/ExcelActions'
import { useNavigate } from 'react-router-dom'
import { SearchableSelect } from '../components/ui/SearchableSelect' // ajusta la ruta según tu estructura
import ProveedorSearchSelect from '../components/ui/ProveedorSearchSelect'
import { useAuth } from '../context/AuthContext'
import PuedeEditar from '../components/PuedeEditar'

const MAX_FILE_SIZE_MB = 1000
const ACCEPTED_EXTENSIONS = '.pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx'
const IMAGE_EXTENSION_REGEX = /\.(jpg|jpeg|png|gif|webp|bmp)$/i
const OFFICE_EXTENSION_REGEX = /\.(doc|docx|xls|xlsx|ppt|pptx)$/i

export default function DocumentosView() {
  // Datos principales
  const [documentos, setDocumentos] = useState([])
  const [productos, setProductos] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const navigate = useNavigate()

  // Referencia para el input de archivo oculto
  const fileInputRef = useRef(null)

  // Modal Confirmación de Eliminación State
  const [showModalDelete, setShowModalDelete] = useState(false)
  const [docToDelete, setDocToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Filtros y Búsqueda
  const [search, setSearch] = useState('')
  const [proveedorFilter, setProveedorFilter] = useState('')

  // Selección y Paginación
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Modal Documento State
  const [showModalDocumento, setShowModalDocumento] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [tagInput, setTagInput] = useState('')
  const [archivoDocumento, setArchivoDocumento] = useState(null)
  const [archivoError, setArchivoError] = useState('')
  const [savingDocumento, setSavingDocumento] = useState(false)

  // Modal Vista Previa de Archivo
  const [docPreview, setDocPreview] = useState(null)
  const ABRIR_EN_PESTANA_NUEVA = false

  // Modal Excel State
  const [showExcelModal, setShowExcelModal] = useState(false)
  const [excelModalMode, setExcelModalMode] = useState('export')
  const [excelData, setExcelData] = useState([])

  // Columnas para la previsualización del mini-excel y generación de plantillas
  const excelColumns = [
    { key: 'nombre_docu', label: 'Nombre del Documento' },
    { key: 'producto_codigo', label: 'Código Producto' },
    { key: 'producto_nombre', label: 'Producto' },
    { key: 'laboratorio', label: 'Laboratorio' },
    { key: 'proveedor_nombre', label: 'Proveedor' },
    { key: 'etiquetas_str', label: 'Etiquetas (separadas por coma)' }
  ]

  // Formulario State
  const [formDocumento, setFormDocumento] = useState({
    nombre_docu: '',
    tipo_asociacion: 'producto',
    producto_id: '',
    proveedor_id: '',
    etiquetas: []
  })

  /* ── Cargar Datos de la API ──────────────────────────────── */
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [resDoc, resProd, resProv] = await Promise.all([
  api.get('/documentos/'),
  api.get('/productos', { params: { limit: 100000 } }), // trae todos para el selector
  api.get('/proveedores')
])
setDocumentos(resDoc.data)
setProductos(resProd.data?.items || [])   // 👈 extrae items
setProveedores(resProv.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al cargar los documentos')
    } 
    finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  /* ── Filtrado dinámico ────────────────────────────────────── */
  const documentosFiltrados = useMemo(() => {
    const term = search.toLowerCase()
    return documentos.filter((doc) => {
      const prod = doc.producto
      const prov = doc.proveedor || prod?.proveedor

      const matchSearch =
        doc.nombre_docu?.toLowerCase().includes(term) ||
        prod?.nombre?.toLowerCase().includes(term) ||
        prod?.codigo?.toLowerCase().includes(term) ||
        prod?.laboratorio?.toLowerCase().includes(term) ||
        prov?.nombre?.toLowerCase().includes(term) ||
        doc.etiquetas?.some((tag) => tag.toLowerCase().includes(term))

      const matchProv = proveedorFilter
        ? String(doc.proveedor_id || prod?.proveedor_id) === String(proveedorFilter)
        : true

      return matchSearch && matchProv
    })
  }, [documentos, search, proveedorFilter])

  useEffect(() => {
    setCurrentPage(1)
  }, [search, proveedorFilter, itemsPerPage])

  /* ── Paginación ───────────────────────────────────────────── */
  const documentosPaginados = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return documentosFiltrados.slice(start, start + itemsPerPage)
  }, [documentosFiltrados, currentPage, itemsPerPage])

  /* ── Selección ────────────────────────────────────────────── */
  const toggleSelectOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const proveedorOptions = React.useMemo(
  () => proveedores.map((p) => ({
    id: p.id,
    label: p.nombre,
    sublabel: p.identificacion || undefined // si tienes NIT, ayuda mucho a buscar
  })),
  [proveedores]
)
  const isPageFullySelected =
    documentosPaginados.length > 0 && documentosPaginados.every((d) => selectedIds.has(d.id))

  const toggleSelectPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (isPageFullySelected) {
        documentosPaginados.forEach((d) => next.delete(d.id))
      } else {
        documentosPaginados.forEach((d) => next.add(d.id))
      }
      return next
    })
  }

  const clearSelection = () => setSelectedIds(new Set())

  /* ── Gestor de Etiquetas en Formulario ─────────────────────── */
  const handleAddTag = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const newTag = tagInput.trim().toUpperCase()
      if (newTag && !formDocumento.etiquetas.includes(newTag)) {
        setFormDocumento((prev) => ({
          ...prev,
          etiquetas: [...prev.etiquetas, newTag]
        }))
      }
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove) => {
    setFormDocumento((prev) => ({
      ...prev,
      etiquetas: prev.etiquetas.filter((t) => t !== tagToRemove)
    }))
  }

  /* ── Manejo de Archivo Adjunto del Documento ───────────────── */
  const handleArchivoDocumentoChange = (e) => {
    const file = e.target.files[0]
    setArchivoError('')

    if (!file) {
      setArchivoDocumento(null)
      return
    }

    const sizeMB = file.size / (1024 * 1024)
    if (sizeMB > MAX_FILE_SIZE_MB) {
      setArchivoError(`El archivo supera el límite de ${MAX_FILE_SIZE_MB}MB.`)
      e.target.value = ''
      setArchivoDocumento(null)
      return
    }

    setArchivoDocumento(file)
  }

  /* ── Exportar: Abrir Modal Previo ──────────────────────────── */
  const handleOpenExportModal = () => {
    const docsAExportar =
      selectedIds.size > 0
        ? documentos.filter((d) => selectedIds.has(d.id))
        : documentosFiltrados

    if (docsAExportar.length === 0) {
      alert('No hay documentos para exportar')
      return
    }

    const formattedData = docsAExportar.map((d) => ({
      nombre_docu: d.nombre_docu || '',
      producto_codigo: d.producto?.codigo || '',
      producto_nombre: d.producto?.nombre || '',
      laboratorio: d.producto?.laboratorio || '',
      proveedor_nombre: d.proveedor?.nombre || d.producto?.proveedor?.nombre || '',
      etiquetas_str: Array.isArray(d.etiquetas) ? d.etiquetas.join(', ') : ''
    }))

    setExcelData(formattedData)
    setExcelModalMode('export')
    setShowExcelModal(true)
  }

  /* ── Confirmar Exportación a Archivo Excel ────────────────── */
  const handleConfirmExport = () => {
    const dataToExport = excelData.map((d) => ({
      'Nombre del Documento': d.nombre_docu,
      'Código Producto': d.producto_codigo,
      'Producto': d.producto_nombre,
      'Laboratorio': d.laboratorio,
      'Proveedor': d.proveedor_nombre,
      'Etiquetas': d.etiquetas_str
    }))

    const worksheet = XLSX.utils.json_to_sheet(dataToExport)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Documentos')
    XLSX.writeFile(workbook, `documentos_${new Date().toISOString().slice(0, 10)}.xlsx`)

    setShowExcelModal(false)
  }

  /* ── Importar: Lectura del Archivo Excel ───────────────────── */
  /* ── Importar: Lectura del Archivo Excel ───────────────────── */
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

      // Helper para buscar columnas dinámicamente ignorando tildes, mayúsculas y sufijos
      const getFieldValue = (item, ...possibleKeys) => {
        const foundKey = Object.keys(item).find((k) =>
          possibleKeys.some(
            (pKey) =>
              k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') ===
              pKey.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          )
        )
        return foundKey ? String(item[foundKey]).trim() : ''
      }

      const docsAImportar = data
        .map((item) => {
          // Busca "Etiquetas (separadas por coma)", "Etiquetas", "etiquetas_str", etc.
          const tagsRaw = getFieldValue(
            item,
            'Etiquetas (separadas por coma)',
            'Etiquetas',
            'etiquetas',
            'etiquetas_str'
          )
          const tagsArray = tagsRaw ? tagsRaw.split(',').map((t) => t.trim().toUpperCase()) : []

          return {
            nombre_docu: getFieldValue(item, 'Nombre del Documento', 'nombre_docu', 'nombre'),
            producto_codigo: getFieldValue(item, 'Código Producto', 'producto_codigo', 'codigo'),
            producto_nombre: getFieldValue(item, 'Producto', 'producto_nombre'),
            laboratorio: getFieldValue(item, 'Laboratorio', 'laboratorio'),
            proveedor_nombre: getFieldValue(item, 'Proveedor', 'proveedor_nombre'),
            etiquetas: tagsArray,
            etiquetas_str: tagsRaw // 👈 Mismo key que en excelColumns para que el Preview Modal lo muestre
          }
        })
        .filter((item) => item.nombre_docu !== '')

      if (docsAImportar.length === 0) {
        alert('No se encontraron documentos válidos en el archivo.')
        return
      }

      setExcelData(docsAImportar)
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

  /* ── Confirmar Importación al Backend ──────────────────────── */
  const handleConfirmImport = async (dataToSubmit) => {
    setLoading(true)
    try {
      const response = await api.post('/documentos/importar-json', dataToSubmit)
      const { creados, actualizados } = response.data
      alert(`Importación completada: ${creados} creados y ${actualizados} actualizados.`)
      setShowExcelModal(false)
      fetchData()
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al importar documentos')
    } finally {
      setLoading(false)
    }
  }

  /* ── Guardado ─────────────────────────────────────────────── */
  const handleSaveDocumento = async (e) => {
    e.preventDefault()
    const esProducto = formDocumento.tipo_asociacion === 'producto'

    if (!editingItem && !archivoDocumento) {
      setArchivoError('Debes adjuntar un archivo.')
      return
    }

    setSavingDocumento(true)
    try {
      const data = new FormData()
      data.append('nombre_docu', formDocumento.nombre_docu)
      data.append('etiquetas', JSON.stringify(formDocumento.etiquetas))
      if (esProducto && formDocumento.producto_id) data.append('producto_id', formDocumento.producto_id)
      if (!esProducto && formDocumento.proveedor_id) data.append('proveedor_id', formDocumento.proveedor_id)
      if (archivoDocumento) data.append('archivo', archivoDocumento)

      if (editingItem) {
        await api.put(`/documentos/${editingItem.id}`, data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      } else {
        await api.post('/documentos/', data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      }
      setShowModalDocumento(false)
      fetchData()
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al guardar el documento')
    } finally {
      setSavingDocumento(false)
    }
  }

  /* ── Abrir Modal de Confirmación de Eliminación ─────────────── */
  const handleOpenDeleteModal = (doc) => {
    setDocToDelete(doc)
    setShowModalDelete(true)
  }

  /* ── Ejecutar Eliminación tras Confirmación ─────────────────── */
  const handleDeleteDocumento = async () => {
    if (!docToDelete) return

    setDeleting(true)
    try {
      await api.delete(`/documentos/${docToDelete.id}`)
      setShowModalDelete(false)
      setDocToDelete(null)
      fetchData()
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al eliminar el documento')
    } finally {
      setDeleting(false)
    }
  }

  /* ── Modal Opener ─────────────────────────────────────────── */
  const openDocumentoModal = (doc = null) => {
    if (doc) {
      setEditingItem(doc)
      const esProveedor = Boolean(doc.proveedor_id && !doc.producto_id)

      setFormDocumento({
        nombre_docu: doc.nombre_docu || doc.nombre || '',
        tipo_asociacion: esProveedor ? 'proveedor' : 'producto',
        producto_id: doc.producto_id || '',
        proveedor_id: doc.proveedor_id || '',
        etiquetas: doc.etiquetas || []
      })
    } else {
      setEditingItem(null)
      setFormDocumento({
        nombre_docu: '',
        tipo_asociacion: 'producto',
        producto_id: '',
        proveedor_id: '',
        etiquetas: []
      })
    }
    setTagInput('')
    setArchivoDocumento(null)
    setArchivoError('')
    setShowModalDocumento(true)
  }

  /* ── Vista Previa de Archivo ──────────────────────────────── */
  const handleOpenPreview = (doc) => {
    if (!doc.ruta_archivo) return
    const url = `${api.defaults.baseURL}/documentos/${doc.id}/ver`

    if (ABRIR_EN_PESTANA_NUEVA) {
      window.open(url, '_blank', 'noopener,noreferrer')
      return
    }

    setDocPreview({
      id: doc.id,
      nombre: doc.nombre_docu,
      url
    })
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

      {/* Barra de Búsqueda, Filtros y Acciones */}
      <div className="card px-4 py-3 flex items-center justify-between flex-wrap gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
          <input
            type="text"
            placeholder="Buscar por documento, producto, laboratorio o etiqueta..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-base pl-9 w-full"
          />
        </div>

<ProveedorSearchSelect
  options={proveedorOptions}
  value={proveedorFilter}
  onChange={(id) => setProveedorFilter(id)}
  placeholder="Todos los Proveedores"
  clearable
  className="w-56"
/>

        <div className="flex items-center gap-2 shrink-0">
          <ExcelExportButton
            columns={excelColumns}
            filename="plantilla_documentos"
            sheetName="Plantilla Documentos"
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
            {selectedIds.size > 0 ? `Exportar (${selectedIds.size})` : 'Exportar'}
          </button>


<PuedeEditar>
          <button
            onClick={() => openDocumentoModal()}
            className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Plus size={16} /> Nuevo Documento
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

      {/* TABLA DE DOCUMENTOS */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-surface-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-surface-700">
            Listado de Documentos
            <span className="ml-2 font-normal text-surface-400">({documentosFiltrados.length})</span>
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
          {documentosFiltrados.length === 0 && !loading ? (
            <EmptyState icon={FileText} title="No hay documentos registrados" />
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
                  <th className="text-left px-4 py-3">Documento</th>
                  <th className="text-left px-4 py-3">Producto</th>
                  <th className="text-left px-4 py-3">Laboratorio</th>
                  <th className="text-left px-4 py-3">Proveedor</th>
                  <th className="text-left px-4 py-3">Etiquetas</th>
                  <th className="text-right px-5 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {documentosPaginados.map((doc) => {
                  const prod = doc.producto
                  const provNombre = doc.proveedor?.nombre || prod?.proveedor?.nombre || '—'

                  return (
                    <tr
                      key={doc.id}
                      className="border-b border-surface-100 last:border-0 hover:bg-surface-50 transition-colors"
                    >
                      <td className="px-5 py-2.5">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(doc.id)}
                          onChange={() => toggleSelectOne(doc.id)}
                          className="rounded border-surface-300"
                        />
                      </td>
                      <td className="px-4 py-2.5 font-medium text-surface-800">
                        <button
                          type="button"
                          onClick={() => handleOpenPreview(doc)}
                          disabled={!doc.ruta_archivo}
                          className="flex items-center gap-2 text-left group disabled:cursor-not-allowed"
                          title={doc.ruta_archivo ? 'Ver archivo' : 'Sin archivo adjunto'}
                        >
                          <FileText
                            size={16}
                            className={`shrink-0 ${doc.ruta_archivo ? 'text-brand-500' : 'text-surface-300'}`}
                          />
                          <span className={doc.ruta_archivo ? 'group-hover:text-brand-600 group-hover:underline transition-colors' : ''}>
                            {doc.nombre_docu}
                          </span>
                        </button>
                      </td>
                      <td className="px-4 py-2.5 text-surface-700">
                        {prod ? (
                          <button
                            type="button"
                            onClick={() => navigate(`/productos/${prod.id}`)}
                            className="text-left group cursor-pointer"
                          >
                            <span className="font-medium text-surface-800 group-hover:text-brand-600 group-hover:underline block transition-colors">
                              {prod.nombre}
                            </span>
                            <span className="block text-xs font-mono text-surface-400">
                              {prod.codigo}
                            </span>
                          </button>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-surface-500">
                        {prod?.laboratorio || '—'}
                      </td>
                      <td className="px-4 py-2.5 text-surface-600">
                        {doc.proveedor_id || prod?.proveedor_id ? (
                          <button
                            type="button"
                            onClick={() => navigate(`/proveedores/${doc.proveedor_id || prod.proveedor_id}`)}
                            className="hover:text-brand-600 hover:underline cursor-pointer text-left font-medium transition-colors"
                          >
                            {provNombre}
                          </button>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {doc.etiquetas && doc.etiquetas.length > 0 ? (
                            doc.etiquetas.map((tag, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-surface-100 text-surface-600 border border-surface-200"
                              >
                                {tag}
                              </span>
                            ))
                          ) : (
                            <span className="text-surface-400 text-xs">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-2.5 text-right whitespace-nowrap">
                        
                        <PuedeEditar>
                        <button
                          onClick={() => openDocumentoModal(doc)}
                          className="p-1 hover:text-brand-500 transition-colors mr-2"
                          title="Editar"
                        >
                          <Edit2 size={15} />
                        </button>
                        </PuedeEditar>
                        
                        <PuedeEditar>
                        <button
                          onClick={() => handleOpenDeleteModal(doc)}
                          className="p-1 hover:text-danger-500 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={15} />
                        </button>
                        </PuedeEditar>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        <Paginator
          currentPage={currentPage}
          totalItems={documentosFiltrados.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      </div>

      {/* MODAL PREVISUALIZACIÓN EXCEL */}
      <ExcelPreviewModal
        isOpen={showExcelModal}
        onClose={() => setShowExcelModal(false)}
        title={excelModalMode === 'import' ? 'Previsualización de Importación' : 'Previsualización de Exportación'}
        columns={excelColumns}
        data={excelData}
        mode={excelModalMode}
        existingItems={documentos}
        matchKey="nombre_docu"
        onConfirmExport={handleConfirmExport}
        onConfirmImport={handleConfirmImport}
        loading={loading}
      />

      {/* MODAL DOCUMENTO */}
      {showModalDocumento && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-modal border border-surface-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-semibold text-surface-800">
                {editingItem ? 'Editar Documento' : 'Nuevo Documento'}
              </h3>
              <button
                onClick={() => setShowModalDocumento(false)}
                className="text-surface-400 hover:text-surface-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveDocumento} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-surface-600">Nombre del Documento</label>
                <input
                  type="text"
                  required
                  value={formDocumento.nombre_docu}
                  onChange={(e) => setFormDocumento({ ...formDocumento, nombre_docu: e.target.value })}
                  placeholder="Ej. Registro_Sanitario_2026.pdf"
                  className="input-base w-full mt-1"
                />
              </div>

              {/* SELECTOR DE ASOCIACIÓN: PRODUCTO O PROVEEDOR */}
              <div>
                <label className="text-xs font-semibold text-surface-600 block mb-1.5">
                  Asociar Documento a:
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-surface-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() =>
                      setFormDocumento((prev) => ({ ...prev, tipo_asociacion: 'producto', proveedor_id: '' }))
                    }
                    className={`py-1.5 text-xs font-medium rounded-lg transition-all ${
                      formDocumento.tipo_asociacion === 'producto'
                        ? 'bg-white text-brand-600 shadow-sm font-semibold'
                        : 'text-surface-600 hover:text-surface-900'
                    }`}
                  >
                    Producto
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFormDocumento((prev) => ({ ...prev, tipo_asociacion: 'proveedor', producto_id: '' }))
                    }
                    className={`py-1.5 text-xs font-medium rounded-lg transition-all ${
                      formDocumento.tipo_asociacion === 'proveedor'
                        ? 'bg-white text-brand-600 shadow-sm font-semibold'
                        : 'text-surface-600 hover:text-surface-900'
                    }`}
                  >
                    Proveedor
                  </button>
                </div>
              </div>

              {/* CAMPO DINÁMICO SEGÚN LA ELECCIÓN */}
{formDocumento.tipo_asociacion === 'producto' ? (
  <div>
    <label className="text-xs font-semibold text-surface-600">Producto *</label>
    <SearchableSelect
      required
      value={formDocumento.producto_id}
      onChange={(id) => setFormDocumento({ ...formDocumento, producto_id: id })}
      placeholder="Buscar producto por código, nombre o laboratorio..."
      options={productos.map((prod) => ({
        id: prod.id,
        label: `${prod.codigo} - ${prod.nombre}`,
        subtext: prod.laboratorio ? `Lab: ${prod.laboratorio}` : 'Sin Lab'
      }))}
    />
  </div>
) : (
  <div>
    <label className="text-xs font-semibold text-surface-600">Proveedor *</label>
    <SearchableSelect
      required
      value={formDocumento.proveedor_id}
      onChange={(id) => setFormDocumento({ ...formDocumento, proveedor_id: id })}
      placeholder="Buscar proveedor..."
      options={proveedores.map((prov) => ({
        id: prov.id,
        label: prov.nombre
      }))}
    />
  </div>
)}

              {/* ARCHIVO */}
              <div>
                <label className="text-xs font-semibold text-surface-600">
                  Archivo {editingItem ? '(opcional: solo si quieres reemplazarlo)' : '*'}
                </label>

                {editingItem && editingItem.ruta_archivo && !archivoDocumento && (
                  <div className="mt-1 text-xs text-surface-500 bg-surface-50 border border-surface-100 rounded-xl px-3 py-2 flex items-center gap-2">
                    <Paperclip size={13} className="text-surface-400 shrink-0" />
                    Archivo actual adjunto. Selecciona uno nuevo abajo para reemplazarlo.
                  </div>
                )}

                <label className="mt-1 flex items-center gap-2 border border-dashed border-surface-300 rounded-xl px-3 py-3 cursor-pointer hover:border-brand-400 hover:bg-brand-50/30 transition-colors">
                  <Paperclip size={15} className="text-surface-400 shrink-0" />
                  <span className="text-xs text-surface-500 truncate flex-1">
                    {archivoDocumento
                      ? archivoDocumento.name
                      : editingItem
                      ? 'Seleccionar nuevo archivo (opcional)'
                      : 'Selecciona un archivo (PDF, imagen, Word, Excel)'}
                  </span>
                  <input
                    type="file"
                    accept={ACCEPTED_EXTENSIONS}
                    onChange={handleArchivoDocumentoChange}
                    className="hidden"
                  />
                </label>
                {archivoDocumento && (
                  <p className="text-[11px] text-surface-400 mt-1">
                    {(archivoDocumento.size / 1024).toFixed(0)} KB
                  </p>
                )}
                {archivoError && (
                  <p className="text-[11px] text-danger-500 mt-1">{archivoError}</p>
                )}
              </div>

              {/* ETIQUETAS */}
              <div>
                <label className="text-xs font-semibold text-surface-600">Etiquetas (Presiona Enter o Coma)</label>
                <div className="mt-1 border border-surface-200 rounded-xl p-2 bg-white flex flex-wrap items-center gap-1.5 focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-500">
                  {formDocumento.etiquetas.map((tag, idx) => (
                    <span
                      key={idx}
                      className="bg-brand-50 text-brand-700 text-xs px-2 py-0.5 rounded-md flex items-center gap-1 font-medium border border-brand-100"
                    >
                      <Tag size={12} />
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-brand-900 transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    placeholder={formDocumento.etiquetas.length === 0 ? "Escribe y presiona Enter..." : ""}
                    className="flex-1 bg-transparent text-xs border-none outline-none p-1 min-w-[120px]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModalDocumento(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-surface-600 hover:bg-surface-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingDocumento}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-brand-500 text-white hover:bg-brand-600 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {savingDocumento ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
      {showModalDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-modal border border-surface-100 space-y-4">
            <h3 className="text-base font-semibold text-surface-800">
              ¿Eliminar documento?
            </h3>
            <p className="text-xs text-surface-600">
              ¿Estás seguro de que deseas eliminar el documento{' '}
              <strong className="text-surface-800">{docToDelete?.nombre_docu}</strong>? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowModalDelete(false)
                  setDocToDelete(null)
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-surface-600 hover:bg-surface-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteDocumento}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-danger-500 text-white hover:bg-danger-600 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL VISTA PREVIA DE ARCHIVO */}
      {docPreview && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col shadow-modal border border-surface-100 overflow-hidden">
            <div className="flex justify-between items-center px-5 py-3 border-b border-surface-100 shrink-0">
              <p className="text-sm font-semibold text-surface-800 truncate">{docPreview.nombre}</p>
              <div className="flex items-center gap-3 shrink-0">
                <a
                  href={docPreview.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-surface-500 hover:text-surface-700 flex items-center gap-1"
                >
                  <ExternalLink size={13} /> Nueva pestaña
                </a>
                <a
                  href={`${docPreview.url}?download=1`}
                  className="text-xs font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1"
                >
                  <Download size={13} /> Descargar
                </a>
                <button
                  onClick={() => setDocPreview(null)}
                  className="text-surface-400 hover:text-surface-600 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden bg-surface-50">
              {IMAGE_EXTENSION_REGEX.test(docPreview.nombre) ? (
                <div className="w-full h-full flex items-center justify-center p-4">
                  <img
                    src={docPreview.url}
                    alt={docPreview.nombre}
                    className="max-w-full max-h-full object-contain rounded-lg"
                  />
                </div>
              ) : OFFICE_EXTENSION_REGEX.test(docPreview.nombre) ? (
                <iframe
                  src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(docPreview.url)}`}
                  title={docPreview.nombre}
                  className="w-full h-full border-0"
                />
              ) : (
                <iframe
                  src={docPreview.url}
                  title={docPreview.nombre}
                  className="w-full h-full border-0"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}