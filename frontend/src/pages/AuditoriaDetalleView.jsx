import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,Calendar,MapPin,User,Clock,CheckCircle2,AlertCircle,XCircle,PlayCircle,
  Edit2,Trash2,Plus,Search,CheckCircle,FileText,Building2,Hash,X,ListTodo,TrendingUp,RotateCcw,Upload,Download,
  Paperclip,ExternalLink
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'
import { EmptyState } from '../components/ui/EmptyState'
import PuedeEditar from '../components/PuedeEditar'

import { PDFDownloadLink } from '@react-pdf/renderer'
import { AuditoriaPDFDocument } from '../components/AuditoriaPDFDocument'

// Estados de la Auditoría
const ESTADOS_AUDITORIA = [
  { value: 'programada', label: 'Programada', icon: Clock, className: 'bg-sky-50 text-sky-700 border-sky-200' },
  { value: 'en_progreso', label: 'En Progreso', icon: AlertCircle, className: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'finalizada', label: 'Finalizada', icon: CheckCircle, className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'cancelada', label: 'Cancelada', icon: XCircle, className: 'bg-rose-50 text-rose-700 border-rose-200' },
]

const getEstadoAuditoriaInfo = (estado) =>
  ESTADOS_AUDITORIA.find((e) => e.value === estado) || ESTADOS_AUDITORIA[0]

// Estados de las Tareas
const ESTADOS_TAREA = [
  { value: 'PENDIENTE', label: 'Pendiente', icon: Clock, className: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'EN_PROCESO', label: 'En Proceso', icon: PlayCircle, className: 'bg-sky-50 text-sky-700 border-sky-200' },
  { value: 'COMPLETADA', label: 'Completada', icon: CheckCircle2, className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
]

const getEstadoTareaInfo = (estado) =>
  ESTADOS_TAREA.find((e) => e.value === (estado || '').toUpperCase()) || ESTADOS_TAREA[0]

const toDatetimeLocal = (value) => {
  if (!value) return ''
  const d = new Date(value)
  if (isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const formatDate = (value) => {
  if (!value) return '—'
  const d = new Date(value)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

const getFileIconAndType = (filename = '') => {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  if (['pdf'].includes(ext)) return { label: 'PDF', color: 'bg-rose-50 text-rose-700 border-rose-200' }
  if (['doc', 'docx'].includes(ext)) return { label: 'WORD', color: 'bg-blue-50 text-blue-700 border-blue-200' }
  if (['xls', 'xlsx', 'csv'].includes(ext)) return { label: 'EXCEL', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return { label: 'IMG', color: 'bg-violet-50 text-violet-700 border-violet-200' }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return { label: 'ZIP', color: 'bg-amber-50 text-amber-700 border-amber-200' }
  return { label: ext ? ext.toUpperCase() : 'ARCHIVO', color: 'bg-surface-100 text-surface-700 border-surface-200' }
}

const initialTareaForm = {
  nombre_tarea: '',
  estado: 'PENDIENTE',
  fecha_inicio: '',
  fecha_ejecutada: '',
  fecha_fin: '',
  comentario: '',
}

export default function AuditoriaDetalleView() {
  const { id: auditoriaId } = useParams()
  const navigate = useNavigate()

  const [auditoria, setAuditoria] = useState(null)
  const [tareas, setTareas] = useState([])
  const [sedes, setSedes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Documento / Archivo adjunto de Auditoría
  const docInputRef = useRef(null)
  const editModalFileInputRef = useRef(null)
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [editModalFile, setEditModalFile] = useState(null)

  // Filtros de tareas
  const [searchTarea, setSearchTarea] = useState('')
  const [filtroEstadoTarea, setFiltroEstadoTarea] = useState('TODOS')

  // Modales de Tarea
  const [showModalTarea, setShowModalTarea] = useState(false)
  const [editingTarea, setEditingTarea] = useState(null)
  const [formTarea, setFormTarea] = useState(initialTareaForm)
  const [savingTarea, setSavingTarea] = useState(false)

  // Modal Eliminación Tarea
  const [showModalDeleteTarea, setShowModalDeleteTarea] = useState(false)
  const [tareaToDelete, setTareaToDelete] = useState(null)
  const [deletingTarea, setDeletingTarea] = useState(false)

  // Modal Editar Auditoría
  const [showModalEditAuditoria, setShowModalEditAuditoria] = useState(false)
  const [formAuditoria, setFormAuditoria] = useState({})
  const [savingAuditoria, setSavingAuditoria] = useState(false)

  /* ── Cargar Datos de la Auditoría y Tareas ───────────────── */
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [resAuditoria, resSedes] = await Promise.all([
        api.get(`/auditorias/${auditoriaId}`),
        api.get('/sedes').catch(() => ({ data: [] })),
      ])

      const audData = resAuditoria.data
      setAuditoria(audData)
      setTareas(audData.tareas || [])
      setSedes(resSedes.data || [])
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(
        typeof detail === 'string'
          ? detail
          : 'Error al cargar la información de la auditoría'
      )
    } finally {
      setLoading(false)
    }
  }, [auditoriaId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  /* ── Métricas y Contadores de Tareas ─────────────────────── */
  const metricas = useMemo(() => {
    const total = tareas.length
    const pendientes = tareas.filter((t) => (t.estado || '').toUpperCase() === 'PENDIENTE').length
    const enProceso = tareas.filter((t) => (t.estado || '').toUpperCase() === 'EN_PROCESO').length
    const completadas = tareas.filter((t) => (t.estado || '').toUpperCase() === 'COMPLETADA').length
    const porcentaje = total > 0 ? Math.round((completadas / total) * 100) : 0

    return { total, pendientes, enProceso, completadas, porcentaje }
  }, [tareas])

  /* ── Filtrado de Tareas ─────────────────────────────────── */
  const tareasFiltradas = useMemo(() => {
    return tareas.filter((t) => {
      const term = searchTarea.toLowerCase().trim()
      const matchSearch =
        !term ||
        t.nombre_tarea?.toLowerCase().includes(term) ||
        t.comentario?.toLowerCase().includes(term)

      const matchEstado =
        filtroEstadoTarea === 'TODOS' ||
        (t.estado || '').toUpperCase() === filtroEstadoTarea

      return matchSearch && matchEstado
    })
  }, [tareas, searchTarea, filtroEstadoTarea])

  /* ── Abrir Modal Crear / Editar Tarea ────────────────────── */
  const handleOpenTareaModal = (tarea = null) => {
    if (tarea) {
      setEditingTarea(tarea)
      setFormTarea({
        nombre_tarea: tarea.nombre_tarea || '',
        estado: tarea.estado || 'PENDIENTE',
        fecha_inicio: toDatetimeLocal(tarea.fecha_inicio),
        fecha_ejecutada: toDatetimeLocal(tarea.fecha_ejecutada),
        fecha_fin: toDatetimeLocal(tarea.fecha_fin),
        comentario: tarea.comentario || '',
      })
    } else {
      setEditingTarea(null)
      setFormTarea(initialTareaForm)
    }
    setShowModalTarea(true)
  }

  /* ── Guardar / Editar Tarea ─────────────────────────────── */
  const handleSaveTarea = async (e) => {
    e.preventDefault()
    if (!formTarea.nombre_tarea.trim()) {
      toast.error('El nombre de la tarea es obligatorio')
      return
    }

    setSavingTarea(true)
    try {
      const payload = {
        nombre_tarea: formTarea.nombre_tarea.trim(),
        estado: formTarea.estado,
        fecha_inicio: formTarea.fecha_inicio ? new Date(formTarea.fecha_inicio).toISOString() : null,
        fecha_ejecutada: formTarea.fecha_ejecutada ? new Date(formTarea.fecha_ejecutada).toISOString() : null,
        fecha_fin: formTarea.fecha_fin ? new Date(formTarea.fecha_fin).toISOString() : null,
        comentario: formTarea.comentario?.trim() || null,
      }

      if (editingTarea) {
        const res = await api.put(`/auditorias/${auditoriaId}/tareas/${editingTarea.id}`, payload)
        setTareas((prev) => prev.map((t) => (t.id === editingTarea.id ? res.data : t)))
        toast.success('Tarea actualizada con éxito')
      } else {
        const res = await api.post(`/auditorias/${auditoriaId}/tareas`, payload)
        setTareas((prev) => [...prev, res.data])
        toast.success('Tarea creada con éxito')
      }

      setShowModalTarea(false)
    } catch (err) {
      const detail = err.response?.data?.detail
      toast.error(typeof detail === 'string' ? detail : 'Error al guardar la tarea')
    } finally {
      setSavingTarea(false)
    }
  }

  /* ── Cambio Rápido de Estado de Tarea ───────────────────── */
  const handleQuickStatusChange = async (tarea, nuevoEstado) => {
    try {
      const nowIso = new Date().toISOString()
      const payload = {
        estado: nuevoEstado,
      }

      if (nuevoEstado === 'EN_PROCESO' && !tarea.fecha_inicio) {
        payload.fecha_inicio = nowIso
      }
      if (nuevoEstado === 'COMPLETADA') {
        if (!tarea.fecha_fin) payload.fecha_fin = nowIso
        if (!tarea.fecha_ejecutada) payload.fecha_ejecutada = nowIso
      }

      const res = await api.put(`/auditorias/${auditoriaId}/tareas/${tarea.id}`, payload)
      setTareas((prev) => prev.map((t) => (t.id === tarea.id ? res.data : t)))
      toast.success(`Tarea marcada como ${nuevoEstado.toLowerCase().replace('_', ' ')}`)
    } catch (err) {
      toast.error('No se pudo actualizar el estado de la tarea')
    }
  }

  /* ── Eliminar Tarea ─────────────────────────────────────── */
  const handleOpenDeleteTarea = (tarea) => {
    setTareaToDelete(tarea)
    setShowModalDeleteTarea(true)
  }

  const handleDeleteTarea = async () => {
    if (!tareaToDelete) return
    setDeletingTarea(true)
    try {
      await api.delete(`/auditorias/${auditoriaId}/tareas/${tareaToDelete.id}`)
      setTareas((prev) => prev.filter((t) => t.id !== tareaToDelete.id))
      toast.success('Tarea eliminada correctamente')
      setShowModalDeleteTarea(false)
      setTareaToDelete(null)
    } catch (err) {
      const detail = err.response?.data?.detail
      toast.error(typeof detail === 'string' ? detail : 'Error al eliminar la tarea')
    } finally {
      setDeletingTarea(false)
    }
  }

  /* ── Gestión de Documento / Archivo Adjunto ───────────────── */
  const handleUploadDoc = async (file) => {
    if (!file) return
    setUploadingDoc(true)
    try {
      const formData = new FormData()
      formData.append('archivo', file)
      const res = await api.post(`/auditorias/${auditoriaId}/documento`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setAuditoria((prev) => ({ ...prev, ...res.data }))
      toast.success('Documento / agregado cargado con éxito')
    } catch (err) {
      const detail = err.response?.data?.detail
      toast.error(typeof detail === 'string' ? detail : 'Error al cargar el documento')
    } finally {
      setUploadingDoc(false)
    }
  }

  const handleDeleteDoc = async () => {
    if (!window.confirm('¿Deseas eliminar el archivo adjunto de esta auditoría?')) return
    setUploadingDoc(true)
    try {
      const res = await api.delete(`/auditorias/${auditoriaId}/documento`)
      setAuditoria((prev) => ({ ...prev, ...res.data }))
      toast.success('Documento eliminado')
    } catch (err) {
      const detail = err.response?.data?.detail
      toast.error(typeof detail === 'string' ? detail : 'Error al eliminar el documento')
    } finally {
      setUploadingDoc(false)
    }
  }

  const handleViewDoc = () => {
    window.open(`/api/auditorias/${auditoriaId}/documento`, '_blank')
  }

  /* ── Modal Editar Auditoría ──────────────────────────────── */
  const handleOpenEditAuditoria = () => {
    if (!auditoria) return
    setEditModalFile(null)
    setFormAuditoria({
      nombre_auditoria: auditoria.nombre_auditoria || '',
      nombre_auditor: auditoria.nombre_auditor || '',
      sede_id: auditoria.sede_id || '',
      documento_adt: auditoria.documento_adt || '',
      estado: auditoria.estado || 'programada',
      fecha_programada: toDatetimeLocal(auditoria.fecha_programada),
      fecha_ejecucion: toDatetimeLocal(auditoria.fecha_ejecucion),
      fecha_finalizada: toDatetimeLocal(auditoria.fecha_finalizada),
      novedades: auditoria.novedades || '',
    })
    setShowModalEditAuditoria(true)
  }

  const handleSaveAuditoria = async (e) => {
    e.preventDefault()
    setSavingAuditoria(true)
    try {
      const payload = {
        ...formAuditoria,
        sede_id: Number(formAuditoria.sede_id),
        documento_adt: formAuditoria.documento_adt?.trim() || null,
        fecha_programada: formAuditoria.fecha_programada ? new Date(formAuditoria.fecha_programada).toISOString() : null,
        fecha_ejecucion: formAuditoria.fecha_ejecucion ? new Date(formAuditoria.fecha_ejecucion).toISOString() : null,
        fecha_finalizada: formAuditoria.fecha_finalizada ? new Date(formAuditoria.fecha_finalizada).toISOString() : null,
        novedades: formAuditoria.novedades?.trim() || null,
      }

      let res = await api.put(`/auditorias/${auditoriaId}`, payload)

      // Si se seleccionó un nuevo archivo en el modal de edición, subirlo
      if (editModalFile) {
        const formData = new FormData()
        formData.append('archivo', editModalFile)
        res = await api.post(`/auditorias/${auditoriaId}/documento`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      }

      setAuditoria((prev) => ({ ...prev, ...res.data }))
      setShowModalEditAuditoria(false)
      setEditModalFile(null)
      toast.success('Auditoría actualizada')
    } catch (err) {
      const detail = err.response?.data?.detail
      toast.error(typeof detail === 'string' ? detail : 'Error al actualizar auditoría')
    } finally {
      setSavingAuditoria(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-surface-500 gap-3">
        <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-medium">Cargando auditoría...</span>
      </div>
    )
  }

  if (error || !auditoria) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/auditorias')}
          className="inline-flex items-center gap-2 text-sm text-surface-600 hover:text-surface-900 transition-colors"
        >
          <ArrowLeft size={16} /> Volver a Auditorías
        </button>
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center text-rose-700 text-sm">
          <p className="font-semibold mb-1">No se pudo cargar la auditoría</p>
          <p className="text-xs text-rose-600">{error || 'Registro no encontrado'}</p>
          <button
            onClick={fetchData}
            className="mt-4 px-4 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  const estadoInfo = getEstadoAuditoriaInfo(auditoria.estado)
  const EstadoIcon = estadoInfo.icon
  const docBadge = getFileIconAndType(auditoria.documento_adt || '')

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ── Barra Superior & Navegación ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          onClick={() => navigate('/auditorias')}
          className="inline-flex items-center gap-2 text-sm font-medium text-surface-600 hover:text-surface-900 transition-colors bg-white px-3 py-1.5 rounded-lg border border-surface-200 shadow-sm"
        >
          <ArrowLeft size={16} /> Volver a Auditorías
        </button>

        <div className="flex items-center gap-2">
          <PuedeEditar>
            <button
              onClick={handleOpenEditAuditoria}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-surface-700 bg-white border border-surface-200 hover:bg-surface-50 shadow-sm transition-colors"
            >
              <Edit2 size={14} /> Editar Auditoría
            </button>

            <div className="flex items-center gap-2">

</div>
            <button
              onClick={() => handleOpenTareaModal()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-brand-500 hover:bg-brand-600 shadow-sm transition-colors"
            >
              <Plus size={15} /> Nueva Tarea
            </button>
          </PuedeEditar>
            {auditoria && (
    <PDFDownloadLink
      document={<AuditoriaPDFDocument auditoria={auditoria} tareas={tareas} metricas={metricas} />}
      fileName={`Auditoria_${auditoria.nombre_auditoria.replace(/\s+/g, '_')}.pdf`}
    >
      {({ loading }) => (
        <button
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 shadow-sm transition-colors"
        >
          <FileText size={14} />
          {loading ? 'Generando PDF...' : 'Exportar PDF'}
        </button>
      )}
    </PDFDownloadLink>
  )}
        </div>
      </div>

      {/* ── Ficha Informativa de la Auditoría ── */}
      <div className="card p-6 shadow-card border border-surface-200/70 space-y-5 bg-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-100 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-surface-900 tracking-tight">
                {auditoria.nombre_auditoria}
              </h1>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${estadoInfo.className}`}>
                <EstadoIcon size={13} /> {estadoInfo.label}
              </span>
            </div>
            {auditoria.documento_adt && (
              <div className="flex items-center gap-1 text-xs text-surface-500 font-mono">
                <Hash size={13} className="text-surface-400" />
                <span>Documento: <strong className="text-surface-700">{auditoria.documento_adt}</strong></span>
              </div>
            )}
          </div>
        </div>

        {/* Grilla de Metadatos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-3.5 rounded-xl bg-surface-50/70 border border-surface-100 space-y-1">
            <span className="text-[11px] font-medium text-surface-500 uppercase tracking-wider flex items-center gap-1.5">
              <User size={13} className="text-surface-400" /> Auditor
            </span>
            <p className="text-sm font-semibold text-surface-800 truncate">
              {auditoria.nombre_auditor || '—'}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-50/70 border border-surface-100 space-y-1">
            <span className="text-[11px] font-medium text-surface-500 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin size={13} className="text-surface-400" /> Sede
            </span>
            <p className="text-sm font-semibold text-surface-800 truncate">
              {auditoria.sede?.nombre || '—'}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-50/70 border border-surface-100 space-y-1">
            <span className="text-[11px] font-medium text-surface-500 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar size={13} className="text-surface-400" /> Programada
            </span>
            <p className="text-sm font-semibold text-surface-800">
              {formatDate(auditoria.fecha_programada)}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-50/70 border border-surface-100 space-y-1">
            <span className="text-[11px] font-medium text-surface-500 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-surface-400" /> Ejecución / Finalizada
            </span>
            <p className="text-xs font-medium text-surface-700">
              {auditoria.fecha_ejecucion ? `Ejec: ${formatDate(auditoria.fecha_ejecucion)}` : 'Sin ejecución'}
            </p>
            {auditoria.fecha_finalizada && (
              <p className="text-[11px] text-emerald-600 font-medium">
                Fin: {formatDate(auditoria.fecha_finalizada)}
              </p>
            )}
          </div>
        </div>

        {/* Novedades / Observaciones */}
        {auditoria.novedades && (
          <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200/60 space-y-1">
            <span className="text-xs font-semibold text-amber-900 flex items-center gap-1.5">
              <FileText size={14} className="text-amber-700" /> Novedades y Observaciones
            </span>
            <p className="text-xs text-amber-900/90 whitespace-pre-wrap leading-relaxed">
              {auditoria.novedades}
            </p>
          </div>
        )}

        {/* Sección de Documento / Agregado de la Auditoría */}
        <div className="p-4 rounded-xl bg-surface-50/80 border border-surface-200/80 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-bold text-surface-800 flex items-center gap-1.5 uppercase tracking-wider">
              <Paperclip size={14} className="text-brand-500" /> Documento / Agregado de la Auditoría
            </span>
            <span className="text-[11px] text-surface-500">
              Cualquier formato sin restricción de tamaño
            </span>
          </div>

          {auditoria.documento_adt ? (
            <div className="flex items-center justify-between flex-wrap gap-3 bg-white p-3.5 rounded-lg border border-surface-200 shadow-sm">
              <div className="flex items-center gap-3 min-w-[200px] flex-1">
                <div className={`px-2.5 py-1 rounded-md text-xs font-bold border ${docBadge.color}`}>
                  {docBadge.label}
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-surface-800 break-all">
                    {auditoria.documento_adt}
                  </p>
                  <p className="text-[11px] text-surface-400">Archivo adjunto / agregado de la auditoría</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleViewDoc}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 transition-colors"
                  title="Ver o descargar archivo"
                >
                  <ExternalLink size={14} /> Ver / Descargar
                </button>

                <PuedeEditar>
                  <button
                    onClick={() => docInputRef.current?.click()}
                    disabled={uploadingDoc}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-surface-700 bg-white hover:bg-surface-50 border border-surface-200 transition-colors"
                    title="Reemplazar archivo"
                  >
                    <Upload size={14} /> {uploadingDoc ? 'Cargando...' : 'Reemplazar'}
                  </button>
                  <button
                    onClick={handleDeleteDoc}
                    disabled={uploadingDoc}
                    className="p-1.5 text-surface-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Eliminar archivo"
                  >
                    <Trash2 size={14} />
                  </button>
                </PuedeEditar>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-white rounded-lg border border-dashed border-surface-300 text-center sm:text-left">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-surface-100 text-surface-500 rounded-lg shrink-0">
                  <Paperclip size={20} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-surface-700">Sin documento o agregado cargado</p>
                  <p className="text-[11px] text-surface-400">Puedes adjuntar informes, actas, listas de chequeo o cualquier archivo sin límite de tamaño.</p>
                </div>
              </div>

              <PuedeEditar>
                <button
                  onClick={() => docInputRef.current?.click()}
                  disabled={uploadingDoc}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-brand-500 hover:bg-brand-600 shadow-sm transition-colors shrink-0"
                >
                  <Upload size={14} /> {uploadingDoc ? 'Subiendo...' : 'Cargar Archivo'}
                </button>
              </PuedeEditar>
            </div>
          )}

          <input
            ref={docInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                handleUploadDoc(e.target.files[0])
                e.target.value = ''
              }
            }}
          />
        </div>
      </div>

      {/* ── Resumen Métrico de Tareas ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="card p-4 flex flex-col justify-between border border-surface-200/70">
          <span className="text-xs text-surface-500 font-medium">Total Tareas</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-surface-800">{metricas.total}</span>
            <ListTodo size={18} className="text-surface-400" />
          </div>
        </div>

        <div className="card p-4 flex flex-col justify-between border border-surface-200/70 bg-amber-50/30">
          <span className="text-xs text-amber-700 font-medium">Pendientes</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-amber-800">{metricas.pendientes}</span>
            <Clock size={18} className="text-amber-500" />
          </div>
        </div>

        <div className="card p-4 flex flex-col justify-between border border-surface-200/70 bg-sky-50/30">
          <span className="text-xs text-sky-700 font-medium">En Proceso</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-sky-800">{metricas.enProceso}</span>
            <PlayCircle size={18} className="text-sky-500" />
          </div>
        </div>

        <div className="card p-4 flex flex-col justify-between border border-surface-200/70 bg-emerald-50/30">
          <span className="text-xs text-emerald-700 font-medium">Completadas</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-emerald-800">{metricas.completadas}</span>
            <CheckCircle2 size={18} className="text-emerald-500" />
          </div>
        </div>

        <div className="card p-4 col-span-2 sm:col-span-1 flex flex-col justify-between border border-surface-200/70">
          <span className="text-xs text-surface-500 font-medium">% Avance</span>
          <div className="space-y-1.5 mt-2">
            <div className="flex items-center justify-between text-xs font-bold text-surface-800">
              <span>{metricas.porcentaje}%</span>
              <TrendingUp size={16} className="text-brand-500" />
            </div>
            <div className="w-full bg-surface-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-brand-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${metricas.porcentaje}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Sección de Tareas de la Auditoría ── */}
      <div className="card overflow-hidden shadow-card border border-surface-200/70 bg-white">
        {/* Barra de Filtros y Herramientas */}
        <div className="p-4 border-b border-surface-100 flex flex-wrap items-center justify-between gap-3 bg-surface-50/40">
          <div className="flex items-center gap-3 flex-1 min-w-[280px]">
            <div className="relative w-full max-w-xs">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
              <input
                type="text"
                placeholder="Buscar tarea o comentario..."
                value={searchTarea}
                onChange={(e) => setSearchTarea(e.target.value)}
                className="input-base pl-9 w-full text-xs py-1.5"
              />
            </div>

            <div className="flex items-center gap-1 bg-surface-100/80 p-0.5 rounded-lg border border-surface-200/70">
              {['TODOS', 'PENDIENTE', 'EN_PROCESO', 'COMPLETADA'].map((st) => (
                <button
                  key={st}
                  onClick={() => setFiltroEstadoTarea(st)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                    filtroEstadoTarea === st
                      ? 'bg-white text-surface-800 shadow-sm'
                      : 'text-surface-500 hover:text-surface-800'
                  }`}
                >
                  {st === 'TODOS' ? 'Todas' : st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <PuedeEditar>
            <button
              onClick={() => handleOpenTareaModal()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 transition-colors"
            >
              <Plus size={14} /> Agregar Tarea
            </button>
          </PuedeEditar>
        </div>

        {/* Listado / Tabla de Tareas */}
        {tareasFiltradas.length === 0 ? (
          <div className="py-12">
            <EmptyState
              icon={ListTodo}
              title="No hay tareas registradas"
              description={
                searchTarea || filtroEstadoTarea !== 'TODOS'
                  ? 'No se encontraron tareas con los filtros actuales.'
                  : 'Comienza creando la primera tarea para esta auditoría.'
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-surface-100 bg-surface-50/60 text-[11px] font-semibold text-surface-500 uppercase tracking-wider">
                  <th className="px-5 py-3">Tarea & Observación</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="px-4 py-3">Fecha Inicio</th>
                  <th className="px-4 py-3">Fecha Ejecutada</th>
                  <th className="px-4 py-3">Fecha Fin</th>
                  <th className="px-5 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {tareasFiltradas.map((tarea) => {
                  const tareaEstado = getEstadoTareaInfo(tarea.estado)
                  const TareaIcon = tareaEstado.icon
                  const isPendiente = (tarea.estado || '').toUpperCase() === 'PENDIENTE'
                  const isEnProceso = (tarea.estado || '').toUpperCase() === 'EN_PROCESO'
                  const isCompletada = (tarea.estado || '').toUpperCase() === 'COMPLETADA'

                  return (
                    <tr key={tarea.id} className="hover:bg-surface-50/50 transition-colors">
                      <td className="px-5 py-3.5 max-w-sm">
                        <div className="font-semibold text-surface-800 text-sm">
                          {tarea.nombre_tarea}
                        </div>
                        {tarea.comentario && (
                          <div className="text-xs text-surface-500 mt-0.5 line-clamp-2">
                            {tarea.comentario}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${tareaEstado.className}`}>
                            <TareaIcon size={12} /> {tareaEstado.label}
                          </span>

                          <PuedeEditar>
                            {/* Botones de acción rápida de estado */}
                            {isPendiente && (
                              <button
                                onClick={() => handleQuickStatusChange(tarea, 'EN_PROCESO')}
                                className="p-1 text-sky-600 hover:bg-sky-50 rounded-md transition-colors"
                                title="Iniciar tarea (En Proceso)"
                              >
                                <PlayCircle size={15} />
                              </button>
                            )}
                            {isEnProceso && (
                              <button
                                onClick={() => handleQuickStatusChange(tarea, 'COMPLETADA')}
                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                                title="Completar tarea"
                              >
                                <CheckCircle2 size={15} />
                              </button>
                            )}
                            {isCompletada && (
                              <button
                                onClick={() => handleQuickStatusChange(tarea, 'EN_PROCESO')}
                                className="p-1 text-surface-400 hover:text-surface-600 hover:bg-surface-100 rounded-md transition-colors"
                                title="Reabrir tarea"
                              >
                                <RotateCcw size={13} />
                              </button>
                            )}
                          </PuedeEditar>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-xs text-surface-600 whitespace-nowrap">
                        {formatDate(tarea.fecha_inicio)}
                      </td>

                      <td className="px-4 py-3.5 text-xs text-surface-600 whitespace-nowrap">
                        {formatDate(tarea.fecha_ejecutada)}
                      </td>

                      <td className="px-4 py-3.5 text-xs text-surface-600 whitespace-nowrap">
                        {formatDate(tarea.fecha_fin)}
                      </td>

                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <PuedeEditar>
                          <button
                            onClick={() => handleOpenTareaModal(tarea)}
                            className="p-1.5 text-surface-400 hover:text-brand-600 hover:bg-brand-50/60 rounded-lg transition-colors mr-1"
                            title="Editar Tarea"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleOpenDeleteTarea(tarea)}
                            className="p-1.5 text-surface-400 hover:text-rose-600 hover:bg-rose-50/60 rounded-lg transition-colors"
                            title="Eliminar Tarea"
                          >
                            <Trash2 size={14} />
                          </button>
                        </PuedeEditar>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal Crear / Editar Tarea ── */}
      {showModalTarea && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-modal border border-surface-100 max-h-[90vh] overflow-y-auto scrollbar-thin">
            <div className="flex justify-between items-center mb-4 border-b border-surface-100 pb-3">
              <h3 className="text-base font-bold text-surface-800">
                {editingTarea ? 'Editar Tarea' : 'Nueva Tarea de Auditoría'}
              </h3>
              <button
                onClick={() => setShowModalTarea(false)}
                className="p-1 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveTarea} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-surface-700">Nombre de la Tarea *</label>
                <input
                  type="text"
                  required
                  value={formTarea.nombre_tarea}
                  onChange={(e) => setFormTarea({ ...formTarea, nombre_tarea: e.target.value })}
                  className="input-base w-full mt-1 text-sm"
                  placeholder="Ej. Revisión de calibración de termohigrómetros"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-surface-700">Estado</label>
                <select
                  value={formTarea.estado}
                  onChange={(e) => setFormTarea({ ...formTarea, estado: e.target.value })}
                  className="input-base w-full mt-1 cursor-pointer text-sm"
                >
                  {ESTADOS_TAREA.map((est) => (
                    <option key={est.value} value={est.value}>
                      {est.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-surface-600">Fecha Inicio</label>
                  <input
                    type="datetime-local"
                    value={formTarea.fecha_inicio}
                    onChange={(e) => setFormTarea({ ...formTarea, fecha_inicio: e.target.value })}
                    className="input-base w-full mt-1 text-xs py-1.5"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-surface-600">Fecha Ejecutada</label>
                  <input
                    type="datetime-local"
                    value={formTarea.fecha_ejecutada}
                    onChange={(e) => setFormTarea({ ...formTarea, fecha_ejecutada: e.target.value })}
                    className="input-base w-full mt-1 text-xs py-1.5"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-surface-600">Fecha Fin</label>
                  <input
                    type="datetime-local"
                    value={formTarea.fecha_fin}
                    onChange={(e) => setFormTarea({ ...formTarea, fecha_fin: e.target.value })}
                    className="input-base w-full mt-1 text-xs py-1.5"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-surface-700">Comentarios u Observaciones</label>
                <textarea
                  rows={3}
                  value={formTarea.comentario}
                  onChange={(e) => setFormTarea({ ...formTarea, comentario: e.target.value })}
                  className="input-base w-full mt-1 py-2 text-xs resize-none"
                  placeholder="Detalles sobre el hallazgo, evidencia o procedimiento de la tarea..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-surface-100">
                <button
                  type="button"
                  onClick={() => setShowModalTarea(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-surface-600 hover:bg-surface-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingTarea}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-brand-500 text-white hover:bg-brand-600 transition-colors shadow-sm disabled:opacity-60"
                >
                  {savingTarea ? 'Guardando...' : 'Guardar Tarea'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Confirmar Eliminación de Tarea ── */}
      {showModalDeleteTarea && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-modal border border-surface-100 space-y-4">
            <h3 className="text-base font-bold text-surface-800">
              ¿Eliminar tarea?
            </h3>
            <p className="text-xs text-surface-600">
              La tarea <strong className="text-surface-800">{tareaToDelete?.nombre_tarea}</strong> será eliminada permanentemente. Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowModalDeleteTarea(false)
                  setTareaToDelete(null)
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-surface-600 hover:bg-surface-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteTarea}
                disabled={deletingTarea}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-sm disabled:opacity-60"
              >
                {deletingTarea ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Editar Auditoría ── */}
      {showModalEditAuditoria && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-modal border border-surface-100 max-h-[90vh] overflow-y-auto scrollbar-thin">
            <div className="flex justify-between items-center mb-4 border-b border-surface-100 pb-3">
              <h3 className="text-base font-bold text-surface-800">
                Editar Auditoría
              </h3>
              <button
                onClick={() => setShowModalEditAuditoria(false)}
                className="p-1 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveAuditoria} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-surface-700">Nombre de la Auditoría *</label>
                <input
                  type="text"
                  required
                  value={formAuditoria.nombre_auditoria}
                  onChange={(e) => setFormAuditoria({ ...formAuditoria, nombre_auditoria: e.target.value })}
                  className="input-base w-full mt-1 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-surface-700">Auditor *</label>
                  <input
                    type="text"
                    required
                    value={formAuditoria.nombre_auditor}
                    onChange={(e) => setFormAuditoria({ ...formAuditoria, nombre_auditor: e.target.value })}
                    className="input-base w-full mt-1 text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-surface-700">Sede *</label>
                  <select
                    required
                    value={formAuditoria.sede_id}
                    onChange={(e) => setFormAuditoria({ ...formAuditoria, sede_id: e.target.value })}
                    className="input-base w-full mt-1 cursor-pointer text-sm"
                  >
                    <option value="" disabled>Selecciona una sede</option>
                    {sedes.map((s) => (
                      <option key={s.id} value={s.id}>{s.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-surface-700">Documento / Archivo Adjunto</label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="file"
                      ref={editModalFileInputRef}
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) {
                          setEditModalFile(f)
                          setFormAuditoria({ ...formAuditoria, documento_adt: f.name })
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => editModalFileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-2 border border-surface-200 rounded-lg text-xs font-medium text-surface-700 hover:bg-surface-50 bg-white shrink-0"
                    >
                      <Upload size={14} /> {editModalFile ? 'Cambiar' : (formAuditoria.documento_adt ? 'Reemplazar' : 'Seleccionar')}
                    </button>
                    <span className="text-xs text-surface-600 truncate flex-1" title={editModalFile?.name || formAuditoria.documento_adt}>
                      {editModalFile ? editModalFile.name : (formAuditoria.documento_adt || 'Sin archivo adjunto')}
                    </span>
                    {(editModalFile || formAuditoria.documento_adt) && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditModalFile(null)
                          setFormAuditoria({ ...formAuditoria, documento_adt: '' })
                        }}
                        className="p-1 text-surface-400 hover:text-surface-600"
                        title="Quitar archivo"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-surface-400 mt-0.5">Cualquier tipo de archivo sin límite de tamaño</p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-surface-700">Estado</label>
                  <select
                    value={formAuditoria.estado}
                    onChange={(e) => setFormAuditoria({ ...formAuditoria, estado: e.target.value })}
                    className="input-base w-full mt-1 cursor-pointer text-sm"
                  >
                    {ESTADOS_AUDITORIA.map((e) => (
                      <option key={e.value} value={e.value}>{e.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-surface-700">Fecha Programada *</label>
                <input
                  type="datetime-local"
                  required
                  value={formAuditoria.fecha_programada}
                  onChange={(e) => setFormAuditoria({ ...formAuditoria, fecha_programada: e.target.value })}
                  className="input-base w-full mt-1 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-surface-700">Fecha Ejecución</label>
                  <input
                    type="datetime-local"
                    value={formAuditoria.fecha_ejecucion}
                    onChange={(e) => setFormAuditoria({ ...formAuditoria, fecha_ejecucion: e.target.value })}
                    className="input-base w-full mt-1 text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-surface-700">Fecha Finalizada</label>
                  <input
                    type="datetime-local"
                    value={formAuditoria.fecha_finalizada}
                    onChange={(e) => setFormAuditoria({ ...formAuditoria, fecha_finalizada: e.target.value })}
                    className="input-base w-full mt-1 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-surface-700">Novedades</label>
                <textarea
                  rows={3}
                  value={formAuditoria.novedades}
                  onChange={(e) => setFormAuditoria({ ...formAuditoria, novedades: e.target.value })}
                  className="input-base w-full mt-1 py-2 resize-none text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-surface-100">
                <button
                  type="button"
                  onClick={() => setShowModalEditAuditoria(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-surface-600 hover:bg-surface-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingAuditoria}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-brand-500 text-white hover:bg-brand-600 transition-colors shadow-sm disabled:opacity-60"
                >
                  {savingAuditoria ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
