import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  FileText,
  Tag,
  Building2,
  Beaker,
  ShieldCheck,
  Mail,
  Phone,
  MapPin,
  Plus,
  X,
  Download,
  Paperclip,
  ExternalLink,
  Edit2,
  Trash2,
  Search
} from 'lucide-react'
import api from '../services/api'
import { EmptyState } from '../components/ui/EmptyState'

const MAX_FILE_SIZE_MB = 10
const ACCEPTED_EXTENSIONS = '.pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx'
const IMAGE_EXTENSION_REGEX = /\.(jpg|jpeg|png|gif|webp|bmp)$/i
const OFFICE_EXTENSION_REGEX = /\.(doc|docx|xls|xlsx|ppt|pptx)$/i

// Metadatos visuales por tipo de archivo: cada extensión recibe un color
// propio para que la grilla de documentos no se vea plana.
const FILE_TYPE_META = {
  pdf: { label: 'PDF', classes: 'bg-rose-50 text-rose-600 border-rose-200' },
  jpg: { label: 'IMG', classes: 'bg-violet-50 text-violet-600 border-violet-200' },
  jpeg: { label: 'IMG', classes: 'bg-violet-50 text-violet-600 border-violet-200' },
  png: { label: 'IMG', classes: 'bg-violet-50 text-violet-600 border-violet-200' },
  gif: { label: 'IMG', classes: 'bg-violet-50 text-violet-600 border-violet-200' },
  webp: { label: 'IMG', classes: 'bg-violet-50 text-violet-600 border-violet-200' },
  doc: { label: 'DOC', classes: 'bg-blue-50 text-blue-600 border-blue-200' },
  docx: { label: 'DOC', classes: 'bg-blue-50 text-blue-600 border-blue-200' },
  xls: { label: 'XLS', classes: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  xlsx: { label: 'XLS', classes: 'bg-emerald-50 text-emerald-600 border-emerald-200' }
}
const DEFAULT_FILE_META = { label: 'FILE', classes: 'bg-surface-100 text-surface-600 border-surface-200' }

function getFileMeta(nombre = '') {
  const ext = nombre.split('.').pop()?.toLowerCase()
  return FILE_TYPE_META[ext] || DEFAULT_FILE_META
}

export default function ProductoDetalleView() {
  const { id: productoId } = useParams()
  const navigate = useNavigate()

  const [producto, setProducto] = useState(null)
  const [documentos, setDocumentos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Estados para el modal de documentos y formulario
  const [showModalDocumento, setShowModalDocumento] = useState(false)
  const [editingItem, setEditingItem] = useState(null) // null = Crear, doc = Editar
  const [tagInput, setTagInput] = useState('')
  const [formDocumento, setFormDocumento] = useState({
    nombre_docu: '',
    etiquetas: [],
    archivo: null
  })
  const [fileError, setFileError] = useState('')
  const [saving, setSaving] = useState(false)

  /* ── Estados para Modal de Eliminación de Documento ──────── */
  const [showModalDelete, setShowModalDelete] = useState(false)
  const [docToDelete, setDocToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Estado para el modal de vista previa de archivo
  const [docPreview, setDocPreview] = useState(null) // { id, nombre, url }

  /* ── Buscador de Documentos ───────────────────────────────── */
  const [busquedaDoc, setBusquedaDoc] = useState('')

  // Cambia a `true` si prefieres que el clic abra directo en pestaña nueva
  const ABRIR_EN_PESTANA_NUEVA = false

  /* ── Cargar Producto en el Detalle ───────────────────────── */
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      let prodData = null

      // 1. Intentar traerlo directamente de /productos/6
      try {
        const resSingleProd = await api.get(`/productos/${productoId}`)
        prodData = resSingleProd.data
      } catch (singleErr) {
        console.warn('Endpoint /productos/id no disponible, buscando en lista completa...', singleErr)

        // 2. Fallback: pedir lista sin limite
        const resProd = await api.get('/productos', { params: { limit: 10000, skip: 0 } })

        let productosArray = []
        if (Array.isArray(resProd.data)) {
          productosArray = resProd.data
        } else if (Array.isArray(resProd.data?.items)) {
          productosArray = resProd.data.items
        }

        // Importante: String() para comparar "6" con 6 sin problemas de tipo
        prodData = productosArray.find((p) => String(p.id) === String(productoId))
      }

      setProducto(prodData || null)

      // Cargar documentos
      const resDoc = await api.get('/documentos/')
      const docs = Array.isArray(resDoc.data) ? resDoc.data : (resDoc.data?.items || [])
      setDocumentos(docs)

    } catch (err) {
      console.error(err)
      setError(err.response?.data?.detail || 'Error al cargar la información')
    } finally {
      setLoading(false)
    }
  }, [productoId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const documentosDelProducto = useMemo(() => {
    if (!Array.isArray(documentos)) return []
    return documentos.filter((doc) => {
      const prodId = doc.producto_id ?? doc.producto?.id
      return String(prodId) === String(productoId)
    })
  }, [documentos, productoId])

  /* ── Documentos filtrados por el buscador (nombre o etiquetas) ────── */
  const documentosFiltrados = useMemo(() => {
    const q = busquedaDoc.trim().toLowerCase()
    if (!q) return documentosDelProducto

    return documentosDelProducto.filter((doc) => {
      const coincideNombre = (doc.nombre_docu || '').toLowerCase().includes(q)
      const coincideEtiqueta = Array.isArray(doc.etiquetas)
        ? doc.etiquetas.some((tag) => String(tag).toLowerCase().includes(q))
        : false
      return coincideNombre || coincideEtiqueta
    })
  }, [documentosDelProducto, busquedaDoc])

  /* ── Manejo de Etiquetas ── */
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

  /* ── Manejo de Archivo ── */
  const handleFileChange = (e) => {
    const file = e.target.files[0]
    setFileError('')

    if (!file) {
      setFormDocumento((prev) => ({ ...prev, archivo: null }))
      return
    }

    const sizeMB = file.size / (1024 * 1024)
    if (sizeMB > MAX_FILE_SIZE_MB) {
      setFileError(`El archivo supera el límite de ${MAX_FILE_SIZE_MB}MB.`)
      e.target.value = ''
      setFormDocumento((prev) => ({ ...prev, archivo: null }))
      return
    }

    setFormDocumento((prev) => ({ ...prev, archivo: file }))
  }

  /* ── Abrir y Guardar Modal ── */
  const handleOpenModal = (doc = null) => {
    if (doc) {
      setEditingItem(doc)
      setFormDocumento({
        nombre_docu: doc.nombre_docu || doc.nombre || '',
        etiquetas: doc.etiquetas || [],
        archivo: null
      })
    } else {
      setEditingItem(null)
      setFormDocumento({
        nombre_docu: '',
        etiquetas: [],
        archivo: null
      })
    }
    setTagInput('')
    setFileError('')
    setShowModalDocumento(true)
  }

  const handleSaveDocumento = async (e) => {
    e.preventDefault()

    // Al crear, el archivo es obligatorio. Al editar, es opcional.
    if (!editingItem && !formDocumento.archivo) {
      setFileError('Debes adjuntar un archivo.')
      return
    }

    setSaving(true)
    try {
      const data = new FormData()
      data.append('nombre_docu', formDocumento.nombre_docu)
      data.append('etiquetas', JSON.stringify(formDocumento.etiquetas))
      data.append('producto_id', productoId)
      if (formDocumento.archivo) {
        data.append('archivo', formDocumento.archivo)
      }

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
      setSaving(false)
    }
  }

  /* ── Modal y Acción de Eliminar Documento ────────────────── */
  const handleOpenDeleteModal = (doc) => {
    setDocToDelete(doc)
    setShowModalDelete(true)
  }

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

  /* ── Vista Previa de Archivo ── */
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

  if (loading && !producto) {
    return <div className="p-8 text-center text-surface-500 text-sm">Cargando producto...</div>
  }

  if (error) {
    return <div className="p-8 text-center text-danger-500 text-sm">{error}</div>
  }

  if (!producto) {
    return <div className="p-8 text-center text-surface-500 text-sm">Producto no encontrado.</div>
  }

  const proveedor = producto.proveedor

  return (
    <div className="space-y-5">
      {/* ENCABEZADO CON ACENTO DE MARCA */}
      <div className="relative overflow-hidden rounded-2xl border border-surface-100 bg-white p-6 shadow-sm">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-[#22D3EE]" />

        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate('/productos')}
            className="p-2 rounded-xl text-surface-500 hover:text-surface-800 hover:bg-surface-100 transition-colors mt-0.5"
            title="Volver a productos"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="hidden sm:flex h-12 w-12 shrink-0 rounded-2xl bg-[#0B1220] items-center justify-center shadow-sm">
            <Beaker size={22} className="text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-xl font-bold text-surface-800">{producto.nombre}</h2>
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold tracking-wide ${
                  producto.estado === 'INACTIVO'
                    ? 'bg-danger-50 text-danger-600 border border-danger-200'
                    : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                }`}
              >
                {producto.estado || 'ACTIVO'}
              </span>
            </div>

            {/* Metadatos con título propio, no simples etiquetas */}
            <div className="mt-3 flex flex-wrap items-start gap-x-6 gap-y-2.5">
              <div className="flex flex-col gap-0.5">
                <span className="flex items-center gap-1 text-[10px] font-semibold text-surface-400 uppercase tracking-wide">
                  <Tag size={11} className="text-[#22D3EE]" />
                  Código
                </span>
                <span className="text-xs font-mono text-surface-700">{producto.codigo}</span>
              </div>

              {producto.laboratorio && (
                <div className="flex flex-col gap-0.5 border-l border-surface-200 pl-6">
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-surface-400 uppercase tracking-wide">
                    <Beaker size={11} className="text-[#22D3EE]" />
                    Laboratorio
                  </span>
                  <span className="text-xs text-surface-700">{producto.laboratorio}</span>
                </div>
              )}

              {producto.registro_sanitario && (
                <div className="flex flex-col gap-0.5 border-l border-surface-200 pl-6">
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-surface-400 uppercase tracking-wide">
                    <ShieldCheck size={11} className="text-[#22D3EE]" />
                    Reg. Sanitario
                  </span>
                  <span className="text-xs font-mono text-surface-700">{producto.registro_sanitario}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CUERPO: PROVEEDOR (sidebar) + DOCUMENTOS (panel principal) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* PROVEEDOR ASIGNADO */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-surface-100 shadow-sm p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <span className="flex items-center justify-center h-8 w-8 rounded-xl bg-[#0B1220] text-[#22D3EE]">
              <Building2 size={16} />
            </span>
            <h3 className="text-sm font-semibold text-surface-800">Proveedor Asignado</h3>
          </div>

          {proveedor ? (
            <div className="flex-1 flex flex-col">
              <div className="rounded-xl bg-surface-50 border border-surface-100 p-4">
                <p className="text-sm font-bold text-surface-800">{proveedor.nombre}</p>
                {proveedor.identificacion && (
                  <span className="inline-block mt-1.5 text-[11px] font-mono text-surface-500 bg-white border border-surface-200 rounded-md px-2 py-0.5">
                    NIT / ID: {proveedor.identificacion}
                  </span>
                )}
              </div>

              <div className="mt-4 space-y-3">
                {proveedor.correo && (
                  <div className="flex items-center gap-2.5">
                    <span className="flex items-center justify-center h-7 w-7 rounded-lg bg-blue-50 text-blue-500 shrink-0">
                      <Mail size={13} />
                    </span>
                    <span className="text-xs text-surface-700 truncate">{proveedor.correo}</span>
                  </div>
                )}
                {proveedor.telefono && (
                  <div className="flex items-center gap-2.5">
                    <span className="flex items-center justify-center h-7 w-7 rounded-lg bg-emerald-50 text-emerald-500 shrink-0">
                      <Phone size={13} />
                    </span>
                    <span className="text-xs text-surface-700">{proveedor.telefono}</span>
                  </div>
                )}
                {proveedor.direccion && (
                  <div className="flex items-center gap-2.5">
                    <span className="flex items-center justify-center h-7 w-7 rounded-lg bg-amber-50 text-amber-500 shrink-0">
                      <MapPin size={13} />
                    </span>
                    <span className="text-xs text-surface-700 truncate">{proveedor.direccion}</span>
                  </div>
                )}
              </div>

              {proveedor.id && (
                <button
                  onClick={() => navigate(`/proveedores/${proveedor.id}`)}
                  className="mt-5 w-full text-center bg-[#0B1220] hover:bg-[#16233A] text-[#5EEAF5] text-xs font-semibold px-3 py-2.5 rounded-xl transition-colors"
                >
                  Ver Detalle del Proveedor →
                </button>
              )}
            </div>
          ) : (
            <EmptyState message="Este producto no tiene un proveedor asociado." />
          )}
        </div>

        {/* DOCUMENTOS ASIGNADOS */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-surface-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center h-8 w-8 rounded-xl bg-[#0B1220] text-[#22D3EE]">
                <FileText size={16} />
              </span>
              <h3 className="text-sm font-semibold text-surface-800">
                Documentos asignados ({documentosFiltrados.length})
              </h3>
            </div>

            <button
              onClick={() => handleOpenModal()}
              className="bg-[#0B1220] hover:bg-[#16233A] text-[#22D3EE] text-xs font-medium px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus size={14} /> Nuevo Documento
            </button>
          </div>

          {/* BUSCADOR DE DOCUMENTOS */}
          {documentosDelProducto.length > 0 && (
            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
              <input
                type="text"
                value={busquedaDoc}
                onChange={(e) => setBusquedaDoc(e.target.value)}
                placeholder="Buscar por nombre o etiqueta..."
                className="input-base w-full pl-9 pr-8 text-xs"
              />
              {busquedaDoc && (
                <button
                  type="button"
                  onClick={() => setBusquedaDoc('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 transition-colors"
                  title="Limpiar búsqueda"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          )}

          {documentosDelProducto.length === 0 ? (
            <EmptyState message="Este producto no tiene documentos asignados." />
          ) : documentosFiltrados.length === 0 ? (
            <EmptyState message="Ningún documento coincide con la búsqueda." />
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {documentosFiltrados.map((doc) => {
                const fileMeta = getFileMeta(doc.nombre_docu)
                return (
                  <div
                    key={doc.id}
                    className="group relative rounded-xl border border-surface-100 bg-surface-50/70 hover:bg-white hover:border-brand-200 hover:shadow-sm transition-all p-3.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenPreview(doc)}
                        disabled={!doc.ruta_archivo}
                        className="flex items-start gap-3 min-w-0 text-left flex-1 disabled:cursor-not-allowed"
                        title={doc.ruta_archivo ? 'Ver archivo' : 'Sin archivo adjunto'}
                      >
                        <span className={`shrink-0 h-10 w-10 rounded-lg border flex items-center justify-center text-[10px] font-bold ${fileMeta.classes}`}>
                          {fileMeta.label}
                        </span>
                        <span className="min-w-0">
                          <span
                            className={`block text-xs font-semibold break-words ${
                              doc.ruta_archivo ? 'text-surface-800 group-hover:text-brand-600' : 'text-surface-500'
                            }`}
                            title={doc.nombre_docu}
                          >
                            {doc.nombre_docu}
                          </span>
                          {Array.isArray(doc.etiquetas) && doc.etiquetas.length > 0 && (
                            <span className="mt-1.5 flex flex-wrap gap-1">
                              {doc.etiquetas.map((tag, idx) => (
                                <span
                                  key={idx}
                                  className="bg-brand-50 text-brand-700 text-[10px] px-1.5 py-0.5 rounded-md flex items-center gap-1 font-medium border border-brand-100"
                                >
                                  <Tag size={9} />
                                  {tag}
                                </span>
                              ))}
                            </span>
                          )}
                        </span>
                      </button>

                      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenModal(doc)}
                          className="p-1.5 text-surface-400 hover:text-brand-500 hover:bg-white rounded-lg transition-colors"
                          title="Editar documento"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleOpenDeleteModal(doc)}
                          className="p-1.5 text-surface-400 hover:text-danger-500 hover:bg-white rounded-lg transition-colors"
                          title="Eliminar documento"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* MODAL CREAR / EDITAR DOCUMENTO */}
      {showModalDocumento && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-modal border border-surface-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-semibold text-surface-800">
                {editingItem ? 'Editar Documento' : `Nuevo Documento para ${producto.nombre}`}
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
                <label className="text-xs font-semibold text-surface-600">Nombre del Documento *</label>
                <input
                  type="text"
                  required
                  value={formDocumento.nombre_docu}
                  onChange={(e) => setFormDocumento({ ...formDocumento, nombre_docu: e.target.value })}
                  placeholder="Ej. Registro_Sanitario_2026.pdf"
                  className="input-base w-full mt-1"
                />
              </div>

              {/* ARCHIVO */}
              <div>
                <label className="text-xs font-semibold text-surface-600">
                  Archivo {editingItem ? '(opcional: solo para reemplazar)' : '*'}
                </label>

                {editingItem && editingItem.ruta_archivo && !formDocumento.archivo && (
                  <div className="mt-1 text-xs text-surface-500 bg-surface-50 border border-surface-100 rounded-xl px-3 py-2 flex items-center gap-2">
                    <Paperclip size={13} className="text-surface-400 shrink-0" />
                    Archivo actual adjunto. Selecciona uno nuevo abajo para reemplazarlo.
                  </div>
                )}

                <label className="mt-1 flex items-center gap-2 border border-dashed border-surface-300 rounded-xl px-3 py-3 cursor-pointer hover:border-brand-400 hover:bg-brand-50/30 transition-colors">
                  <Paperclip size={15} className="text-surface-400 shrink-0" />
                  <span className="text-xs text-surface-500 truncate flex-1">
                    {formDocumento.archivo
                      ? formDocumento.archivo.name
                      : editingItem
                      ? 'Seleccionar nuevo archivo (opcional)'
                      : 'Selecciona un archivo (PDF, imagen, Word, Excel)'}
                  </span>
                  <input
                    type="file"
                    accept={ACCEPTED_EXTENSIONS}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                {formDocumento.archivo && (
                  <p className="text-[11px] text-surface-400 mt-1">
                    {(formDocumento.archivo.size / 1024).toFixed(0)} KB
                  </p>
                )}
                {fileError && (
                  <p className="text-[11px] text-danger-500 mt-1">{fileError}</p>
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
                  disabled={saving}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-brand-500 text-white hover:bg-brand-600 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saving ? 'Guardando...' : 'Guardar'}
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
                onClick={() => setShowModalDelete(false)}
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