import React, { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import {
  Plus, Pencil, Trash2, Check, X, Thermometer, Wind,
  ChevronDown, AlertTriangle, ToggleLeft, ToggleRight,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { EmptyState } from '../../components/ui/EmptyState'

const TIPOS = [
  { value: 'nevera',   label: 'Nevera',   Icon: Thermometer, color: 'text-brand-600',   bg: 'bg-brand-50',   badge: 'bg-brand-100 text-brand-700' },
  { value: 'ambiente', label: 'Ambiente', Icon: Wind,        color: 'text-ok-600',      bg: 'bg-ok-50',      badge: 'bg-ok-100 text-ok-700' },
]

function getTipo(value) {
  return TIPOS.find(t => t.value === value) ?? TIPOS[0]
}

const FORM_EMPTY = {
  nombre: '', tipo: 'nevera',
  temp_min: '', temp_max: '',
  humedad_min: '', humedad_max: '',
}

function numOrNull(v) {
  const n = parseFloat(v)
  return isNaN(n) ? null : n
}

function RangeField({ label, name, value, onChange, unit }) {
  return (
    <div>
      <label className="block text-xs font-medium text-surface-500 mb-1">{label}</label>
      <div className="relative">
        <input
          type="number"
          step="0.1"
          name={name}
          value={value}
          onChange={onChange}
          placeholder="—"
          className="input-base pr-9 tabular"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-surface-400 pointer-events-none">{unit}</span>
      </div>
    </div>
  )
}

function AreaForm({ initial, onSave, onCancel, saving, error }) {
  const [form, setForm] = useState(initial)
  const esAmbiente = form.tipo === 'ambiente'

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  function handleTipo(value) {
    setForm(f => ({
      ...f, tipo: value,
      humedad_min: value === 'nevera' ? '' : f.humedad_min,
      humedad_max: value === 'nevera' ? '' : f.humedad_max,
    }))
  }

  return (
    <div className="bg-surface-50 border border-surface-200 rounded-2xl p-4 space-y-4">
      {/* Nombre + tipo */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-surface-500 mb-1">Nombre del área</label>
          <input
            autoFocus
            type="text"
            name="nombre"
            value={form.nombre}
            onChange={handleChange}
            placeholder="Ej: Nevera 3"
            className="input-base"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-surface-500 mb-1">Tipo</label>
          <div className="flex gap-2">
            {TIPOS.map(t => {
              const Icon = t.Icon
              const active = form.tipo === t.value
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => handleTipo(t.value)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-medium transition-colors',
                    active
                      ? 'border-brand-400 bg-brand-50 text-brand-700'
                      : 'border-surface-200 text-surface-500 hover:border-surface-300 bg-white',
                  )}
                >
                  <Icon size={13} />
                  {t.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Rangos temperatura */}
      <div>
        <p className="text-xs font-medium text-surface-600 mb-2">Rango de temperatura</p>
        <div className="grid grid-cols-2 gap-3">
          <RangeField label="Mínima" name="temp_min" value={form.temp_min} onChange={handleChange} unit="°C" />
          <RangeField label="Máxima" name="temp_max" value={form.temp_max} onChange={handleChange} unit="°C" />
        </div>
      </div>

      {/* Rangos humedad */}
      {esAmbiente && (
        <div>
          <p className="text-xs font-medium text-surface-600 mb-2">Rango de humedad relativa</p>
          <div className="grid grid-cols-2 gap-3">
            <RangeField label="Mínima" name="humedad_min" value={form.humedad_min} onChange={handleChange} unit="%" />
            <RangeField label="Máxima" name="humedad_max" value={form.humedad_max} onChange={handleChange} unit="%" />
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-danger-600 flex items-center gap-1.5">
          <AlertTriangle size={12} /> {error}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onCancel} className="btn btn-sm btn-secondary">Cancelar</button>
        <button
          onClick={() => onSave(form)}
          disabled={!form.nombre || saving}
          className="btn btn-sm btn-primary"
        >
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}

function AreaRow({ area, onEdit, onDelete, onToggleActiva }) {
  const [confirmando, setConfirmando] = useState(false)
  const tipo = getTipo(area.tipo)
  const Icon = tipo.Icon

  return (
    <div className={cn(
      'rounded-2xl border p-4 transition-colors bg-white',
      area.activa ? 'border-surface-200' : 'border-surface-100 opacity-60',
    )}>
      <div className="flex items-start justify-between gap-4">
        {/* Info */}
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn('p-2 rounded-xl shrink-0', tipo.bg)}>
            <Icon size={17} className={tipo.color} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-surface-800 text-sm">{area.nombre}</span>
              <span className={cn('badge', tipo.badge)}>{tipo.label}</span>
              {!area.activa && <span className="badge badge-muted">Inactiva</span>}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5">
              <span className="text-xs text-surface-500 flex items-center gap-1">
                <Thermometer size={11} className="text-surface-400" />
                {area.temp_min != null ? `${area.temp_min}°C` : '—'}
                {' – '}
                {area.temp_max != null ? `${area.temp_max}°C` : '—'}
              </span>
              {area.tipo === 'ambiente' && (
                <span className="text-xs text-surface-500 flex items-center gap-1">
                  <Wind size={11} className="text-surface-400" />
                  {area.humedad_min != null ? `${area.humedad_min}%` : '—'}
                  {' – '}
                  {area.humedad_max != null ? `${area.humedad_max}%` : '—'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onToggleActiva(area)}
            title={area.activa ? 'Desactivar' : 'Activar'}
            className="p-1.5 rounded-lg text-surface-400 hover:text-surface-700 hover:bg-surface-100 transition-colors"
          >
            {area.activa
              ? <ToggleRight size={20} className="text-ok-500" />
              : <ToggleLeft size={20} />
            }
          </button>
          <button
            onClick={() => onEdit(area)}
            title="Editar"
            className="p-1.5 rounded-lg text-surface-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
          >
            <Pencil size={15} />
          </button>
          {!confirmando ? (
            <button
              onClick={() => setConfirmando(true)}
              title="Eliminar"
              className="p-1.5 rounded-lg text-surface-400 hover:text-danger-600 hover:bg-danger-50 transition-colors"
            >
              <Trash2 size={15} />
            </button>
          ) : (
            <div className="flex items-center gap-1 bg-danger-50 border border-danger-200 rounded-lg px-2 py-1">
              <span className="text-xs text-danger-700 font-medium">¿Confirmar?</span>
              <button onClick={() => { onDelete(area.id); setConfirmando(false) }} className="text-danger-600 hover:text-danger-800">
                <Check size={14} />
              </button>
              <button onClick={() => setConfirmando(false)} className="text-surface-500 hover:text-surface-700">
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Configuracion() {
  const { isAdmin, sedesPermitidas } = useAuth()
  const [sedes, setSedes]           = useState([])
  const [sedeId, setSedeId]         = useState('')
  const [areas, setAreas]           = useState([])
  const [loadingAreas, setLoadingAreas] = useState(false)
  const [editingArea, setEditingArea]   = useState(null)
  const [showNew, setShowNew]           = useState(false)
  const [saving, setSaving]             = useState(false)
  const [formError, setFormError]       = useState('')
  const [feedback, setFeedback]         = useState('')

  useEffect(() => {
    api.get('/sedes').then(r => {
      setSedes(r.data)
      if (r.data.length === 1) setSedeId(String(r.data[0].id))
    }).catch(() => {})
  }, [])

  const loadAreas = useCallback(async () => {
    if (!sedeId) { setAreas([]); return }
    setLoadingAreas(true)
    try {
      const r = await api.get(`/sedes/${sedeId}/areas`, { params: { include_inactive: true } })
      setAreas(r.data)
    } catch {
      setAreas([])
    } finally {
      setLoadingAreas(false)
    }
  }, [sedeId])

  useEffect(() => { loadAreas() }, [loadAreas])

  function showMsg(msg) {
    setFeedback(msg)
    setTimeout(() => setFeedback(''), 3500)
  }

  async function handleSaveNew(form) {
    setSaving(true); setFormError('')
    try {
      await api.post(`/sedes/${sedeId}/areas`, {
        nombre: form.nombre, tipo: form.tipo,
        temp_min: numOrNull(form.temp_min), temp_max: numOrNull(form.temp_max),
        humedad_min: form.tipo === 'ambiente' ? numOrNull(form.humedad_min) : null,
        humedad_max: form.tipo === 'ambiente' ? numOrNull(form.humedad_max) : null,
      })
      setShowNew(false)
      await loadAreas()
      showMsg('Área creada correctamente.')
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Error al crear el área')
    } finally { setSaving(false) }
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
      setEditingArea(null)
      await loadAreas()
      showMsg('Área actualizada.')
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Error al guardar')
    } finally { setSaving(false) }
  }

  async function handleDelete(areaId) {
    try {
      const r = await api.delete(`/areas/${areaId}`)
      await loadAreas()
      showMsg(r.data.mensaje)
    } catch (err) {
      showMsg(err.response?.data?.detail || 'Error al eliminar')
    }
  }

  async function handleToggleActiva(area) {
    try {
      await api.put(`/areas/${area.id}`, { activa: !area.activa })
      await loadAreas()
      showMsg(area.activa ? 'Área desactivada.' : 'Área activada.')
    } catch (err) {
      showMsg(err.response?.data?.detail || 'Error')
    }
  }

  const sedesVisibles  = sedes.filter(s => isAdmin || sedesPermitidas.includes(s.id))
  const areasActivas   = areas.filter(a => a.activa)
  const areasInactivas = areas.filter(a => !a.activa)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-surface-900">Configuración de áreas</h2>
          <p className="text-sm text-surface-400 mt-0.5">Gestiona las áreas de monitoreo por sede</p>
        </div>
        <select
          value={sedeId}
          onChange={e => { setSedeId(e.target.value); setEditingArea(null); setShowNew(false) }}
          className="input-base w-auto"
        >
          <option value="">Selecciona sede…</option>
          {sedesVisibles.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </select>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className="bg-brand-50 border border-brand-200 text-brand-700 text-sm rounded-xl px-4 py-2.5 flex items-center gap-2 animate-fade-in">
          <Check size={15} className="shrink-0" /> {feedback}
        </div>
      )}

      {!sedeId ? (
        <div className="card">
          <EmptyState icon={Wind} title="Selecciona una sede" description="Elige una sede para gestionar sus áreas de monitoreo." />
        </div>
      ) : (
        <div className="space-y-3">
          {loadingAreas && (
            <p className="text-sm text-surface-400">Cargando áreas…</p>
          )}

          {/* Áreas activas */}
          {areasActivas.map(area => (
            editingArea?.id === area.id ? (
              <AreaForm
                key={area.id}
                initial={{
                  nombre: area.nombre, tipo: area.tipo || 'nevera',
                  temp_min: area.temp_min ?? '', temp_max: area.temp_max ?? '',
                  humedad_min: area.humedad_min ?? '', humedad_max: area.humedad_max ?? '',
                }}
                onSave={handleSaveEdit}
                onCancel={() => { setEditingArea(null); setFormError('') }}
                saving={saving}
                error={formError}
              />
            ) : (
              <AreaRow
                key={area.id}
                area={area}
                onEdit={a => { setEditingArea(a); setShowNew(false); setFormError('') }}
                onDelete={handleDelete}
                onToggleActiva={handleToggleActiva}
              />
            )
          ))}

          {/* Formulario nueva área */}
          {showNew && (
            <AreaForm
              initial={FORM_EMPTY}
              onSave={handleSaveNew}
              onCancel={() => { setShowNew(false); setFormError('') }}
              saving={saving}
              error={formError}
            />
          )}

          {/* Botón nueva área */}
          {!showNew && (
            <button
              onClick={() => { setShowNew(true); setEditingArea(null); setFormError('') }}
              className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-surface-200 hover:border-brand-400 hover:bg-brand-50 text-surface-400 hover:text-brand-600 rounded-2xl py-3 text-sm font-medium transition-colors"
            >
              <Plus size={16} /> Nueva área
            </button>
          )}

          {/* Áreas inactivas */}
          {areasInactivas.length > 0 && (
            <details className="group">
              <summary className="flex items-center gap-2 text-xs text-surface-400 cursor-pointer select-none py-2 list-none hover:text-surface-600 transition-colors">
                <ChevronDown size={14} className="group-open:rotate-180 transition-transform" />
                {areasInactivas.length} área{areasInactivas.length > 1 ? 's' : ''} inactiva{areasInactivas.length > 1 ? 's' : ''}
              </summary>
              <div className="space-y-2 mt-2">
                {areasInactivas.map(area => (
                  <AreaRow
                    key={area.id}
                    area={area}
                    onEdit={a => { setEditingArea(a); setShowNew(false) }}
                    onDelete={handleDelete}
                    onToggleActiva={handleToggleActiva}
                  />
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  )
}
