import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Beaker, Building2, Package, FileText, Tag, Mail, Phone, MapPin,
  Plus, X, Download, Paperclip, ExternalLink, Edit2, Trash2, Users
} from 'lucide-react'
import api from '../services/api'
import { EmptyState } from '../components/ui/EmptyState'
import Paginator from '../components/ui/Paginator'

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
const DEFAULT_FILE_META = { label: 'DOC', classes: 'bg-surface-100 text-surface-600 border-surface-200' }

function getFileMeta(nombre = '') {
  const ext = nombre.split('.').pop()?.toLowerCase()
  return FILE_TYPE_META[ext] || DEFAULT_FILE_META
}

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

  /* ── Paginación para Documentos ───────────────────────────── */
  const [currentPageDoc, setCurrentPageDoc] = useState(1)
  const [itemsPerPageDoc, setItemsPerPageDoc] = useState(5)

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

  /* ── Productos de este proveedor (todos, sin importar laboratorio) ── */
  const productosDelProveedor = useMemo(() => {
    return productos.filter(
      (p) => String(p.proveedor_id ?? p.proveedor?.id) === String(proveedorId)
    )
  }, [productos, proveedorId])

  /* ── Productos de este proveedor, agrupados por laboratorio ── */
  const laboratorios = useMemo(() => {
    const grupos = new Map()
    productosDelProveedor.forEach((p) => {
      const labKey = p.laboratorio?.trim() || 'Sin laboratorio'
      if (!grupos.has(labKey)) grupos.set(labKey, [])
      grupos.get(labKey).push(p)
    })

    return Array.from(grupos.entries())
      .map(([nombre, items]) => ({ nombre, productos: items }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [productosDelProveedor])

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

  // Ajustar página si cambia el tamaño de la lista de documentos
  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(documentosDelProveedor.length / itemsPerPageDoc))
    if (currentPageDoc > maxPage) {
      setCurrentPageDoc(maxPage)
    }
  }, [documentosDelProveedor.length, itemsPerPageDoc, currentPageDoc])

  const paginatedDocumentos = useMemo(() => {
    const startIndex = (currentPageDoc - 1) * itemsPerPageDoc
    return documentosDelProveedor.slice(startIndex, startIndex + itemsPerPageDoc)
  }, [documentosDelProveedor, currentPageDoc, itemsPerPageDoc])

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
 /* ── Importar: Lectura del Archivo y Parsing de Estado ───── */
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

      const proveedoresAImportar = data
        .map((item) => {
          // Helper interno para buscar valores sin importar tildes o mayúsculas
          const getFieldValue = (...possibleKeys) => {
            const foundKey = Object.keys(item).find((k) =>
              possibleKeys.some(
                (pKey) =>
                  k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') ===
                  pKey.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
              )
            )
            return foundKey ? String(item[foundKey]).trim() : ''
          }

          // Normalización del valor de estado enviado en el Excel
          const rawEstado = getFieldValue('Estado', 'activo', 'status').toLowerCase()

          let esActivo = true
          if (['inactivo', 'inactiva', 'no', '0', 'false'].includes(rawEstado)) {
            esActivo = false
          }

          return {
            identificacion: getFieldValue('Identificación / NIT', 'identificacion', 'nit', 'id'),
            nombre: getFieldValue('Razón Social / Nombre', 'nombre', 'razon social'),
            correo: getFieldValue('Correo', 'email', 'correo electronico') || null,
            telefono: getFieldValue('Teléfono', 'telefono', 'celular', 'phone') || null, // <-- Solucionado
            direccion: getFieldValue('Dirección', 'direccion', 'address') || null,
            activo: esActivo
          }
        })
        .filter((item) => item.identificacion !== '' && item.nombre !== '')

      if (proveedoresAImportar.length === 0) {
        alert('No se encontraron registros válidos para importar.')
        return
      }

      setExcelData(proveedoresAImportar)
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
    <div className="space-y-5">
      {/* ENCABEZADO */}
      <div className="relative overflow-hidden rounded-2xl border border-surface-100 bg-white p-6 shadow-sm">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-[#22D3EE]" />

        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate('/proveedores')}
            className="p-2 rounded-xl text-surface-500 hover:text-surface-800 hover:bg-surface-100 transition-colors mt-0.5"
            title="Volver a proveedores"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="hidden sm:flex h-12 w-12 shrink-0 rounded-2xl bg-[#0B1220] items-center justify-center shadow-sm">
            <Building2 size={22} className="text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-bold text-surface-800">{proveedor.nombre}</h2>

              <button
                onClick={() => navigate(`/proveedores/${proveedorId}/contactos`)}
                className="shrink-0 bg-[#0B1220] hover:bg-[#16233A] text-[#22D3EE] text-xs font-medium px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Users size={14} /> Contactos
              </button>
            </div>

            {/* Metadatos con título propio, no simples etiquetas */}
            <div className="mt-3 flex flex-wrap items-start gap-x-6 gap-y-2.5">
              {proveedor.identificacion && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-semibold text-surface-400 uppercase tracking-wide">
                    NIT / ID
                  </span>
                  <span className="text-xs font-mono text-surface-700">{proveedor.identificacion}</span>
                </div>
              )}

              {proveedor.correo && (
                <div className="flex flex-col gap-0.5 border-l border-surface-200 pl-6">
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-surface-400 uppercase tracking-wide">
                    <Mail size={11} className="text-[#22D3EE]" />
                    Correo
                  </span>
                  <span className="text-xs text-surface-700">{proveedor.correo}</span>
                </div>
              )}

              {proveedor.telefono && (
                <div className="flex flex-col gap-0.5 border-l border-surface-200 pl-6">
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-surface-400 uppercase tracking-wide">
                    <Phone size={11} className="text-[#22D3EE]" />
                    Teléfono
                  </span>
                  <span className="text-xs text-surface-700">{proveedor.telefono}</span>
                </div>
              )}

              {proveedor.direccion && (
                <div className="flex flex-col gap-0.5 border-l border-surface-200 pl-6">
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-surface-400 uppercase tracking-wide">
                    <MapPin size={11} className="text-[#22D3EE]" />
                    Dirección
                  </span>
                  <span className="text-xs text-surface-700">{proveedor.direccion}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        {/* PRODUCTOS Y LABORATORIOS (resumen + acceso directo al listado filtrado) */}
        <div className="bg-white rounded-2xl border border-surface-100 shadow-sm p-5 flex flex-col justify-between min-h-[400px]">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="flex items-center justify-center h-8 w-8 rounded-xl bg-[#0B1220] text-[#22D3EE]">
                <Beaker size={16} />
              </span>
              <h3 className="text-sm font-semibold text-surface-800">
                Productos y laboratorios
              </h3>
            </div>

            {productosDelProveedor.length === 0 ? (
              <EmptyState message="Este proveedor no tiene productos registrados." />
            ) : (
              <>
                {/* Resumen numérico: evita repetir toda la lista aquí, el detalle vive en Productos */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-surface-100 bg-surface-50/70 p-4">
                    <span className="flex items-center gap-1.5 text-[10px] font-semibold text-surface-400 uppercase tracking-wide">
                      <Package size={12} className="text-[#22D3EE]" /> Productos
                    </span>
                    <span className="mt-1.5 block text-2xl font-bold text-surface-800">
                      {productosDelProveedor.length}
                    </span>
                  </div>
                  <div className="rounded-xl border border-surface-100 bg-surface-50/70 p-4">
                    <span className="flex items-center gap-1.5 text-[10px] font-semibold text-surface-400 uppercase tracking-wide">
                      <Beaker size={12} className="text-[#22D3EE]" /> Laboratorios
                    </span>
                    <span className="mt-1.5 block text-2xl font-bold text-surface-800">
                      {laboratorios.length}
                    </span>
                  </div>
                </div>

                {/* Chips con los nombres de laboratorio, sin desglosar producto por producto */}
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {laboratorios.slice(0, 8).map((lab) => (
                    <span
                      key={lab.nombre}
                      className="text-[10px] font-medium text-surface-600 bg-surface-50 border border-surface-200 rounded-full px-2.5 py-1"
                    >
                      {lab.nombre}
                    </span>
                  ))}
                  {laboratorios.length > 8 && (
                    <span className="text-[10px] font-medium text-surface-400 px-2 py-1">
                      +{laboratorios.length - 8} más
                    </span>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Acceso directo: lleva al listado general de Productos ya filtrado por este proveedor */}
          <button
            onClick={() => navigate(`/productos?proveedor_id=${proveedorId}`)}
            className="mt-4 w-full bg-[#0B1220] hover:bg-[#16233A] text-[#22D3EE] text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
          >
            <Package size={14} /> Ver productos de este proveedor
          </button>
        </div>

        {/* DOCUMENTOS ASIGNADOS */}
        <div className="bg-white rounded-2xl border border-surface-100 shadow-sm p-5 flex flex-col justify-between min-h-[400px]">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center h-8 w-8 rounded-xl bg-[#0B1220] text-[#22D3EE]">
                  <FileText size={16} />
                </span>
                <h3 className="text-sm font-semibold text-surface-800">
                  Documentos ({documentosDelProveedor.length})
                </h3>
              </div>

              <button
                onClick={handleOpenCreateModal}
                className="bg-[#0B1220] hover:bg-[#16233A] text-[#22D3EE] text-xs font-medium px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Plus size={14} /> Nuevo Documento
              </button>
            </div>

            {documentosDelProveedor.length === 0 ? (
              <EmptyState message="Este proveedor no tiene documentos asignados." />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {paginatedDocumentos.map((doc) => {
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
                              className={`block text-xs font-semibold truncate ${
                                doc.ruta_archivo ? 'text-surface-800 group-hover:text-brand-600' : 'text-surface-500'
                              }`}
                            >
                              {doc.nombre_docu}
                            </span>
                            {doc.producto && (
                              <span className="block text-[10px] text-surface-500 truncate mt-0.5">
                                Vía producto: {doc.producto.nombre} ({doc.producto.laboratorio || 'Sin lab'})
                              </span>
                            )}
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
                            onClick={() => handleOpenEditModal(doc)}
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

          {documentosDelProveedor.length > 0 && (
            <div className="mt-4 pt-4 border-t border-surface-100">
              <Paginator
                currentPage={currentPageDoc}
                totalItems={documentosDelProveedor.length}
                itemsPerPage={itemsPerPageDoc}
                onPageChange={setCurrentPageDoc}
                onItemsPerPageChange={setItemsPerPageDoc}
              />
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