import React, { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import api, { odoo as odooApi } from '../../services/api'
import {
  AlertTriangle, Building2, Check, CheckCircle, ChevronDown, Eye, EyeOff,
  Link2, Loader, MapPin, Pencil, Plus, Shield, Thermometer, Trash2,
  ToggleLeft, ToggleRight, User, UserCog, Wind, X, XCircle,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { EmptyState } from '../../components/ui/EmptyState'
import { Skeleton } from '../../components/ui/Skeleton'

/* ════════════════════════════════════════════════════════════
   HELPERS COMPARTIDOS
═══════════════════════════════════════════════════════════════ */
function numOrNull(v) {
  const n = parseFloat(v)
  return isNaN(n) ? null : n
}

function showMsg(setFeedback, msg) {
  setFeedback(msg)
  setTimeout(() => setFeedback(''), 3500)
}

function Feedback({ msg }) {
  if (!msg) return null
  return (
    <div className="bg-brand-50 border border-brand-200 text-brand-700 text-sm rounded-xl px-4 py-2.5 flex items-center gap-2 animate-fade-in">
      <Check size={15} className="shrink-0" /> {msg}
    </div>
  )
}

function InlineConfirm({ label = '¿Confirmar?', onConfirm, onCancel }) {
  return (
    <div className="flex items-center gap-1 bg-danger-50 border border-danger-200 rounded-lg px-2 py-1">
      <span className="text-xs text-danger-700 font-medium">{label}</span>
      <button onClick={onConfirm} className="text-danger-600 hover:text-danger-800 p-0.5"><Check size={14} /></button>
      <button onClick={onCancel}  className="text-surface-500 hover:text-surface-700 p-0.5"><X size={14} /></button>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════
   TAB — ÁREAS
═══════════════════════════════════════════════════════════════ */
const TIPOS = [
  { value: 'nevera',   label: 'Nevera',   Icon: Thermometer, color: 'text-brand-600', bg: 'bg-brand-50',  badge: 'bg-brand-100 text-brand-700' },
  { value: 'ambiente', label: 'Ambiente', Icon: Wind,        color: 'text-ok-600',    bg: 'bg-ok-50',     badge: 'bg-ok-100 text-ok-700' },
]
const FORM_AREA_EMPTY = { nombre: '', tipo: 'nevera', temp_min: '', temp_max: '', humedad_min: '', humedad_max: '' }

function getTipo(value) { return TIPOS.find(t => t.value === value) ?? TIPOS[0] }

function RangeField({ label, name, value, onChange, unit }) {
  return (
    <div>
      <label className="block text-xs font-medium text-surface-500 mb-1">{label}</label>
      <div className="relative">
        <input type="number" step="0.1" name={name} value={value} onChange={onChange}
          placeholder="—" className="input-base pr-9 tabular" />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-surface-400 pointer-events-none">{unit}</span>
      </div>
    </div>
  )
}

function AreaForm({ initial, onSave, onCancel, saving, error }) {
  const [form, setForm] = useState(initial)
  const esAmbiente = form.tipo === 'ambiente'
  function handleChange(e) { setForm(f => ({ ...f, [e.target.name]: e.target.value })) }
  function handleTipo(value) {
    setForm(f => ({ ...f, tipo: value, humedad_min: value === 'nevera' ? '' : f.humedad_min, humedad_max: value === 'nevera' ? '' : f.humedad_max }))
  }
  return (
    <div className="bg-surface-50 border border-surface-200 rounded-2xl p-4 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-surface-500 mb-1">Nombre del área</label>
          <input autoFocus type="text" name="nombre" value={form.nombre} onChange={handleChange}
            placeholder="Ej: Nevera 3" className="input-base" />
        </div>
        <div>
          <label className="block text-xs font-medium text-surface-500 mb-1">Tipo</label>
          <div className="flex gap-2">
            {TIPOS.map(t => {
              const active = form.tipo === t.value
              return (
                <button key={t.value} type="button" onClick={() => handleTipo(t.value)}
                  className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-medium transition-colors',
                    active ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-surface-200 text-surface-500 hover:border-surface-300 bg-white')}>
                  <t.Icon size={13} />{t.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>
      <div>
        <p className="text-xs font-medium text-surface-600 mb-2">Rango de temperatura</p>
        <div className="grid grid-cols-2 gap-3">
          <RangeField label="Mínima" name="temp_min" value={form.temp_min} onChange={handleChange} unit="°C" />
          <RangeField label="Máxima" name="temp_max" value={form.temp_max} onChange={handleChange} unit="°C" />
        </div>
      </div>
      {esAmbiente && (
        <div>
          <p className="text-xs font-medium text-surface-600 mb-2">Rango de humedad relativa</p>
          <div className="grid grid-cols-2 gap-3">
            <RangeField label="Mínima" name="humedad_min" value={form.humedad_min} onChange={handleChange} unit="%" />
            <RangeField label="Máxima" name="humedad_max" value={form.humedad_max} onChange={handleChange} unit="%" />
          </div>
        </div>
      )}
      {error && <p className="text-xs text-danger-600 flex items-center gap-1.5"><AlertTriangle size={12} />{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onCancel} className="btn btn-sm btn-secondary">Cancelar</button>
        <button onClick={() => onSave(form)} disabled={!form.nombre || saving} className="btn btn-sm btn-primary">
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}

function AreaRow({ area, onEdit, onDelete, onToggle }) {
  const [confirmando, setConfirmando] = useState(false)
  const tipo = getTipo(area.tipo)
  return (
    <div className={cn('rounded-2xl border p-4 transition-colors bg-white', area.activa ? 'border-surface-200' : 'border-surface-100 opacity-60')}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn('p-2 rounded-xl shrink-0', tipo.bg)}><tipo.Icon size={17} className={tipo.color} /></div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-surface-800 text-sm">{area.nombre}</span>
              <span className={cn('badge', tipo.badge)}>{tipo.label}</span>
              {!area.activa && <span className="badge badge-muted">Inactiva</span>}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5">
              <span className="text-xs text-surface-500 flex items-center gap-1">
                <Thermometer size={11} className="text-surface-400" />
                {area.temp_min != null ? `${area.temp_min}°C` : '—'}{' – '}{area.temp_max != null ? `${area.temp_max}°C` : '—'}
              </span>
              {area.tipo === 'ambiente' && (
                <span className="text-xs text-surface-500 flex items-center gap-1">
                  <Wind size={11} className="text-surface-400" />
                  {area.humedad_min != null ? `${area.humedad_min}%` : '—'}{' – '}{area.humedad_max != null ? `${area.humedad_max}%` : '—'}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => onToggle(area)} title={area.activa ? 'Desactivar' : 'Activar'}
            className="p-1.5 rounded-lg text-surface-400 hover:text-surface-700 hover:bg-surface-100 transition-colors">
            {area.activa ? <ToggleRight size={20} className="text-ok-500" /> : <ToggleLeft size={20} />}
          </button>
          <button onClick={() => onEdit(area)} className="p-1.5 rounded-lg text-surface-400 hover:text-brand-600 hover:bg-brand-50 transition-colors">
            <Pencil size={15} />
          </button>
          {!confirmando
            ? <button onClick={() => setConfirmando(true)} className="p-1.5 rounded-lg text-surface-400 hover:text-danger-600 hover:bg-danger-50 transition-colors"><Trash2 size={15} /></button>
            : <InlineConfirm onConfirm={() => { onDelete(area.id); setConfirmando(false) }} onCancel={() => setConfirmando(false)} />
          }
        </div>
      </div>
    </div>
  )
}

function TabAreas({ sedes, isAdmin, sedesPermitidas }) {
  const [sedeId, setSedeId]           = useState('')
  const [areas, setAreas]             = useState([])
  const [loading, setLoading]         = useState(false)
  const [editingArea, setEditingArea] = useState(null)
  const [showNew, setShowNew]         = useState(false)
  const [saving, setSaving]           = useState(false)
  const [formError, setFormError]     = useState('')
  const [feedback, setFeedback]       = useState('')

  const sedesVisibles = sedes.filter(s => isAdmin || sedesPermitidas.includes(s.id))

  useEffect(() => {
    if (sedesVisibles.length === 1) setSedeId(String(sedesVisibles[0].id))
  }, [sedesVisibles.length])

  const loadAreas = useCallback(async () => {
    if (!sedeId) { setAreas([]); return }
    setLoading(true)
    try {
      const r = await api.get(`/sedes/${sedeId}/areas`, { params: { include_inactive: true } })
      setAreas(r.data)
    } catch { setAreas([]) } finally { setLoading(false) }
  }, [sedeId])

  useEffect(() => { loadAreas() }, [loadAreas])

  async function handleSaveNew(form) {
    setSaving(true); setFormError('')
    try {
      await api.post(`/sedes/${sedeId}/areas`, {
        nombre: form.nombre, tipo: form.tipo,
        temp_min: numOrNull(form.temp_min), temp_max: numOrNull(form.temp_max),
        humedad_min: form.tipo === 'ambiente' ? numOrNull(form.humedad_min) : null,
        humedad_max: form.tipo === 'ambiente' ? numOrNull(form.humedad_max) : null,
      })
      setShowNew(false); await loadAreas(); showMsg(setFeedback, 'Área creada correctamente.')
    } catch (err) { setFormError(err.response?.data?.detail || 'Error al crear el área') }
    finally { setSaving(false) }
  }

  async function handleSaveEdit(form) {
    setSaving(true); setFormError('')
    try {
      await api.put(`/areas/${editingArea.id}`, {
        nombre: form.nombre, tipo: form.tipo,
        temp_min: numOrNull(form.temp_min), temp_max: numOrNull(form.temp_max),
        humedad_min: form.tipo === 'ambiente' ? numOrNull(form.humedad_min) : null,
        humedad_max: form.tipo === 'ambiente' ? numOrNull(form.humedad_max) : null,
      })
      setEditingArea(null); await loadAreas(); showMsg(setFeedback, 'Área actualizada.')
    } catch (err) { setFormError(err.response?.data?.detail || 'Error al guardar') }
    finally { setSaving(false) }
  }

  async function handleDelete(areaId) {
    try { const r = await api.delete(`/areas/${areaId}`); await loadAreas(); showMsg(setFeedback, r.data.mensaje) }
    catch (err) { showMsg(setFeedback, err.response?.data?.detail || 'Error al eliminar') }
  }

  async function handleToggle(area) {
    try { await api.put(`/areas/${area.id}`, { activa: !area.activa }); await loadAreas(); showMsg(setFeedback, area.activa ? 'Área desactivada.' : 'Área activada.') }
    catch (err) { showMsg(setFeedback, err.response?.data?.detail || 'Error') }
  }

  const areasActivas   = areas.filter(a => a.activa)
  const areasInactivas = areas.filter(a => !a.activa)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-surface-500">Gestiona las áreas de monitoreo por sede</p>
        <select value={sedeId} onChange={e => { setSedeId(e.target.value); setEditingArea(null); setShowNew(false) }}
          className="input-base w-auto">
          <option value="">Selecciona sede…</option>
          {sedesVisibles.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </select>
      </div>

      <Feedback msg={feedback} />

      {!sedeId ? (
        <div className="card"><EmptyState icon={Wind} title="Selecciona una sede" description="Elige una sede para gestionar sus áreas de monitoreo." /></div>
      ) : loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
      ) : (
        <div className="space-y-3">
          {areasActivas.map(area =>
            editingArea?.id === area.id ? (
              <AreaForm key={area.id}
                initial={{ nombre: area.nombre, tipo: area.tipo || 'nevera', temp_min: area.temp_min ?? '', temp_max: area.temp_max ?? '', humedad_min: area.humedad_min ?? '', humedad_max: area.humedad_max ?? '' }}
                onSave={handleSaveEdit} onCancel={() => { setEditingArea(null); setFormError('') }}
                saving={saving} error={formError} />
            ) : (
              <AreaRow key={area.id} area={area}
                onEdit={a => { setEditingArea(a); setShowNew(false); setFormError('') }}
                onDelete={handleDelete} onToggle={handleToggle} />
            )
          )}

          {showNew && (
            <AreaForm initial={FORM_AREA_EMPTY} onSave={handleSaveNew}
              onCancel={() => { setShowNew(false); setFormError('') }}
              saving={saving} error={formError} />
          )}

          {!showNew && (
            <button onClick={() => { setShowNew(true); setEditingArea(null); setFormError('') }}
              className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-surface-200 hover:border-brand-400 hover:bg-brand-50 text-surface-400 hover:text-brand-600 rounded-2xl py-3 text-sm font-medium transition-colors">
              <Plus size={16} /> Nueva área
            </button>
          )}

          {areasInactivas.length > 0 && (
            <details className="group">
              <summary className="flex items-center gap-2 text-xs text-surface-400 cursor-pointer select-none py-2 list-none hover:text-surface-600 transition-colors">
                <ChevronDown size={14} className="group-open:rotate-180 transition-transform" />
                {areasInactivas.length} área{areasInactivas.length > 1 ? 's' : ''} inactiva{areasInactivas.length > 1 ? 's' : ''}
              </summary>
              <div className="space-y-2 mt-2">
                {areasInactivas.map(area => (
                  <AreaRow key={area.id} area={area}
                    onEdit={a => { setEditingArea(a); setShowNew(false) }}
                    onDelete={handleDelete} onToggle={handleToggle} />
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════
   TAB — SEDES
═══════════════════════════════════════════════════════════════ */
const FORM_SEDE_EMPTY = { nombre: '', descripcion: '' }

function SedeForm({ initial, onSave, onCancel, saving, error }) {
  const [form, setForm] = useState(initial)
  return (
    <div className="bg-surface-50 border border-surface-200 rounded-2xl p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-surface-500 mb-1">Nombre <span className="text-danger-400">*</span></label>
          <input autoFocus type="text" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
            placeholder="Ej: Sede Norte" className="input-base" />
        </div>
        <div>
          <label className="block text-xs font-medium text-surface-500 mb-1">Descripción</label>
          <input type="text" value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
            placeholder="Opcional" className="input-base" />
        </div>
      </div>
      {error && <p className="text-xs text-danger-600 flex items-center gap-1.5"><AlertTriangle size={12} />{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onCancel} className="btn btn-sm btn-secondary">Cancelar</button>
        <button onClick={() => onSave(form)} disabled={!form.nombre || saving} className="btn btn-sm btn-primary">
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}

function SedeRow({ sede, onEdit, onToggle }) {
  return (
    <div className={cn('rounded-2xl border p-4 bg-white flex items-center gap-4 transition-colors',
      sede.activa ? 'border-surface-200' : 'border-surface-100 opacity-60')}>
      <div className={cn('p-2 rounded-xl shrink-0', sede.activa ? 'bg-brand-50' : 'bg-surface-100')}>
        <Building2 size={18} className={sede.activa ? 'text-brand-600' : 'text-surface-400'} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-surface-800 text-sm">{sede.nombre}</span>
          {!sede.activa && <span className="badge badge-muted">Inactiva</span>}
        </div>
        {sede.descripcion && <p className="text-xs text-surface-400 mt-0.5 truncate">{sede.descripcion}</p>}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={() => onToggle(sede)} title={sede.activa ? 'Desactivar' : 'Activar'}
          className="p-1.5 rounded-lg text-surface-400 hover:text-surface-700 hover:bg-surface-100 transition-colors">
          {sede.activa ? <ToggleRight size={20} className="text-ok-500" /> : <ToggleLeft size={20} />}
        </button>
        <button onClick={() => onEdit(sede)} className="p-1.5 rounded-lg text-surface-400 hover:text-brand-600 hover:bg-brand-50 transition-colors">
          <Pencil size={15} />
        </button>
      </div>
    </div>
  )
}

function TabSedes() {
  const [sedes, setSedes]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [editingSede, setEditingSede] = useState(null)
  const [showNew, setShowNew]       = useState(false)
  const [saving, setSaving]         = useState(false)
  const [formError, setFormError]   = useState('')
  const [feedback, setFeedback]     = useState('')

  const loadSedes = useCallback(async () => {
    setLoading(true)
    try {
      // Admin ve todas incluyendo inactivas — hit directo a la lista filtrada por permisos
      const r = await api.get('/sedes')
      setSedes(r.data)
    } catch { setSedes([]) } finally { setLoading(false) }
  }, [])

  useEffect(() => { loadSedes() }, [loadSedes])

  async function handleCreate(form) {
    setSaving(true); setFormError('')
    try {
      await api.post('/sedes', { nombre: form.nombre, descripcion: form.descripcion || null })
      setShowNew(false); await loadSedes(); showMsg(setFeedback, 'Sede creada correctamente.')
    } catch (err) { setFormError(err.response?.data?.detail || 'Error al crear la sede') }
    finally { setSaving(false) }
  }

  async function handleEdit(form) {
    setSaving(true); setFormError('')
    try {
      await api.put(`/sedes/${editingSede.id}`, { nombre: form.nombre, descripcion: form.descripcion || null })
      setEditingSede(null); await loadSedes(); showMsg(setFeedback, 'Sede actualizada.')
    } catch (err) { setFormError(err.response?.data?.detail || 'Error al actualizar') }
    finally { setSaving(false) }
  }

  async function handleToggle(sede) {
    try {
      await api.put(`/sedes/${sede.id}`, { activa: !sede.activa })
      await loadSedes(); showMsg(setFeedback, sede.activa ? 'Sede desactivada.' : 'Sede activada.')
    } catch (err) { showMsg(setFeedback, err.response?.data?.detail || 'Error') }
  }

  const sedesActivas   = sedes.filter(s => s.activa)
  const sedesInactivas = sedes.filter(s => !s.activa)

  return (
    <div className="space-y-4">
      <p className="text-sm text-surface-500">Gestiona las sedes de la organización</p>
      <Feedback msg={feedback} />

      {loading ? (
        <div className="space-y-2">{[1,2].map(i => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
      ) : (
        <div className="space-y-3">
          {sedesActivas.map(sede =>
            editingSede?.id === sede.id ? (
              <SedeForm key={sede.id}
                initial={{ nombre: sede.nombre, descripcion: sede.descripcion ?? '' }}
                onSave={handleEdit} onCancel={() => { setEditingSede(null); setFormError('') }}
                saving={saving} error={formError} />
            ) : (
              <SedeRow key={sede.id} sede={sede}
                onEdit={s => { setEditingSede(s); setShowNew(false); setFormError('') }}
                onToggle={handleToggle} />
            )
          )}

          {showNew && (
            <SedeForm initial={FORM_SEDE_EMPTY} onSave={handleCreate}
              onCancel={() => { setShowNew(false); setFormError('') }}
              saving={saving} error={formError} />
          )}

          {!showNew && (
            <button onClick={() => { setShowNew(true); setEditingSede(null); setFormError('') }}
              className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-surface-200 hover:border-brand-400 hover:bg-brand-50 text-surface-400 hover:text-brand-600 rounded-2xl py-3 text-sm font-medium transition-colors">
              <Plus size={16} /> Nueva sede
            </button>
          )}

          {sedesInactivas.length > 0 && (
            <details className="group">
              <summary className="flex items-center gap-2 text-xs text-surface-400 cursor-pointer select-none py-2 list-none hover:text-surface-600 transition-colors">
                <ChevronDown size={14} className="group-open:rotate-180 transition-transform" />
                {sedesInactivas.length} sede{sedesInactivas.length > 1 ? 's' : ''} inactiva{sedesInactivas.length > 1 ? 's' : ''}
              </summary>
              <div className="space-y-2 mt-2">
                {sedesInactivas.map(sede => <SedeRow key={sede.id} sede={sede} onEdit={s => { setEditingSede(s); setShowNew(false) }} onToggle={handleToggle} />)}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════
   TAB — USUARIOS
═══════════════════════════════════════════════════════════════ */
const ROL_META = {
  admin: { label: 'Admin',   badge: 'bg-brand-100 text-brand-700', Icon: Shield },
  user:  { label: 'Usuario', badge: 'bg-surface-100 text-surface-600', Icon: User },
}

function Initials({ nombre }) {
  const parts = (nombre ?? '').trim().split(' ')
  const ini = parts.length >= 2 ? parts[0][0] + parts[1][0] : (parts[0]?.[0] ?? '?')
  return (
    <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
      <span className="text-xs font-bold text-brand-700 uppercase">{ini}</span>
    </div>
  )
}

function PasswordInput({ value, onChange, name, placeholder }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input type={show ? 'text' : 'password'} name={name} value={value} onChange={onChange}
        placeholder={placeholder} className="input-base pr-9" autoComplete="new-password" />
      <button type="button" onClick={() => setShow(v => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600">
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  )
}

const FORM_USER_EMPTY = { nombre: '', username: '', password: '', rol: 'user', sedes: [], activo: true }

function UserForm({ initial, allSedes, onSave, onCancel, saving, error, isEdit = false }) {
  const [form, setForm] = useState(initial)

  function setField(k, v) { setForm(f => ({ ...f, [k]: v })) }
  function toggleSede(id) {
    setForm(f => ({ ...f, sedes: f.sedes.includes(id) ? f.sedes.filter(s => s !== id) : [...f.sedes, id] }))
  }

  const valid = form.nombre && form.username && (!isEdit || form.password === '' || form.password.length >= 4) && (!isEdit ? form.password.length >= 4 : true)

  return (
    <div className="bg-surface-50 border border-surface-200 rounded-2xl p-5 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-surface-500 mb-1">Nombre completo <span className="text-danger-400">*</span></label>
          <input autoFocus type="text" value={form.nombre} onChange={e => setField('nombre', e.target.value)}
            placeholder="Ej: María González" className="input-base" />
        </div>
        <div>
          <label className="block text-xs font-medium text-surface-500 mb-1">Usuario <span className="text-danger-400">*</span></label>
          <input type="text" value={form.username} onChange={e => setField('username', e.target.value)}
            placeholder="Ej: mgonzalez" className="input-base font-mono text-sm" autoComplete="off" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-surface-500 mb-1">
            Contraseña {isEdit && <span className="text-surface-400 font-normal">(dejar en blanco para no cambiar)</span>}
            {!isEdit && <span className="text-danger-400"> *</span>}
          </label>
          <PasswordInput
            name="password"
            value={form.password}
            onChange={e => setField('password', e.target.value)}
            placeholder={isEdit ? '••••••••' : 'Mínimo 4 caracteres'}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-surface-500 mb-1">Rol</label>
          <div className="flex gap-2">
            {Object.entries(ROL_META).map(([val, meta]) => (
              <button key={val} type="button" onClick={() => setField('rol', val)}
                className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-medium transition-colors',
                  form.rol === val ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-surface-200 text-surface-500 hover:border-surface-300 bg-white')}>
                <meta.Icon size={13} />{meta.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sedes */}
      <div>
        <label className="block text-xs font-medium text-surface-500 mb-2">Acceso a sedes</label>
        {form.rol === 'admin' ? (
          <p className="text-xs text-surface-400 italic">Los administradores tienen acceso a todas las sedes.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {allSedes.map(s => {
              const checked = form.sedes.includes(s.id)
              return (
                <label key={s.id} className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors select-none',
                  checked ? 'bg-brand-50 border-brand-200 text-brand-700' : 'bg-white border-surface-200 text-surface-500 hover:border-surface-300'
                )}>
                  <input type="checkbox" checked={checked} onChange={() => toggleSede(s.id)} className="sr-only" />
                  <MapPin size={11} className={checked ? 'text-brand-500' : 'text-surface-400'} />
                  {s.nombre}
                </label>
              )
            })}
          </div>
        )}
      </div>

      {isEdit && (
        <div className="flex items-center gap-3 pt-1">
          <label className="text-xs font-medium text-surface-600">Estado</label>
          <button type="button" onClick={() => setField('activo', !form.activo)}
            className="flex items-center gap-1.5 text-xs">
            {form.activo
              ? <><ToggleRight size={20} className="text-ok-500" /><span className="text-ok-700 font-medium">Activo</span></>
              : <><ToggleLeft size={20} className="text-surface-400" /><span className="text-surface-500">Inactivo</span></>
            }
          </button>
        </div>
      )}

      {error && <p className="text-xs text-danger-600 flex items-center gap-1.5"><AlertTriangle size={12} />{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onCancel} className="btn btn-sm btn-secondary">Cancelar</button>
        <button onClick={() => onSave(form)} disabled={!valid || saving} className="btn btn-sm btn-primary">
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}

function UserRow({ user, allSedes, currentUserId, onEdit, onDelete }) {
  const [confirmando, setConfirmando] = useState(false)
  const rol = ROL_META[user.rol] ?? ROL_META.user
  const esYo = user.id === currentUserId
  const sedesNombres = allSedes.filter(s => user.sedes.includes(s.id)).map(s => s.nombre)

  return (
    <div className={cn('rounded-2xl border p-4 bg-white flex items-center gap-4 transition-colors',
      user.activo ? 'border-surface-200' : 'border-surface-100 opacity-60')}>
      <Initials nombre={user.nombre} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-surface-800 text-sm">{user.nombre}</span>
          <span className={cn('badge text-[10px]', rol.badge)}><rol.Icon size={10} className="mr-0.5 inline" />{rol.label}</span>
          {!user.activo && <span className="badge badge-muted">Inactivo</span>}
          {esYo && <span className="badge badge-brand">Tú</span>}
        </div>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          <span className="text-xs text-surface-400 font-mono">{user.username}</span>
          {user.rol !== 'admin' && sedesNombres.length > 0 && (
            <span className="flex items-center gap-1 text-xs text-surface-400">
              <MapPin size={10} />{sedesNombres.join(', ')}
            </span>
          )}
          {user.rol !== 'admin' && sedesNombres.length === 0 && (
            <span className="text-xs text-warn-500">Sin sedes asignadas</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={() => onEdit(user)} className="p-1.5 rounded-lg text-surface-400 hover:text-brand-600 hover:bg-brand-50 transition-colors">
          <Pencil size={15} />
        </button>
        {!esYo && (
          !confirmando
            ? <button onClick={() => setConfirmando(true)} className="p-1.5 rounded-lg text-surface-400 hover:text-danger-600 hover:bg-danger-50 transition-colors"><Trash2 size={15} /></button>
            : <InlineConfirm label="¿Eliminar?" onConfirm={() => { onDelete(user.id); setConfirmando(false) }} onCancel={() => setConfirmando(false)} />
        )}
      </div>
    </div>
  )
}

function TabUsuarios({ allSedes, currentUserId }) {
  const [users, setUsers]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [editingUser, setEditingUser] = useState(null)
  const [showNew, setShowNew]       = useState(false)
  const [saving, setSaving]         = useState(false)
  const [formError, setFormError]   = useState('')
  const [feedback, setFeedback]     = useState('')

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try { const r = await api.get('/usuarios'); setUsers(r.data) }
    catch { setUsers([]) } finally { setLoading(false) }
  }, [])

  useEffect(() => { loadUsers() }, [loadUsers])

  async function handleCreate(form) {
    setSaving(true); setFormError('')
    try {
      await api.post('/usuarios', {
        nombre: form.nombre, username: form.username, password: form.password,
        rol: form.rol, sedes: form.rol === 'admin' ? [] : form.sedes,
      })
      setShowNew(false); await loadUsers(); showMsg(setFeedback, 'Usuario creado correctamente.')
    } catch (err) { setFormError(err.response?.data?.detail || 'Error al crear usuario') }
    finally { setSaving(false) }
  }

  async function handleEdit(form) {
    setSaving(true); setFormError('')
    try {
      const payload = {
        nombre: form.nombre,
        rol: form.rol,
        activo: form.activo,
        sedes: form.rol === 'admin' ? [] : form.sedes,
      }
      if (form.password) payload.password = form.password
      await api.put(`/usuarios/${editingUser.id}`, payload)
      setEditingUser(null); await loadUsers(); showMsg(setFeedback, 'Usuario actualizado.')
    } catch (err) { setFormError(err.response?.data?.detail || 'Error al guardar') }
    finally { setSaving(false) }
  }

  async function handleDelete(userId) {
    try { await api.delete(`/usuarios/${userId}`); await loadUsers(); showMsg(setFeedback, 'Usuario eliminado.') }
    catch (err) { showMsg(setFeedback, err.response?.data?.detail || 'Error al eliminar') }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-surface-500">Gestiona los usuarios y sus permisos de acceso</p>
      <Feedback msg={feedback} />

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
      ) : (
        <div className="space-y-3">
          {users.map(user =>
            editingUser?.id === user.id ? (
              <UserForm key={user.id} isEdit
                initial={{ nombre: user.nombre, username: user.username, password: '', rol: user.rol, sedes: user.sedes, activo: user.activo }}
                allSedes={allSedes} onSave={handleEdit}
                onCancel={() => { setEditingUser(null); setFormError('') }}
                saving={saving} error={formError} />
            ) : (
              <UserRow key={user.id} user={user} allSedes={allSedes} currentUserId={currentUserId}
                onEdit={u => { setEditingUser(u); setShowNew(false); setFormError('') }}
                onDelete={handleDelete} />
            )
          )}

          {showNew && (
            <UserForm initial={FORM_USER_EMPTY} allSedes={allSedes} onSave={handleCreate}
              onCancel={() => { setShowNew(false); setFormError('') }}
              saving={saving} error={formError} />
          )}

          {!showNew && (
            <button onClick={() => { setShowNew(true); setEditingUser(null); setFormError('') }}
              className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-surface-200 hover:border-brand-400 hover:bg-brand-50 text-surface-400 hover:text-brand-600 rounded-2xl py-3 text-sm font-medium transition-colors">
              <Plus size={16} /> Nuevo usuario
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════
   TAB — ODOO
═══════════════════════════════════════════════════════════════ */
function TabOdoo() {
  const [form, setForm]           = useState({ url: '', database: '', username: '', password: '' })
  const [loaded, setLoaded]       = useState(false)
  const [saving, setSaving]       = useState(false)
  const [testing, setTesting]     = useState(false)
  const [saveMsg, setSaveMsg]     = useState(null)
  const [testResult, setTestResult] = useState(null)
  const [showPwd, setShowPwd]     = useState(false)

  useEffect(() => {
    odooApi.getSettings()
      .then(res => {
        const s = res.data
        setForm({ url: s.url ?? '', database: s.database ?? '', username: s.username ?? '', password: '' })
        setLoaded(true)
      })
      .catch(err => {
        if (err.response?.status !== 404) setSaveMsg({ ok: false, text: 'No se pudo cargar la configuración actual.' })
        setLoaded(true)
      })
  }, [])

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setSaveMsg(null); setTestResult(null)
  }

  async function guardar(e) {
    e.preventDefault()
    if (!form.url || !form.database || !form.username || (!loaded || !form.url ? !form.password : false)) {
      setSaveMsg({ ok: false, text: 'URL, base de datos y usuario son obligatorios.' }); return
    }
    setSaving(true); setSaveMsg(null)
    try {
      await odooApi.saveSettings(form)
      setSaveMsg({ ok: true, text: 'Configuración guardada correctamente.' })
      setForm(f => ({ ...f, password: '' }))
    } catch (err) {
      setSaveMsg({ ok: false, text: err.response?.data?.detail ?? 'Error al guardar.' })
    } finally { setSaving(false) }
  }

  async function probar() {
    setTesting(true); setTestResult(null)
    try {
      const res = await odooApi.testConnection()
      setTestResult(res.data)
    } catch (err) {
      setTestResult({ ok: false, mensaje: err.response?.data?.detail ?? 'Error de conexión.' })
    } finally { setTesting(false) }
  }

  const esEdicion = loaded && !!form.url

  return (
    <div className="space-y-4 max-w-lg">
      <p className="text-sm text-surface-500">Credenciales de conexión al servidor Odoo</p>

      {saveMsg && (
        <div className={cn(
          'flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl border animate-fade-in',
          saveMsg.ok ? 'bg-ok-50 border-ok-200 text-ok-700' : 'bg-danger-50 border-danger-200 text-danger-700',
        )}>
          {saveMsg.ok ? <CheckCircle size={15} /> : <XCircle size={15} />}
          {saveMsg.text}
        </div>
      )}

      <form onSubmit={guardar} className="card p-5 space-y-4">
        <div>
          <label className="block text-xs font-medium text-surface-500 mb-1">URL del servidor</label>
          <input type="url" name="url" value={form.url} onChange={handleChange}
            placeholder="https://miempresa.odoo.com" className="input-base" />
        </div>
        <div>
          <label className="block text-xs font-medium text-surface-500 mb-1">Base de datos</label>
          <input type="text" name="database" value={form.database} onChange={handleChange}
            placeholder="nombre_db" className="input-base font-mono text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-surface-500 mb-1">Usuario</label>
          <input type="text" name="username" value={form.username} onChange={handleChange}
            placeholder="admin@empresa.com" className="input-base" />
        </div>
        <div>
          <label className="block text-xs font-medium text-surface-500 mb-1">
            Contraseña / API Key
            {esEdicion && <span className="ml-1 text-surface-400 font-normal">(dejar en blanco para mantener la actual)</span>}
          </label>
          <div className="relative">
            <input type={showPwd ? 'text' : 'password'} name="password" value={form.password} onChange={handleChange}
              placeholder="••••••••" className="input-base pr-9" autoComplete="new-password" />
            <button type="button" onClick={() => setShowPwd(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600">
              {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button type="submit" disabled={saving || testing} className="btn btn-md btn-primary">
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
          <button type="button" onClick={probar} disabled={testing || saving} className="btn btn-md btn-secondary">
            {testing && <Loader size={14} className="animate-spin" />}
            {testing ? 'Probando…' : 'Probar conexión'}
          </button>
        </div>
      </form>

      {testResult && (
        <div className={cn(
          'flex items-start gap-3 px-4 py-3 rounded-xl border text-sm animate-fade-in',
          testResult.ok ? 'bg-ok-50 border-ok-200 text-ok-800' : 'bg-danger-50 border-danger-200 text-danger-700',
        )}>
          {testResult.ok ? <CheckCircle size={18} className="shrink-0 mt-0.5" /> : <XCircle size={18} className="shrink-0 mt-0.5" />}
          <div>
            <p className="font-medium">{testResult.ok ? 'Conexión exitosa' : 'Error de conexión'}</p>
            <p className="mt-0.5 text-xs opacity-80">{testResult.mensaje}</p>
            {testResult.uid && <p className="mt-0.5 text-xs opacity-60">UID: {testResult.uid}</p>}
          </div>
        </div>
      )}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════
   PÁGINA PRINCIPAL
═══════════════════════════════════════════════════════════════ */
const TABS = [
  { key: 'areas',    label: 'Áreas',    Icon: Thermometer, adminOnly: false },
  { key: 'sedes',    label: 'Sedes',    Icon: Building2,   adminOnly: true },
  { key: 'usuarios', label: 'Usuarios', Icon: UserCog,     adminOnly: true },
  { key: 'odoo',     label: 'Odoo',     Icon: Link2,       adminOnly: true },
]

export default function Configuracion() {
  const { user, isAdmin, sedesPermitidas } = useAuth()
  const [tab, setTab]     = useState('areas')
  const [sedes, setSedes] = useState([])

  useEffect(() => {
    api.get('/sedes').then(r => setSedes(r.data)).catch(() => {})
  }, [])

  const visibleTabs = TABS.filter(t => !t.adminOnly || isAdmin)

  // Si el tab activo ya no es accesible, vuelve al primero
  useEffect(() => {
    if (!visibleTabs.find(t => t.key === tab)) setTab(visibleTabs[0]?.key ?? 'areas')
  }, [isAdmin])

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-surface-900">Configuración</h2>
        <p className="text-sm text-surface-400 mt-0.5">Ajustes del sistema y administración</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-100 p-1 rounded-xl w-fit">
        {visibleTabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn(
              'flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all',
              tab === t.key
                ? 'bg-white shadow-card text-surface-900'
                : 'text-surface-500 hover:text-surface-700',
            )}>
            <t.Icon size={14} />{t.label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {tab === 'areas'    && <TabAreas sedes={sedes} isAdmin={isAdmin} sedesPermitidas={sedesPermitidas} />}
      {tab === 'sedes'    && isAdmin && <TabSedes />}
      {tab === 'usuarios' && isAdmin && <TabUsuarios allSedes={sedes} currentUserId={user?.id} />}
      {tab === 'odoo'     && isAdmin && <TabOdoo />}
    </div>
  )
}
