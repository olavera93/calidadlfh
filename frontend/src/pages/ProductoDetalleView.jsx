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
  ChevronDown
} from 'lucide-react'
import api from '../services/api'
import { EmptyState } from '../components/ui/EmptyState'

const MAX_FILE_SIZE_MB = 10
const ACCEPTED_EXTENSIONS = '.pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx'
const IMAGE_EXTENSION_REGEX = /\.(jpg|jpeg|png|gif|webp|bmp)$/i
const OFFICE_EXTENSION_REGEX = /\.(doc|docx|xls|xlsx|ppt|pptx)$/i

export default function ProductoDetalleView() {
  const { id: productoId } = useParams()
  const navigate = useNavigate()

  const [producto, setProducto] = useState(null)
  const [documentos, setDocumentos] = useState([])
  const [loading, setLoading] = useState(true) 
  const [error, setError] = useState('')

  // 1. Estados para el modal de documentos y formulario
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

  // 2. Estado para el modal de vista previa de archivo
  const [docPreview, setDocPreview] = useState(null) // { id, nombre, url }

  /* ── Estados para los desplegables de metadatos ──────────── */
  const [showDetalles, setShowDetalles] = useState(false)
  const [showProveedorDetalle, setShowProveedorDetalle] = useState(false)

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
    <div className="space-y-6">
      {/* ENCABEZADO Y DATOS CLAVE DEL PRODUCTO */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <button
            onClick={() => navigate('/productos')}
            className="p-2 rounded-xl text-surface-500 hover:text-surface-800 hover:bg-surface-100 transition-colors mt-0.5"
            title="Volver a productos"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="flex-1">
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-semibold text-surface-800">{producto.nombre}</h2>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                  producto.estado === 'INACTIVO'
                    ? 'bg-danger-50 text-danger-600 border border-danger-200'
                    : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                }`}
              >
                {producto.estado || 'ACTIVO'}
              </span>
            </div>

            {/* Resumen compacto + botón para expandir */}
            <button
              onClick={() => setShowDetalles((prev) => !prev)}
              className="mt-1.5 flex items-center gap-1.5 text-xs text-surface-500 hover:text-surface-700 transition-colors"
            >
              <span className="font-mono">{producto.codigo}</span>
              {producto.laboratorio && (
                <>
                  <span className="text-surface-300">·</span>
                  <span>{producto.laboratorio}</span>
                </>
              )}
              <ChevronDown
                size={13}
                className={`transition-transform ${showDetalles ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Grid de metadatos: solo visible al expandir */}
            {showDetalles && (
              <div className="grid grid-cols-3 gap-x-6 gap-y-2 mt-3 max-w-lg">
                <div>
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-surface-400 uppercase tracking-wide">
                    <Tag size={11} /> Código
                  </span>
                  <span className="text-xs font-mono text-surface-700">{producto.codigo}</span>
                </div>

                {producto.laboratorio && (
                  <div>
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-surface-400 uppercase tracking-wide">
                      <Beaker size={11} /> Laboratorio
                    </span>
                    <span className="text-xs text-surface-700">{producto.laboratorio}</span>
                  </div>
                )}

                {producto.registro_sanitario && (
                  <div>
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-surface-400 uppercase tracking-wide">
                      <ShieldCheck size={11} /> Reg. Sanitario
                    </span>
                    <span className="text-xs font-mono text-surface-700">{producto.registro_sanitario}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* INFORMACIÓN DEL PROVEEDOR */}
      <div className="bg-white rounded-2xl border border-surface-100 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-brand-500" />
            <h3 className="text-sm font-semibold text-surface-800">Proveedor Asignado</h3>
          </div>
          {proveedor?.id && (
            <button
              onClick={() => navigate(`/proveedores/${proveedor.id}`)}
              className="text-xs font-medium text-brand-500 hover:text-brand-600 transition-colors"
            >
              Ver Detalle del Proveedor →
            </button>
          )}
        </div>

        {proveedor ? (
          <div className="border border-surface-100 rounded-xl bg-surface-50 overflow-hidden">
            {/* Fila resumen, siempre visible, clickeable */}
            <button
              onClick={() => setShowProveedorDetalle((prev) => !prev)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-surface-100/60 transition-colors"
            >
              <div>
                <span className="text-xs font-semibold text-surface-800 block">{proveedor.nombre}</span>
                {proveedor.identificacion && (
                  <span className="text-[11px] font-mono text-surface-500">NIT / ID: {proveedor.identificacion}</span>
                )}
              </div>
              <ChevronDown
                size={15}
                className={`text-surface-400 shrink-0 transition-transform ${showProveedorDetalle ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Detalle expandido */}
            {showProveedorDetalle && (
              <div className="grid grid-cols-3 gap-3 px-4 pb-4 pt-1 border-t border-surface-200/60">
                {proveedor.correo && (
                  <div>
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-surface-400 uppercase tracking-wide">
                      <Mail size={11} /> Correo
                    </span>
                    <span className="text-xs text-surface-700 truncate block">{proveedor.correo}</span>
                  </div>
                )}
                {proveedor.telefono && (
                  <div>
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-surface-400 uppercase tracking-wide">
                      <Phone size={11} /> Teléfono
                    </span>
                    <span className="text-xs text-surface-700">{proveedor.telefono}</span>
                  </div>
                )}
                {proveedor.direccion && (
                  <div>
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-surface-400 uppercase tracking-wide">
                      <MapPin size={11} /> Dirección
                    </span>
                    <span className="text-xs text-surface-700 truncate block">{proveedor.direccion}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <EmptyState message="Este producto no tiene un proveedor asociado." />
        )}
      </div>

      {/* DOCUMENTOS ASIGNADOS */}
      <div className="bg-white rounded-2xl border border-surface-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-brand-500" />
            <h3 className="text-sm font-semibold text-surface-800">
              Documentos asignados ({documentosDelProducto.length})
            </h3>
          </div>

          <button
            onClick={() => handleOpenModal()}
            className="bg-brand-500 hover:bg-brand-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} /> Nuevo Documento
          </button>
        </div>

        {documentosDelProducto.length === 0 ? (
          <EmptyState message="Este producto no tiene documentos asignados." />
        ) : (
          <ul className="divide-y divide-surface-100">
            {documentosDelProducto.map((doc) => (
              <li key={doc.id} className="py-2.5 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => handleOpenPreview(doc)}
                  disabled={!doc.ruta_archivo}
                  className="flex items-center gap-2 min-w-0 text-left group disabled:cursor-not-allowed"
                  title={doc.ruta_archivo ? 'Ver archivo' : 'Sin archivo adjunto'}
                >
                  <FileText
                    size={14}
                    className={`shrink-0 ${doc.ruta_archivo ? 'text-brand-400 group-hover:text-brand-600' : 'text-surface-300'}`}
                  />
                  <div className="min-w-0">
                    <p
                      className={`text-xs font-medium truncate ${
                        doc.ruta_archivo ? 'text-surface-800 group-hover:text-brand-600 group-hover:underline' : 'text-surface-500'
                      }`}
                    >
                      {doc.nombre_docu}
                    </p>
                  </div>
                </button>

                <div className="flex items-center gap-3 shrink-0">
                  {Array.isArray(doc.etiquetas) && doc.etiquetas.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {doc.etiquetas.map((tag, idx) => (
                        <span
                          key={idx}
                          className="bg-brand-50 text-brand-700 text-[10px] px-1.5 py-0.5 rounded-md flex items-center gap-1 font-medium border border-brand-100"
                        >
                          <Tag size={10} />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-1 border-l border-surface-200 pl-2">
                    <button
                      onClick={() => handleOpenModal(doc)}
                      className="p-1 text-surface-400 hover:text-brand-500 transition-colors"
                      title="Editar documento"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleOpenDeleteModal(doc)}
                      className="p-1 text-surface-400 hover:text-danger-500 transition-colors"
                      title="Eliminar documento"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
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