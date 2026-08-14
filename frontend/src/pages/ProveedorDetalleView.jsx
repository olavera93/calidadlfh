import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Beaker, Package, FileText, Tag, Mail, Phone, MapPin,
  Plus, X, Download, Paperclip, ExternalLink, Edit2, Trash2
} from 'lucide-react'
import api from '../services/api'
import { EmptyState } from '../components/ui/EmptyState'

/**
 * Vista de detalle de un Proveedor. Ruta esperada: /proveedores/:id
 *
 * Muestra:
 *  - Datos de contacto del proveedor
 *  - Laboratorios que maneja (derivados de sus productos) y los productos de cada uno
 *  - Documentos asignados al proveedor (directos o a través de sus productos)
 *  - Modal para crear / editar un documento asociado directamente al proveedor, con archivo adjunto
 *  - Modal de confirmación para eliminar documento
 *  - Modal para previsualizar el archivo de un documento antes de descargarlo
 */

const MAX_FILE_SIZE_MB = 10
const ACCEPTED_EXTENSIONS = '.pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx'
const IMAGE_EXTENSION_REGEX = /\.(jpg|jpeg|png|gif|webp)$/i
const OFFICE_EXTENSION_REGEX = /\.(doc|docx|xls|xlsx|ppt|pptx)$/i

export default function ProveedorDetalleView() {
  const { id: proveedorId } = useParams()
  const navigate = useNavigate()

  const [proveedor, setProveedor] = useState(null)
  const [productos, setProductos] = useState([])
  const [documentos, setDocumentos] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  /* ── Estados para el Modal de Crear/Editar Documento ─────── */
  const [showModalDocumento, setShowModalDocumento] = useState(false)
  const [editingDocId, setEditingDocId] = useState(null) // null = Crear, ID = Editar
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

  /* ── Estado para el Modal de Vista Previa de Archivo ─────── */
  const [docPreview, setDocPreview] = useState(null) // { id, nombre, url }

  /* ── Cargar datos ─────────────────────────────────────────── */
const fetchData = useCallback(async () => {
  setLoading(true)
  setError('')
  try {
    const [resProd, resDoc, resProv] = await Promise.all([
      api.get('/productos', { params: { proveedor_id: proveedorId, limit: 1000 } }), // 👈 filtra en el backend
      api.get('/documentos/'),
      api.get('/proveedores')
    ])

    // 👇 el backend devuelve { items, total }
    const productosArray = Array.isArray(resProd.data)
      ? resProd.data
      : (resProd.data?.items || resProd.data?.data || [])

    const documentosArray = Array.isArray(resDoc.data) ? resDoc.data : (resDoc.data?.data || [])
    const proveedoresArray = Array.isArray(resProv.data) ? resProv.data : (resProv.data?.data || [])

    setProductos(productosArray)
    setDocumentos(documentosArray)

    const encontrado = proveedoresArray.find((p) => String(p.id) === String(proveedorId))
    setProveedor(encontrado || null)
  } catch (err) {
    setError(err.response?.data?.detail || 'Error al cargar el detalle del proveedor')
  } finally {
    setLoading(false)
  }
}, [proveedorId])
  useEffect(() => {
    fetchData()
  }, [fetchData])

  /* ── Productos de este proveedor, agrupados por laboratorio ── */
  const laboratorios = useMemo(() => {
    const productosDelProveedor = productos.filter(
      (p) => String(p.proveedor_id ?? p.proveedor?.id) === String(proveedorId)
    )

    const grupos = new Map()
    productosDelProveedor.forEach((p) => {
      const labKey = p.laboratorio?.trim() || 'Sin laboratorio'
      if (!grupos.has(labKey)) grupos.set(labKey, [])
      grupos.get(labKey).push(p)
    })

    return Array.from(grupos.entries())
      .map(([nombre, items]) => ({ nombre, productos: items }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [productos, proveedorId])

  /* ── Documentos asignados a este proveedor (directo o vía producto) ── */
  const documentosDelProveedor = useMemo(() => {
    return documentos.filter((doc) => {
      const provDirecto = doc.proveedor_id ?? doc.proveedor?.id
      const provViaProducto = doc.producto?.proveedor_id ?? doc.producto?.proveedor?.id
      return (
        String(provDirecto) === String(proveedorId) ||
        String(provViaProducto) === String(proveedorId)
      )
    })
  }, [documentos, proveedorId])

  /* ── Manejo de Etiquetas ─────────────────────────────────── */
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

  /* ── Manejo de Archivo ────────────────────────────────────── */
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

  /* ── Abrir Modal Crear Documento ─────────────────────────── */
  const handleOpenCreateModal = () => {
    setEditingDocId(null)
    setFormDocumento({
      nombre_docu: '',
      etiquetas: [],
      archivo: null
    })
    setTagInput('')
    setFileError('')
    setShowModalDocumento(true)
  }

  /* ── Abrir Modal Editar Documento ────────────────────────── */
  const handleOpenEditModal = (doc) => {
    setEditingDocId(doc.id)
    setFormDocumento({
      nombre_docu: doc.nombre_docu || '',
      etiquetas: Array.isArray(doc.etiquetas) ? [...doc.etiquetas] : [],
      archivo: null // El archivo es opcional en edición
    })
    setTagInput('')
    setFileError('')
    setShowModalDocumento(true)
  }

  /* ── Guardar Documento (Crear o Editar) ──────────────────── */
  const handleSaveDocumento = async (e) => {
    e.preventDefault()

    // Para creación es obligatorio el archivo. En edición es opcional.
    if (!editingDocId && !formDocumento.archivo) {
      setFileError('Debes adjuntar un archivo.')
      return
    }

    setSaving(true)
    try {
      const data = new FormData()
      data.append('nombre_docu', formDocumento.nombre_docu)
      data.append('etiquetas', JSON.stringify(formDocumento.etiquetas))
      data.append('proveedor_id', proveedorId)

      if (formDocumento.archivo) {
        data.append('archivo', formDocumento.archivo)
      }

      if (editingDocId) {
        // Petición de Edición (Ajusta a PUT o PATCH según el endpoint de tu backend)
        await api.put(`/documentos/${editingDocId}`, data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      } else {
        // Petición de Creación
        await api.post('/documentos/', data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      }

      setShowModalDocumento(false)
      fetchData() // Recarga los documentos actualizados
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
      fetchData() // Recarga lista tras eliminar
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al eliminar el documento')
    } finally {
      setDeleting(false)
    }
  }

  /* ── Vista Previa de Archivo ─────────────────────────────── */
  const ABRIR_EN_PESTANA_NUEVA = false

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

  if (loading && !proveedor) {
    return <div className="p-8 text-center text-surface-500 text-sm">Cargando proveedor...</div>
  }

  if (error) {
    return <div className="p-8 text-center text-danger-500 text-sm">{error}</div>
  }

  if (!proveedor) {
    return <div className="p-8 text-center text-surface-500 text-sm">Proveedor no encontrado.</div>
  }

  return (
    <div className="space-y-6">
      {/* ENCABEZADO */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <button
            onClick={() => navigate('/proveedores')}
            className="p-2 rounded-xl text-surface-500 hover:text-surface-800 hover:bg-surface-100 transition-colors mt-0.5"
            title="Volver a proveedores"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="flex-1">
            <h2 className="text-lg font-semibold text-surface-800">{proveedor.nombre}</h2>

            {/* Grid de metadatos: etiqueta arriba, valor abajo */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 mt-3 max-w-2xl">
              {proveedor.identificacion && (
                <div>
                  <span className="block text-[10px] font-semibold text-surface-400 uppercase tracking-wide">
                    NIT / ID
                  </span>
                  <span className="text-xs font-mono text-surface-700">{proveedor.identificacion}</span>
                </div>
              )}

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
          </div>
        </div>
      </div>

      {/* LABORATORIOS Y PRODUCTOS */}
      <div className="bg-white rounded-2xl border border-surface-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Beaker size={16} className="text-brand-500" />
          <h3 className="text-sm font-semibold text-surface-800">
            Laboratorios y productos ({laboratorios.length})
          </h3>
        </div>

        {laboratorios.length === 0 ? (
          <EmptyState message="Este proveedor no tiene productos registrados." />
        ) : (
          <div className="space-y-4">
            {laboratorios.map((lab) => (
              <div key={lab.nombre} className="border border-surface-100 rounded-xl overflow-hidden">
                <div className="bg-surface-50 px-4 py-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-surface-700">{lab.nombre}</span>
                  <span className="text-[11px] text-surface-400">{lab.productos.length} producto(s)</span>
                </div>
                <ul className="divide-y divide-surface-100">
                  {lab.productos.map((p) => (
                    <li key={p.id} className="px-4 py-2 flex items-center gap-2 text-xs text-surface-700">
                      <Package size={13} className="text-surface-400 shrink-0" />
                      <span className="font-mono text-surface-500">{p.codigo}</span>
                      <span>{p.nombre}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* DOCUMENTOS ASIGNADOS */}
      <div className="bg-white rounded-2xl border border-surface-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-brand-500" />
            <h3 className="text-sm font-semibold text-surface-800">
              Documentos asignados ({documentosDelProveedor.length})
            </h3>
          </div>

          <button
            onClick={handleOpenCreateModal}
            className="bg-brand-500 hover:bg-brand-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} /> Nuevo Documento
          </button>
        </div>

        {documentosDelProveedor.length === 0 ? (
          <EmptyState message="Este proveedor no tiene documentos asignados." />
        ) : (
          <ul className="divide-y divide-surface-100">
            {documentosDelProveedor.map((doc) => (
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
                    {doc.producto && (
                      <p className="text-[11px] text-surface-500">
                        Vía producto: {doc.producto.nombre} ({doc.producto.laboratorio || 'Sin lab'})
                      </p>
                    )}
                  </div>
                </button>

                <div className="flex items-center gap-3 shrink-0">
                  {Array.isArray(doc.etiquetas) && doc.etiquetas.length > 0 && (
                    <div className="flex flex-wrap gap-1 justify-end">
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

                  {/* Acciones de Editar y Eliminar */}
                  <div className="flex items-center gap-1 pl-2 border-l border-surface-100">
                    <button
                      onClick={() => handleOpenEditModal(doc)}
                      className="p-1 rounded-md text-surface-400 hover:text-brand-600 hover:bg-surface-100 transition-colors"
                      title="Editar documento"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => handleOpenDeleteModal(doc)}
                      className="p-1 rounded-md text-surface-400 hover:text-danger-500 hover:bg-danger-50 transition-colors"
                      title="Eliminar documento"
                    >
                      <Trash2 size={13} />
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
                {editingDocId ? 'Editar Documento' : `Nuevo Documento para ${proveedor.nombre}`}
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
                  placeholder="Ej. Certificacion_BPM_2026.pdf"
                  className="input-base w-full mt-1"
                />
              </div>

              {/* ARCHIVO */}
              <div>
                <label className="text-xs font-semibold text-surface-600">
                  Archivo {editingDocId ? '(Opcional: solo si deseas reemplazarlo)' : '*'}
                </label>
                <label className="mt-1 flex items-center gap-2 border border-dashed border-surface-300 rounded-xl px-3 py-3 cursor-pointer hover:border-brand-400 hover:bg-brand-50/30 transition-colors">
                  <Paperclip size={15} className="text-surface-400 shrink-0" />
                  <span className="text-xs text-surface-500 truncate flex-1">
                    {formDocumento.archivo
                      ? formDocumento.archivo.name
                      : editingDocId
                      ? 'Selecciona un nuevo archivo para reemplazar'
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
                  {saving ? 'Guardando...' : editingDocId ? 'Actualizar' : 'Guardar'}
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