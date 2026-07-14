import React, { useEffect, useRef, useState } from 'react'
import { Columns3, Download, EyeOff, History, PackageSearch, Search, X } from 'lucide-react'
import { odoo } from '../../services/api'
import { cn } from '../../lib/utils'
import { EmptyState } from '../../components/ui/EmptyState'
import { TableSkeleton } from '../../components/ui/Skeleton'

const LIMIT = 4000

const DESTINO_OPTIONS = [
  { value: 'principal',   label: 'Principal',   odoo: 'wh/stock' },
  { value: 'teusaquillo', label: 'Teusaquillo', odoo: 'te/stock' },
]

const COLUMNS = [
  { key: 'fecha',       label: 'Fecha' },
  { key: 'origen',      label: 'Origen' },
  { key: 'destino',     label: 'Destino' },
  { key: 'proveedor',   label: 'Proveedor' },
  { key: 'orden',       label: 'N° Orden' },
  { key: 'factura',     label: 'Factura' },
  { key: 'producto',    label: 'Producto' },
  { key: 'lote',        label: 'Lote' },
  { key: 'vencimiento', label: 'Vencimiento' },
  { key: 'cantidad',    label: 'Cantidad' },
]

const UBICACIONES_VIRTUALES = ['virtual locations', 'alistamiento']
const normalizar = (s) =>
  (s || '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const today = () => new Date().toISOString().slice(0, 10)

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

/* ── Checkbox toggle compacto ─────────────────────────────── */
function FilterChip({ label, icon: Icon, checked, onChange, title }) {
  return (
    <label
      title={title}
      className={cn(
        'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium cursor-pointer transition-colors border select-none',
        checked
          ? 'bg-brand-50 border-brand-200 text-brand-700'
          : 'bg-surface-50 border-surface-200 text-surface-500 hover:border-surface-300',
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      {Icon && <Icon size={12} className="shrink-0" />}
      {label}
    </label>
  )
}

export default function OdooRecepciones() {
  const [rows, setRows]         = useState([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const [searched, setSearched] = useState(false)
  const [xlsxLoading, setXlsxLoading] = useState(false)

  const [filters, setFilters] = useState({
    fecha_inicio:      '',
    fecha_fin:         '',
    destino:           DESTINO_OPTIONS[0].value,
    numero_movimiento: '',
  })

  const [ocultarDevolucion, setOcultarDevolucion] = useState(true)
  const [ocultarVirtual,    setOcultarVirtual]    = useState(true)
  const [ocultarServicio,   setOcultarServicio]   = useState(true)
  const [buscarProducto,    setBuscarProducto]    = useState('')

  const [visibleCols, setVisibleCols] = useState(
    () => Object.fromEntries(
      COLUMNS.map(c => [c.key, c.key !== 'origen' && c.key !== 'destino'])
    )
  )
  const [showColPicker, setShowColPicker] = useState(false)
  const colPickerRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (colPickerRef.current && !colPickerRef.current.contains(e.target))
        setShowColPicker(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const set = (k) => (e) => setFilters(f => ({ ...f, [k]: e.target.value }))

  function buildParams() {
    const { destino, ...rest } = filters
    const params = Object.fromEntries(Object.entries(rest).filter(([, v]) => v))
    const opt = DESTINO_OPTIONS.find(o => o.value === destino)
    if (opt) params.ubicacion_destino = opt.odoo
    return params
  }

  async function buscar() {
    setLoading(true); setError(null); setSearched(true)
    try {
      const res = await odoo.getRecepciones(buildParams())
      setRows(res.data)
    } catch (err) {
      setError(err.response?.data?.detail ?? 'Error al consultar Odoo')
      setRows([])
    } finally { setLoading(false) }
  }

  function limpiar() {
    setFilters({ fecha_inicio: '', fecha_fin: '', destino: DESTINO_OPTIONS[0].value, numero_movimiento: '' })
    setRows([]); setSearched(false); setError(null)
    setOcultarDevolucion(true); setOcultarVirtual(true); setOcultarServicio(true)
    setBuscarProducto('')
  }

  async function exportar() {
    setXlsxLoading(true)
    try {
      const res = await odoo.getRecepcionesXlsx(buildParams())
      downloadBlob(res.data, `recepciones_${today()}.xlsx`)
    } catch { /* silencioso */ }
    finally { setXlsxLoading(false) }
  }

  function toggleCol(key) {
    const visible = COLUMNS.filter(c => visibleCols[c.key])
    if (visible.length === 1 && visibleCols[key]) return
    setVisibleCols(v => ({ ...v, [key]: !v[key] }))
  }

  const activeCols    = COLUMNS.filter(c => visibleCols[c.key])
  const hiddenCount   = COLUMNS.filter(c => !visibleCols[c.key]).length
  const filteredRows  = rows
    .filter(r => !ocultarDevolucion || !normalizar(r.orden).includes('devolucion'))
    .filter(r => {
      if (!ocultarVirtual) return true
      const o = normalizar(r.origen), d = normalizar(r.destino)
      return !UBICACIONES_VIRTUALES.some(t => o.includes(t) || d.includes(t))
    })
    .filter(r => !ocultarServicio || !normalizar(r.producto).includes('servicio'))
    .filter(r => !buscarProducto || normalizar(r.producto).includes(normalizar(buscarProducto)))

  const limiteAlcanzado = rows.length >= LIMIT

  const urgenciaVenc = (v) => {
    if (!v) return 'text-surface-400'
    return new Date(v) < new Date() ? 'text-danger-600 font-semibold' : 'text-ok-700'
  }

  return (
    <div className="space-y-4">
      {/* Encabezado */}
      <div>
        <h2 className="text-lg font-bold text-surface-900">Recepciones</h2>
        <p className="text-sm text-surface-400 mt-0.5">Movimientos de entrada de stock en Odoo</p>
      </div>

      {/* Filtros */}
      <div className="card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-surface-500">Desde</label>
            <input type="date" value={filters.fecha_inicio} onChange={set('fecha_inicio')} className="input-base w-40" />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-surface-500">Hasta</label>
            <input type="date" value={filters.fecha_fin} onChange={set('fecha_fin')} className="input-base w-40" />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-surface-500">Destino</label>
            <select value={filters.destino} onChange={set('destino')} className="input-base w-36">
              {DESTINO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-surface-500">N° Movimiento</label>
            <input
              type="text"
              placeholder="WH/PICK/00001"
              value={filters.numero_movimiento}
              onChange={set('numero_movimiento')}
              onKeyDown={e => e.key === 'Enter' && buscar()}
              className="input-base w-44 font-mono text-xs"
            />
          </div>

          <div className="flex gap-2 self-end">
            <button onClick={buscar} disabled={loading} className="btn btn-md btn-primary">
              <Search size={14} />
              {loading ? 'Consultando…' : 'Consultar'}
            </button>
            <button onClick={limpiar} className="btn btn-md btn-ghost">
              <X size={14} />
              Limpiar
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-danger-50 border border-danger-200 rounded-xl px-4 py-3 text-sm text-danger-700">
          {error}
        </div>
      )}

      {/* Aviso límite */}
      {limiteAlcanzado && (
        <div className="bg-warn-50 border border-warn-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-warn-700">
          Se alcanzó el límite de {LIMIT} registros — ajusta los filtros para mayor precisión.
        </div>
      )}

      {/* Tabla */}
      <div className="card overflow-hidden">
        {loading ? (
          <TableSkeleton rows={8} cols={activeCols.length} />
        ) : !searched ? (
          <EmptyState
            icon={PackageSearch}
            title="Aplica filtros y presiona Consultar"
            description="Selecciona un rango de fechas o un número de movimiento."
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={PackageSearch}
            title="Sin resultados"
            description="No se encontraron movimientos con los filtros aplicados."
          />
        ) : (
          <>
            {/* Barra de herramientas */}
            <div className="px-4 py-2.5 border-b border-surface-100 flex flex-wrap items-center gap-3">
              {/* Conteo */}
              <span className="text-xs text-surface-500">
                <span className="font-semibold text-brand-600 tabular">{filteredRows.length}</span>
                <span className="text-surface-400"> / {rows.length} líneas</span>
              </span>

              {/* Buscador local */}
              <div className="flex items-center gap-1.5 border border-surface-200 rounded-lg px-2.5 py-1.5 bg-surface-50 focus-within:border-brand-300 transition-colors">
                <Search size={12} className="text-surface-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Buscar producto…"
                  value={buscarProducto}
                  onChange={e => setBuscarProducto(e.target.value)}
                  className="bg-transparent outline-none text-xs text-surface-700 placeholder:text-surface-400 w-32"
                />
                {buscarProducto && (
                  <button onClick={() => setBuscarProducto('')} className="text-surface-400 hover:text-surface-600">
                    <X size={11} />
                  </button>
                )}
              </div>

              {/* Filtros rápidos como chips */}
              <FilterChip
                label="Sin dev."
                icon={EyeOff}
                checked={ocultarDevolucion}
                onChange={() => setOcultarDevolucion(v => !v)}
                title="Ocultar devoluciones"
              />
              <FilterChip
                label="Sin virt."
                icon={EyeOff}
                checked={ocultarVirtual}
                onChange={() => setOcultarVirtual(v => !v)}
                title="Ocultar ubicaciones virtuales / alistamiento"
              />
              <FilterChip
                label="Sin serv."
                icon={EyeOff}
                checked={ocultarServicio}
                onChange={() => setOcultarServicio(v => !v)}
                title="Ocultar servicios"
              />

              {/* Export + columnas — lado derecho */}
              <div className="ml-auto flex items-center gap-2">
              <button
                onClick={exportar}
                disabled={xlsxLoading}
                className="btn btn-sm btn-success"
              >
                <Download size={13} />
                {xlsxLoading ? 'Exportando…' : 'Exportar Excel'}
              </button>

              {/* Selector de columnas */}
              <div className="relative" ref={colPickerRef}>
                <button
                  onClick={() => setShowColPicker(v => !v)}
                  className={cn(
                    'flex items-center gap-1.5 border rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors',
                    showColPicker
                      ? 'bg-brand-50 border-brand-200 text-brand-700'
                      : 'bg-surface-50 border-surface-200 text-surface-500 hover:border-surface-300',
                  )}
                >
                  <Columns3 size={13} />
                  Columnas
                  {hiddenCount > 0 && (
                    <span className="w-4 h-4 rounded-full bg-brand-600 text-white text-[9px] flex items-center justify-center font-bold">
                      {hiddenCount}
                    </span>
                  )}
                </button>

                {showColPicker && (
                  <div className="absolute right-0 top-full mt-1.5 z-30 bg-white border border-surface-200 rounded-xl shadow-cardMd p-3 w-44">
                    <p className="text-2xs font-bold text-surface-400 uppercase tracking-widest mb-2 px-1">
                      Columnas visibles
                    </p>
                    <div className="space-y-0.5">
                      {COLUMNS.map(col => (
                        <label key={col.key} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={visibleCols[col.key]}
                            onChange={() => toggleCol(col.key)}
                            className="w-3.5 h-3.5 accent-cyan-600"
                          />
                          <span className="text-xs text-surface-600">{col.label}</span>
                        </label>
                      ))}
                    </div>
                    <div className="mt-2 pt-2 border-t border-surface-100">
                      <button
                        onClick={() => setVisibleCols(Object.fromEntries(COLUMNS.map(c => [c.key, true])))}
                        className="w-full text-2xs font-bold text-brand-600 hover:text-brand-800 uppercase tracking-wider py-1"
                      >
                        Mostrar todas
                      </button>
                    </div>
                  </div>
                )}
              </div>
              </div>{/* /lado derecho */}
            </div>

            {/* Tabla */}
            {filteredRows.length === 0 ? (
              <EmptyState
                icon={PackageSearch}
                title="Sin resultados con los filtros de vista"
                description="Desactiva algún filtro rápido para ver más registros."
              />
            ) : (
              <div className="overflow-auto max-h-[calc(100vh-22rem)] scrollbar-thin">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-surface-50">
                    <tr className="border-b border-surface-200">
                      {activeCols.map(col => (
                        <th key={col.key} className="px-3 py-2.5 text-left text-xs font-medium text-surface-500 uppercase tracking-wide whitespace-nowrap">
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100">
                    {filteredRows.map((r, i) => {
                      const cellMap = {
                        fecha:       <td key="fecha"       className="px-3 py-2 whitespace-nowrap tabular text-surface-600">{r.fecha || '—'}</td>,
                        origen:      <td key="origen"      className="px-3 py-2 text-surface-500 max-w-[140px] truncate" title={r.origen}>{r.origen || '—'}</td>,
                        destino:     <td key="destino"     className="px-3 py-2 text-surface-500 max-w-[140px] truncate" title={r.destino}>{r.destino || '—'}</td>,
                        proveedor:   <td key="proveedor"   className="px-3 py-2 max-w-[180px] truncate text-surface-700" title={r.proveedor}>{r.proveedor || '—'}</td>,
                        orden:       <td key="orden"       className="px-3 py-2 whitespace-nowrap font-medium text-surface-800">
                                       <span className="inline-flex items-center gap-1.5">
                                         {r.orden || '—'}
                                         {r.orden_inferida && (
                                           <History size={12} className="text-warn-500 shrink-0" title="Orden inferida por lote/producto" />
                                         )}
                                       </span>
                                     </td>,
                        factura:     <td key="factura"     className="px-3 py-2 whitespace-nowrap text-brand-600 font-medium">{r.factura || '—'}</td>,
                        producto:    <td key="producto"    className="px-3 py-2 max-w-[220px] truncate text-surface-800" title={r.producto}>{r.producto || '—'}</td>,
                        lote:        <td key="lote"        className="px-3 py-2 whitespace-nowrap font-mono text-xs font-semibold text-surface-700">{r.lote || '—'}</td>,
                        vencimiento: <td key="vencimiento" className={cn('px-3 py-2 whitespace-nowrap tabular', urgenciaVenc(r.vencimiento))}>{r.vencimiento || '—'}</td>,
                        cantidad:    <td key="cantidad"    className="px-3 py-2 whitespace-nowrap text-right font-semibold tabular text-surface-800">{r.cantidad ?? '—'}</td>,
                      }
                      return (
                        <tr key={i} className="hover:bg-surface-50 transition-colors">
                          {activeCols.map(col => cellMap[col.key])}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
