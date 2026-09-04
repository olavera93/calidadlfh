import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Edit2, Trash2, ClipboardList, Calendar, MapPin, X, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react'
import api from '../services/api'
import { EmptyState } from '../components/ui/EmptyState'
import Paginator from '../components/ui/Paginator'
import { useAuth } from '../context/AuthContext'
import PuedeEditar from '../components/PuedeEditar'

// Estados posibles de una auditoría.
// Ajusta estos valores si tu backend maneja otros nombres de estado.
const ESTADOS = [
  { value: 'programada', label: 'Programada', icon: Clock, className: 'bg-sky-50 text-sky-700 border-sky-200' },
  { value: 'en_progreso', label: 'En Progreso', icon: AlertCircle, className: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'finalizada', label: 'Finalizada', icon: CheckCircle, className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'cancelada', label: 'Cancelada', icon: XCircle, className: 'bg-rose-50 text-rose-700 border-rose-200' },
]

const getEstadoInfo = (estado) => ESTADOS.find((e) => e.value === estado) || ESTADOS[0]

const toDatetimeLocal = (value) => {
  if (!value) return ''
  const d = new Date(value)
  if (isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function AuditoriasView() {
  const navigate = useNavigate()
  const [auditorias, setAuditorias] = useState([])
  const [sedes, setSedes] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Filtros
  const [search, setSearch] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [filtroSede, setFiltroSede] = useState('todas')

  // Paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Modal Auditoría
  const [showModal, setShowModal] = useState(false)
  const [editingAuditoria, setEditingAuditoria] = useState(null)

  // Modal Eliminación
  const [showModalDelete, setShowModalDelete] = useState(false)
  const [auditoriaToDelete, setAuditoriaToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Form State
  const initialFormData = {
    nombre_auditoria: '',
    nombre_auditor: '',
    sede_id: '',
    documento_adt: '',
    estado: 'programada',
    fecha_programada: '',
    fecha_ejecucion: '',
    fecha_finalizada: '',
    novedades: ''
  }
  const [formData, setFormData] = useState(initialFormData)

  /* ── Cargar Datos de la API ──────────────────────────────── */
  const fetchAuditorias = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await api.get('/auditorias')
      setAuditorias(response.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al cargar las auditorías')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchSedes = useCallback(async () => {
    try {
      const response = await api.get('/sedes')
      setSedes(response.data)
    } catch (err) {
      // Silencioso: el selector de sede simplemente quedará vacío
    }
  }, [])

  useEffect(() => {
    fetchAuditorias()
    fetchSedes()
  }, [fetchAuditorias, fetchSedes])

  /* ── Búsqueda y Filtrado Dinámico ────────────────────────── */
  const auditoriasFiltradas = useMemo(() => {
    return auditorias.filter((a) => {
      const term = search.toLowerCase()
      const coincideBusqueda =
        a.nombre_auditoria?.toLowerCase().includes(term) ||
        a.nombre_auditor?.toLowerCase().includes(term) ||
        a.sede?.nombre?.toLowerCase().includes(term)

      const coincideEstado = filtroEstado === 'todos' || a.estado === filtroEstado
      const coincideSede = filtroSede === 'todas' || String(a.sede_id) === String(filtroSede)

      return coincideBusqueda && coincideEstado && coincideSede
    })
  }, [auditorias, search, filtroEstado, filtroSede])

  useEffect(() => {
    setCurrentPage(1)
  }, [search, filtroEstado, filtroSede, itemsPerPage])

  /* ── Paginación ───────────────────────────────────────────── */
  const auditoriasPaginadas = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return auditoriasFiltradas.slice(start, start + itemsPerPage)
  }, [auditoriasFiltradas, currentPage, itemsPerPage])

  /* ── Guardar / Editar ────────────────────────────────────── */
  const handleSave = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        ...formData,
        sede_id: Number(formData.sede_id),
        documento_adt: formData.documento_adt?.trim() || null,
        fecha_programada: formData.fecha_programada ? new Date(formData.fecha_programada).toISOString() : null,
        fecha_ejecucion: formData.fecha_ejecucion ? new Date(formData.fecha_ejecucion).toISOString() : null,
        fecha_finalizada: formData.fecha_finalizada ? new Date(formData.fecha_finalizada).toISOString() : null,
        novedades: formData.novedades?.trim() || null,
      }
      if (editingAuditoria) {
        await api.put(`/auditorias/${editingAuditoria.id}`, payload)
      } else {
        await api.post('/auditorias/', payload)
      }
      setShowModal(false)
      fetchAuditorias()
    } catch (err) {
      const detail = err.response?.data?.detail
      let mensaje = 'Error al guardar la auditoría'
      if (typeof detail === 'string') {
        mensaje = detail
      } else if (Array.isArray(detail)) {
        mensaje = detail.map((d) => `${d.loc?.[d.loc.length - 1]}: ${d.msg}`).join('\n')
      }
      alert(mensaje)
    }
  }

  /* ── Eliminar ─────────────────────────────────────────────── */
  const handleOpenDeleteModal = (auditoria) => {
    setAuditoriaToDelete(auditoria)
    setShowModalDelete(true)
  }

  const handleDelete = async () => {
    if (!auditoriaToDelete) return

    setDeleting(true)
    try {
      await api.delete(`/auditorias/${auditoriaToDelete.id}`)
      setShowModalDelete(false)
      setAuditoriaToDelete(null)
      fetchAuditorias()
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al eliminar la auditoría')
    } finally {
      setDeleting(false)
    }
  }

  /* ── Abrir Modal ─────────────────────────────────────────── */
  const openModal = (auditoria = null) => {
    if (auditoria) {
      setEditingAuditoria(auditoria)
      setFormData({
        nombre_auditoria: auditoria.nombre_auditoria || '',
        nombre_auditor: auditoria.nombre_auditor || '',
        sede_id: auditoria.sede_id || '',
        documento_adt: auditoria.documento_adt || '',
        estado: auditoria.estado || 'programada',
        fecha_programada: toDatetimeLocal(auditoria.fecha_programada),
        fecha_ejecucion: toDatetimeLocal(auditoria.fecha_ejecucion),
        fecha_finalizada: toDatetimeLocal(auditoria.fecha_finalizada),
        novedades: auditoria.novedades || ''
      })
    } else {
      setEditingAuditoria(null)
      setFormData(initialFormData)
    }
    setShowModal(true)
  }

  return (
    <div className="space-y-4">
      {/* Buscador & Filtros */}
      <div className="card px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1 min-w-[300px]">
          <div className="relative w-full max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
            <input
              type="text"
              placeholder="Buscar por auditoría, auditor o sede..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-base pl-9 w-full"
            />
          </div>

          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="input-base text-xs py-2 px-3 w-40 cursor-pointer"
          >
            <option value="todos">Todos los estados</option>
            {ESTADOS.map((e) => (
              <option key={e.value} value={e.value}>{e.label}</option>
            ))}
          </select>

          <select
            value={filtroSede}
            onChange={(e) => setFiltroSede(e.target.value)}
            className="input-base text-xs py-2 px-3 w-40 cursor-pointer"
          >
            <option value="todas">Todas las sedes</option>
            {sedes.map((s) => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </select>
        </div>

        <PuedeEditar>
          <button
            onClick={() => openModal()}
            className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
          >
            <Plus size={16} /> Nueva Auditoría
          </button>
        </PuedeEditar>
      </div>

      {/* Alerta de Error */}
      {error && (
        <div className="bg-danger-50 border border-danger-200 rounded-xl px-4 py-3 text-sm text-danger-700">
          {error}
        </div>
      )}

      {/* Tabla de Auditorías */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-surface-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-surface-700">
            Registros <span className="ml-1 font-normal text-surface-400">({auditoriasFiltradas.length})</span>
          </h3>
        </div>

        <div className="overflow-x-auto scrollbar-thin">
          {auditoriasFiltradas.length === 0 && !loading ? (
            <EmptyState icon={ClipboardList} title="No se encontraron auditorías" />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-100 bg-surface-50 text-xs text-surface-500 uppercase tracking-wide">
                  <th className="text-left px-5 py-3">Auditoría</th>
                  <th className="text-left px-4 py-3">Auditor</th>
                  <th className="text-left px-4 py-3">Sede</th>
                  <th className="text-left px-4 py-3">Fecha Programada</th>
                  <th className="text-center px-4 py-3">Tareas</th>
                  <th className="text-center px-4 py-3">Estado</th>
                  <th className="text-right px-5 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {auditoriasPaginadas.map((auditoria) => {
                  const estadoInfo = getEstadoInfo(auditoria.estado)
                  const EstadoIcon = estadoInfo.icon
                  return (
                    <tr key={auditoria.id} className="border-b border-surface-100 last:border-0 hover:bg-surface-50/60 transition-colors">
                      <td className="px-5 py-3 text-surface-800 font-medium">
                        <button
                          onClick={() => navigate(`/auditorias/${auditoria.id}`)}
                          className="hover:text-brand-600 hover:underline transition-colors text-left"
                          title="Ver detalle y tareas de la auditoría"
                        >
                          {auditoria.nombre_auditoria}
                        </button>
                        {auditoria.documento_adt && (
                          <div className="text-[11px] text-surface-400 font-mono">{auditoria.documento_adt}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-surface-700">{auditoria.nombre_auditor}</td>
                      <td className="px-4 py-3 text-surface-600 text-xs">
                        <div className="flex items-center gap-1.5">
                          <MapPin size={13} className="text-surface-400 shrink-0" />
                          <span>{auditoria.sede?.nombre || '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-surface-600 text-xs">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-surface-400 shrink-0" />
                          <span>
                            {auditoria.fecha_programada
                              ? new Date(auditoria.fecha_programada).toLocaleString('es-CO', {
                                  dateStyle: 'medium',
                                  timeStyle: 'short'
                                })
                              : '—'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-surface-600">
                        {auditoria.tareas?.length || 0}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${estadoInfo.className}`}>
                          <EstadoIcon size={12} /> {estadoInfo.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <PuedeEditar>
                          <button
                            onClick={() => openModal(auditoria)}
                            className="p-1.5 text-surface-400 hover:text-brand-500 hover:bg-brand-50/50 rounded-lg transition-colors mr-1"
                            title="Editar"
                          >
                            <Edit2 size={15} />
                          </button>
                        </PuedeEditar>

                        <PuedeEditar>
                          <button
                            onClick={() => handleOpenDeleteModal(auditoria)}
                            className="p-1.5 text-surface-400 hover:text-danger-500 hover:bg-danger-50/50 rounded-lg transition-colors"
                            title="Eliminar Auditoría"
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
          totalItems={auditoriasFiltradas.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      </div>

      {/* Modal Crear / Editar Auditoría */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-modal border border-surface-100 max-h-[90vh] overflow-y-auto scrollbar-thin">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-semibold text-surface-800">
                {editingAuditoria ? 'Editar Auditoría' : 'Nueva Auditoría'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-surface-600">Nombre de la Auditoría</label>
                <input
                  type="text"
                  required
                  value={formData.nombre_auditoria}
                  onChange={(e) => setFormData({ ...formData, nombre_auditoria: e.target.value })}
                  className="input-base w-full mt-1"
                  placeholder="Ej. Auditoría Interna de Calidad Q1"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-surface-600">Auditor</label>
                  <input
                    type="text"
                    required
                    value={formData.nombre_auditor}
                    onChange={(e) => setFormData({ ...formData, nombre_auditor: e.target.value })}
                    className="input-base w-full mt-1"
                    placeholder="Ej. Juan Pérez"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-surface-600">Sede</label>
                  <select
                    required
                    value={formData.sede_id}
                    onChange={(e) => setFormData({ ...formData, sede_id: e.target.value })}
                    className="input-base w-full mt-1 cursor-pointer"
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
                  <label className="text-xs font-semibold text-surface-600">Documento ADT</label>
                  <input
                    type="text"
                    value={formData.documento_adt}
                    onChange={(e) => setFormData({ ...formData, documento_adt: e.target.value })}
                    className="input-base w-full mt-1"
                    placeholder="Ej. ADT-2026-001"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-surface-600">Estado</label>
                  <select
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                    className="input-base w-full mt-1 cursor-pointer"
                  >
                    {ESTADOS.map((e) => (
                      <option key={e.value} value={e.value}>{e.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-surface-600">Fecha Programada</label>
                <input
                  type="datetime-local"
                  required
                  value={formData.fecha_programada}
                  onChange={(e) => setFormData({ ...formData, fecha_programada: e.target.value })}
                  className="input-base w-full mt-1"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-surface-600">Fecha de Ejecución</label>
                  <input
                    type="datetime-local"
                    value={formData.fecha_ejecucion}
                    onChange={(e) => setFormData({ ...formData, fecha_ejecucion: e.target.value })}
                    className="input-base w-full mt-1"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-surface-600">Fecha Finalizada</label>
                  <input
                    type="datetime-local"
                    value={formData.fecha_finalizada}
                    onChange={(e) => setFormData({ ...formData, fecha_finalizada: e.target.value })}
                    className="input-base w-full mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-surface-600">Novedades</label>
                <textarea
                  rows={3}
                  value={formData.novedades}
                  onChange={(e) => setFormData({ ...formData, novedades: e.target.value })}
                  className="input-base w-full mt-1 py-2 resize-none text-xs"
                  placeholder="Observaciones, hallazgos u otras novedades de la auditoría..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
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

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
      {showModalDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-modal border border-surface-100 space-y-4">
            <h3 className="text-base font-semibold text-surface-800">
              ¿Eliminar auditoría?
            </h3>
            <p className="text-xs text-surface-600">
              La auditoría <strong className="text-surface-800">{auditoriaToDelete?.nombre_auditoria}</strong> y sus tareas asociadas se eliminarán permanentemente. Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowModalDelete(false)
                  setAuditoriaToDelete(null)
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-surface-600 hover:bg-surface-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
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