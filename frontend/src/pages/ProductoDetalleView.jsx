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
  ExternalLink
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
  const [tagInput, setTagInput] = useState('')
  const [formDocumento, setFormDocumento] = useState({
    nombre_docu: '',
    etiquetas: [],
    archivo: null
  })
  const [fileError, setFileError] = useState('')
  const [saving, setSaving] = useState(false)

  // 2. Estado para el modal de vista previa de archivo
  const [docPreview, setDocPreview] = useState(null) // { id, nombre, url }

  // Cambia a `true` si prefieres que el clic abra directo en pestaña nueva
  // en vez de mostrar el modal con iframe.
  const ABRIR_EN_PESTANA_NUEVA = false

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [resProd, resDoc] = await Promise.all([
        api.get('/productos'),
        api.get('/documentos/')
      ])

      const productosArray = Array.isArray(resProd.data) ? resProd.data : (resProd.data?.data || [])
      const documentosArray = Array.isArray(resDoc.data) ? resDoc.data : (resDoc.data?.data || [])

      const encontrado = productosArray.find((p) => String(p.id) === String(productoId))
      
      setProducto(encontrado || null)
      setDocumentos(documentosArray)
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al cargar el detalle del producto')
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
  const handleOpenModal = () => {
    setFormDocumento({
      nombre_docu: '',
      etiquetas: [],
      archivo: null
    })
    setTagInput('')
    setFileError('')
    setShowModalDocumento(true)
  }

  const handleSaveDocumento = async (e) => {
    e.preventDefault()

    if (!formDocumento.archivo) {
      setFileError('Debes adjuntar un archivo.')
      return
    }

    setSaving(true)
    try {
      const data = new FormData()
      data.append('nombre_docu', formDocumento.nombre_docu)
      data.append('etiquetas', JSON.stringify(formDocumento.etiquetas))
      data.append('producto_id', productoId)
      data.append('archivo', formDocumento.archivo)

      await api.post('/documentos/', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setShowModalDocumento(false)
      fetchData()
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al guardar el documento')
    } finally {
      setSaving(false)
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
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate('/productos')}
            className="p-2 rounded-xl text-surface-500 hover:text-surface-800 hover:bg-surface-100 transition-colors mt-0.5"
            title="Volver a productos"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
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
            <p className="text-xs font-mono text-surface-500 mt-0.5">Código: {producto.codigo}</p>

            <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-xs text-surface-600">
              {producto.laboratorio && (
                <span className="flex items-center gap-1.5">
                  <Beaker size={13} className="text-surface-400" />
                  Laboratorio: <strong className="font-medium text-surface-700">{producto.laboratorio}</strong>
                </span>
              )}
              {producto.registro_sanitario && (
                <span className="flex items-center gap-1.5 font-mono">
                  <ShieldCheck size={13} className="text-surface-400" />
                  Reg. Sanitario: {producto.registro_sanitario}
                </span>
              )}
            </div>
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
          <div className="border border-surface-100 rounded-xl p-4 bg-surface-50 space-y-2">
            <div>
              <p className="text-xs font-semibold text-surface-800">{proveedor.nombre}</p>
              {proveedor.identificacion && (
                <p className="text-[11px] font-mono text-surface-500">NIT / ID: {proveedor.identificacion}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs text-surface-600 border-t border-surface-200/60">
              {proveedor.correo && (
                <span className="flex items-center gap-1.5">
                  <Mail size={13} className="text-surface-400" /> {proveedor.correo}
                </span>
              )}
              {proveedor.telefono && (
                <span className="flex items-center gap-1.5">
                  <Phone size={13} className="text-surface-400" /> {proveedor.telefono}
                </span>
              )}
              {proveedor.direccion && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={13} className="text-surface-400" /> {proveedor.direccion}
                </span>
              )}
            </div>
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
            onClick={handleOpenModal}
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

                {Array.isArray(doc.etiquetas) && doc.etiquetas.length > 0 && (
                  <div className="flex flex-wrap gap-1 shrink-0">
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
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* MODAL CREAR DOCUMENTO */}
      {showModalDocumento && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-modal border border-surface-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-semibold text-surface-800">
                Nuevo Documento para {producto.nombre}
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
                <label className="text-xs font-semibold text-surface-600">Archivo *</label>
                <label className="mt-1 flex items-center gap-2 border border-dashed border-surface-300 rounded-xl px-3 py-3 cursor-pointer hover:border-brand-400 hover:bg-brand-50/30 transition-colors">
                  <Paperclip size={15} className="text-surface-400 shrink-0" />
                  <span className="text-xs text-surface-500 truncate flex-1">
                    {formDocumento.archivo ? formDocumento.archivo.name : 'Selecciona un archivo (PDF, imagen, Word, Excel)'}
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