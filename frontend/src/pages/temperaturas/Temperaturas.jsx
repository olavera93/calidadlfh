import React, { useEffect, useState } from 'react'
import { Settings } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import { cn } from '../../lib/utils'
import DayView from './DayView'
import MonthView from './MonthView'
import Configuracion from '../configuracion/Configuracion'

const TABS = [
  { key: 'dia', label: 'Vista del día' },
  { key: 'mes', label: 'Historial del mes' },
]

export default function Temperaturas() {
  const { isAdmin, sedesPermitidas } = useAuth()

  const [sedes, setSedes]   = useState([])
  const [sedeId, setSedeId] = useState('')
  const [areas, setAreas]   = useState([])
  const [tab, setTab]       = useState('dia')

  useEffect(() => {
    api.get('/sedes').then(r => {
      setSedes(r.data)
      if (r.data.length === 1) setSedeId(String(r.data[0].id))
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!sedeId) { setAreas([]); return }
    api.get(`/sedes/${sedeId}/areas`).then(r => setAreas(r.data)).catch(() => setAreas([]))
  }, [sedeId])

  const sedesVisibles = sedes.filter(s => isAdmin || sedesPermitidas.includes(s.id))
  const enConfig = tab === 'config'

  return (
    <div className="space-y-5">
      {/* Tabs y Select en la misma fila */}
      <div className="flex items-center justify-between border-b border-surface-200 gap-4">
        <div className="flex">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                tab === t.key
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-surface-400 hover:text-surface-700 hover:border-surface-300',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {!enConfig && (
          <select
            value={sedeId}
            onChange={e => setSedeId(e.target.value)}
            className="input-base w-auto mb-1.5"
          >
            <option value="">Selecciona sede...</option>
            {sedesVisibles.map(s => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </select>
        )}
      </div>

      {tab === 'dia' && <DayView sedeId={sedeId} areas={areas} />}
      {tab === 'mes' && <MonthView sedeId={sedeId} areas={areas} />}
    </div>
  )
}