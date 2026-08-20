import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Search, Edit2, Trash2, RotateCcw, Package, Building2, X, Download, Eye, Hash } from 'lucide-react'
import api from '../services/api'
import { EmptyState } from '../components/ui/EmptyState'
import Paginator from '../components/ui/Paginator'
import ExcelPreviewModal from '../components/ui/ExcelPreviewModal'
import { useNavigate } from 'react-router-dom'

export default function DevolucionesView() {
  const [devoluciones, setDevoluciones] = useState([])
  const [productos, setProductos] = useState([])
  const [proveedores, setProveedores] = useState([])

  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(false)
  const [exportingExcel, setExportingExcel] = useState(false)
  const [error, setError] = useState('')

  // Filtros y Búsqueda
  const [search, setSearch] = useState('')
  const [estadoFilter, setEstadoFilter] = useState('')

  // Selección y Paginación
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Modal Crear / Editar Devolución
  const [showModal, setShowModal] = useState(false)
  const [editingDevolucion, setEditingDevolucion] = useState(null)

  // Modal Eliminación
  const [showModalDelete, setShowModalDelete] = useState(false)
  const [devToDelete, setDevToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Modal Excel (Exportar)
  const [showExcelModal, setShowExcelModal] = useState(false)
  const [excelData, setExcelData] = useState([])

  const excelColumns = [
    { key: 'producto', label: 'Producto' },
    { key: 'proveedor', label: 'Proveedor' },
    { key: 'lote', label: 'Lote' },
    { key: 'cantidad', label: 'Cantidad' },
    { key: 'causa', label: 'Causa / Motivo' },
    { key: 'estado', label: 'Estado' },
    { key: 'fecha_creacion', label: 'Fecha Registro' }
  ]

  const initialFormState = {
    producto_id: '',
    proveedor_id: '',
    forma_farmaceutica: '',
    lote: '',
    fecha_de_vencimiento: '',
    fecha_recibido: '',
    fecha_entregado: '',
    registrosanitario: '',
    cantidad: 1,
    causa: '',
    observaciones: '',
    quien_recibe: '',
    quien_entrega: '',
    numero_de_formato: '',
    estado: 'Pendiente'
  }

  const [formData, setFormData] = useState(initialFormState)

  /* ── Cargar Datos Principales y Selects ───────────────────── */
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [resDevs, resProds, resProvs] = await Promise.all([
        api.get('/devoluciones/'),
        api.get('/productos/'),
        api.get('/proveedores/')
      ])
      
      setDevoluciones(Array.isArray(resDevs.data) ? resDevs.data : resDevs.data.items || [])
      setProductos(Array.isArray(resProds.data) ? resProds.data : resProds.data.items || [])
      setProveedores(Array.isArray(resProvs.data) ? resProvs.data : resProvs.data.items || [])
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(Array.isArray(detail) ? detail.map((d) => `${d.loc.slice(-1)}: ${d.msg}`).join(', ') : detail || 'Error al cargar los datos de devoluciones')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  /* ── Auto-completar Registro Sanitario al seleccionar Producto ─ */
  const handleProductoChange = (e) => {
    const prodId = e.target.value
    const selectedProd = productos.find((p) => p.id === Number(prodId))
    
    setFormData((prev) => ({
      ...prev,
      producto_id: prodId,
      registrosanitario: selectedProd?.registro_sanitario || prev.registrosanitario
    }))
  }

  /* ── Auto-completar Quién Recibe al seleccionar Proveedor ────── */
  const handleProveedorChange = (e) => {
    const provId = e.target.value
    const selectedProv = proveedores.find((p) => p.id === Number(provId))

    setFormData((prev) => ({
      ...prev,
      proveedor_id: provId,
      quien_recibe: selectedProv ? selectedProv.nombre : prev.quien_recibe,
    }))
  }

  /* ── Búsqueda y Filtrado ─────────────────────────────────── */
  const devolucionesFiltradas = useMemo(() => {
    return devoluciones.filter((d) => {
      const term = search.toLowerCase()
      const matchesSearch =
        d.numero_de_formato?.toString().toLowerCase().includes(term) ||
        d.causa?.toLowerCase().includes(term) ||
        d.producto?.nombre?.toLowerCase().includes(term) ||
        d.producto?.codigo?.toLowerCase().includes(term) ||
        d.proveedor?.nombre?.toLowerCase().includes(term)

      const matchesEstado = estadoFilter ? d.estado === estadoFilter : true

      return matchesSearch && matchesEstado
    })
  }, [devoluciones, search, estadoFilter])

  useEffect(() => {
    setCurrentPage(1)
  }, [search, estadoFilter, itemsPerPage])

  /* ── Paginación ───────────────────────────────────────────── */
  const devolucionesPaginadas = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return devolucionesFiltradas.slice(start, start + itemsPerPage)
  }, [devolucionesFiltradas, currentPage, itemsPerPage])

  /* ── Selección ────────────────────────────────────────────── */
  const toggleSelectOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const isPageFullySelected =
    devolucionesPaginadas.length > 0 && devolucionesPaginadas.every((d) => selectedIds.has(d.id))

  const toggleSelectPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (isPageFullySelected) {
        devolucionesPaginadas.forEach((d) => next.delete(d.id))
      } else {
        devolucionesPaginadas.forEach((d) => next.add(d.id))
      }
      return next
    })
  }

  const clearSelection = () => setSelectedIds(new Set())

  /* ── Exportar a Excel ─────────────────────────────────────── */
  const handleExportExcel = async () => {
    try {
      setExportingExcel(true)
      const ids = selectedIds.size > 0 ? Array.from(selectedIds).join(',') : undefined

      const response = await api.get('/devoluciones/exportar/excel', {
        params: {
          estado: estadoFilter || undefined,
          ids: ids,
        },
        responseType: 'blob',
      })

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `formato_devoluciones_${new Date().toISOString().slice(0, 10)}.xlsx`)
      document.body.appendChild(link)
      link.click()

      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error exportando Excel:', err)
      let msg = 'Error al generar el archivo Excel'
      if (err.response?.data instanceof Blob) {
        const text = await err.response.data.text()
        try {
          const json = JSON.parse(text)
          msg = json.detail || msg
        } catch {
          // Ignorar fallo de parseo JSON
        }
      }
      alert(msg)
    } finally {
      setExportingExcel(false)
    }
  }

  /* ── Exportar a PDF (Confirmación Modal) ──────────────────── */
  const handleConfirmExport = async () => {
    try {
      setLoading(true)
      const ids = selectedIds.size > 0 ? Array.from(selectedIds).join(',') : null

      const response = await api.get('/devoluciones/exportar/pdf', {
        params: { 
          estado: estadoFilter || undefined,
          ids: ids || undefined 
        },
        responseType: 'blob',
      })

      const blob = new Blob([response.data], {
        type: 'application/pdf',
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `formato_devolucion_${new Date().toISOString().slice(0, 10)}.pdf`)
      document.body.appendChild(link)
      link.click()
      
      link.remove()
      window.URL.revokeObjectURL(url)
      setShowExcelModal(false)
    } catch (err) {
      const detail = err.response?.data?.detail
      alert(Array.isArray(detail) ? detail.map((d) => `${d.loc.slice(-1)}: ${d.msg}`).join('\n') : detail || 'Error al generar el archivo PDF con formato')
    } finally {
      setLoading(false)
    }
  }

  /* ── Guardar / Editar ────────────────────────────────────── */
  const handleSave = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        ...formData,
        producto_id: Number(formData.producto_id),
        proveedor_id: Number(formData.proveedor_id),
        cantidad: Number(formData.cantidad),
        fecha_de_vencimiento: formData.fecha_de_vencimiento || null,
        fecha_recibido: formData.fecha_recibido || null,
        fecha_entregado: formData.fecha_entregado || null,
      }

      if (editingDevolucion) {
        await api.put(`/devoluciones/${editingDevolucion.id}`, payload)
      } else {
        await api.post('/devoluciones/', payload)
      }

      setShowModal(false)
      fetchData()
    } catch (err) {
      const detail = err.response?.data?.detail
      const msg = Array.isArray(detail)
        ? detail.map((d) => `${d.loc.slice(-1)}: ${d.msg}`).join('\n')
        : detail || 'Error al guardar la devolución'
      alert(msg)
    }
  }

  /* ── Eliminación ─────────────────────────────────────────── */
  const handleDelete = async () => {
    if (!devToDelete) return
    setDeleting(true)
    try {
      await api.delete(`/devoluciones/${devToDelete.id}`)
      setShowModalDelete(false)
      setDevToDelete(null)
      fetchData()
    } catch (err) {
      const detail = err.response?.data?.detail
      alert(Array.isArray(detail) ? detail.map((d) => `${d.loc.slice(-1)}: ${d.msg}`).join('\n') : detail || 'Error al eliminar la devolución')
    } finally {
      setDeleting(false)
    }
  }

  /* ── Abrir Modales ────────────────────────────────────────── */
  const openModal = (dev = null) => {
    if (dev) {
      setEditingDevolucion(dev)
      setFormData({
        producto_id: dev.producto_id || '',
        proveedor_id: dev.proveedor_id || '',
        forma_farmaceutica: dev.forma_farmaceutica || '',
        lote: dev.lote || '',
        fecha_de_vencimiento: dev.fecha_de_vencimiento || '',
        fecha_recibido: dev.fecha_recibido || '',
        fecha_entregado: dev.fecha_entregado || '',
        registrosanitario: dev.registrosanitario || '',
        cantidad: dev.cantidad || 1,
        causa: dev.causa || '',
        observaciones: dev.observaciones || '',
        quien_recibe: dev.quien_recibe || '',
        quien_entrega: dev.quien_entrega || '',
        numero_de_formato: dev.numero_de_formato || String(dev.id).padStart(3, '0'),
        estado: dev.estado || 'Pendiente'
      })
    } else {
      setEditingDevolucion(null)
      const formatosUnicos = Array.from(
        new Set(devoluciones.map((d) => parseInt(d.numero_de_formato, 10)).filter(Boolean))
      )
      const maxFormato = formatosUnicos.length > 0 ? Math.max(...formatosUnicos) : 0
      const nuevoConsecutivo = String(maxFormato + 1).padStart(3, '0')
      setFormData({
        ...initialFormState,
        numero_de_formato: nuevoConsecutivo
      })
    }
    setShowModal(true)
  }

  const getBadgeEstado = (estado) => {
    switch (estado) {
      case 'Completado':
      case 'Aprobado':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'Rechazado':
        return 'bg-danger-50 text-danger-700 border-danger-200'
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200'
    }
  }

  return (
    <div className="space-y-4">
      {/* Buscador, Filtro de Estado & Acciones */}
      <div className="card px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 w-full max-w-xl">
          <div className="relative w-full">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
            <input
              type="text"
              placeholder="Buscar por N.º de formato, causa, producto o proveedor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-base pl-9 w-full"
            />
          </div>

          <select
            value={estadoFilter}
            onChange={(e) => setEstadoFilter(e.target.value)}
            className="input-base w-40 shrink-0 text-xs"
          >
            <option value="">Todos los Estados</option>
            <option value="Pendiente">Pendiente</option>
            <option value="Aprobado">Aprobado</option>
            <option value="Rechazado">Rechazado</option>
            <option value="Completado">Completado</option>
          </select>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleExportExcel}
            disabled={exportingExcel}
            className="border border-surface-200 hover:bg-surface-100 text-surface-700 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Exportar a Excel"
          >
            <Download size={16} />
            {exportingExcel
              ? 'Exportando...'
              : selectedIds.size > 0
              ? `Exportar (${selectedIds.size})`
              : 'Exportar'}
          </button>

          <button
            onClick={() => openModal()}
            className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Plus size={16} /> Nueva Devolución
          </button>
        </div>
      </div>

      {/* Alerta de Error */}
      {error && (
        <div className="bg-danger-50 border border-danger-200 rounded-xl px-4 py-3 text-sm text-danger-700">
          {error}
        </div>
      )}

      {/* Tabla de Devoluciones */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-surface-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-surface-700">
            Registros <span className="ml-1 font-normal text-surface-400">({devolucionesFiltradas.length})</span>
          </h3>
          {selectedIds.size > 0 && (
            <button
              onClick={clearSelection}
              className="text-xs font-medium text-brand-500 hover:text-brand-600"
            >
              Limpiar selección ({selectedIds.size})
            </button>
          )}
        </div>

        <div className="overflow-x-auto scrollbar-thin">
          {devolucionesFiltradas.length === 0 && !loading ? (
            <EmptyState icon={RotateCcw} title="No se encontraron devoluciones" />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-100 bg-surface-50 text-xs text-surface-500 uppercase tracking-wide">
                  <th className="text-left px-5 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={isPageFullySelected}
                      onChange={toggleSelectPage}
                      className="rounded border-surface-300"
                    />
                  </th>
                  <th className="text-left px-4 py-3">N.º Formato</th>
                  <th className="text-left px-4 py-3">Proveedor</th>
                  <th className="text-left px-4 py-3">Producto</th>
                  <th className="text-center px-4 py-3">Cantidad</th>
                  <th className="text-left px-4 py-3">Estado</th>
                  <th className="text-right px-5 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {devolucionesPaginadas.map((dev) => (
                  <tr key={dev.id} className="border-b border-surface-100 last:border-0 hover:bg-surface-50/60 transition-colors">
                    <td className="px-5 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(dev.id)}
                        onChange={() => toggleSelectOne(dev.id)}
                        className="rounded border-surface-300"
                      />
                    </td>
                    <td className="px-4 py-3 text-surface-800 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Hash size={14} className="text-surface-400 shrink-0" />
                        <span>{dev.numero_de_formato || String(dev.id).padStart(3, '0')}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-surface-600 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Building2 size={13} className="text-surface-400 shrink-0" />
                        <span>{dev.proveedor?.nombre || '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="flex items-center gap-1.5 font-medium text-surface-800">
                        <Package size={14} className="text-surface-400 shrink-0" />
                        <span>{dev.producto?.nombre || 'Producto no asignado'}</span>
                      </div>
                      {dev.producto?.codigo && (
                        <span className="text-[11px] text-surface-400 font-mono block pl-5">
                          Cod: {dev.producto.codigo}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-surface-700">
                      {dev.cantidad}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getBadgeEstado(dev.estado)}`}>
                        {dev.estado}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => openModal(dev)}
                        className="p-1.5 text-surface-400 hover:text-brand-500 hover:bg-brand-50/50 rounded-lg transition-colors mr-1"
                        title="Editar"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => {
                          setDevToDelete(dev)
                          setShowModalDelete(true)
                        }}
                        className="p-1.5 text-surface-400 hover:text-danger-500 hover:bg-danger-50/50 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={15} />
                      </button>

                      <button
                        onClick={() => navigate(`/devoluciones/${dev.id}`)}
                        className="p-1.5 text-surface-400 hover:text-brand-500 hover:bg-brand-50/50 rounded-lg transition-colors ml-1"
                        title="Ver detalle"
                      >
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <Paginator
          currentPage={currentPage}
          totalItems={devolucionesFiltradas.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      </div>

      {/* Modal Exportación Excel */}
      <ExcelPreviewModal
        isOpen={showExcelModal}
        onClose={() => setShowExcelModal(false)}
        title="Previsualización de Exportación"
        columns={excelColumns}
        data={excelData}
        mode="export"
        onConfirmExport={handleConfirmExport}
        loading={loading}
      />

      {/* Modal Crear / Editar Devolución */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-modal border border-surface-100 max-h-[90vh] overflow-y-auto scrollbar-thin">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-semibold text-surface-800">
                {editingDevolucion ? 'Editar Devolución' : 'Nueva Devolución'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Producto */}
                <div>
                  <label className="text-xs font-semibold text-surface-600">Producto *</label>
                  <select
                    required
                    value={formData.producto_id}
                    onChange={handleProductoChange}
                    className="input-base w-full mt-1"
                  >
                    <option value="">Seleccione un producto...</option>
                    {productos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.codigo} - {p.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Proveedor */}
                <div>
                  <label className="text-xs font-semibold text-surface-600">Proveedor *</label>
                  <select
                    required
                    value={formData.proveedor_id}
                    onChange={handleProveedorChange}
                    className="input-base w-full mt-1"
                  >
                    <option value="">Seleccione un proveedor...</option>
                    {proveedores.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Lote */}
                <div>
                  <label className="text-xs font-semibold text-surface-600">Lote *</label>
                  <input
                    type="text"
                    required
                    value={formData.lote}
                    onChange={(e) => setFormData({ ...formData, lote: e.target.value })}
                    className="input-base w-full mt-1"
                    placeholder="Ej. LOT-2026-A"
                  />
                </div>

                {/* Cantidad */}
                <div>
                  <label className="text-xs font-semibold text-surface-600">Cantidad *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.cantidad}
                    onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
                    className="input-base w-full mt-1"
                  />
                </div>

                {/* Forma Farmacéutica */}
                <div>
                  <label className="text-xs font-semibold text-surface-600">Forma Farmacéutica</label>
                  <input
                    type="text"
                    value={formData.forma_farmaceutica}
                    onChange={(e) => setFormData({ ...formData, forma_farmaceutica: e.target.value })}
                    className="input-base w-full mt-1"
                    placeholder="Ej. Jarabe, Tabletas, Ampolla"
                  />
                </div>

                {/* Fecha Vencimiento */}
                <div>
                  <label className="text-xs font-semibold text-surface-600">Fecha de Vencimiento</label>
                  <input
                    type="date"
                    value={formData.fecha_de_vencimiento}
                    onChange={(e) => setFormData({ ...formData, fecha_de_vencimiento: e.target.value })}
                    className="input-base w-full mt-1"
                  />
                </div>

                {/* Registro Sanitario */}
                <div>
                  <label className="text-xs font-semibold text-surface-600">Registro Sanitario</label>
                  <input
                    type="text"
                    value={formData.registrosanitario}
                    onChange={(e) => setFormData({ ...formData, registrosanitario: e.target.value })}
                    className="input-base w-full mt-1"
                    placeholder="Ej. INVIMA 2020M-0001234"
                  />
                </div>

                {/* Estado */}
                <div>
                  <label className="text-xs font-semibold text-surface-600">Estado</label>
                  <select
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                    className="input-base w-full mt-1"
                  >
                    <option value="Pendiente">Pendiente</option>
                    <option value="Aprobado">Aprobado</option>
                    <option value="Rechazado">Rechazado</option>
                    <option value="Completado">Completado</option>
                  </select>
                </div>

                {/* Quién Entrega */}
                <div>
                  <label className="text-xs font-semibold text-surface-600">Quién Entrega</label>
                  <input
                    type="text"
                    value={formData.quien_entrega}
                    onChange={(e) => setFormData({ ...formData, quien_entrega: e.target.value })}
                    className="input-base w-full mt-1"
                    placeholder="Nombre del responsable"
                  />
                </div>

                {/* Fecha Entregado */}
                <div>
                  <label className="text-xs font-semibold text-surface-600">Fecha de Entrega</label>
                  <input
                    type="date"
                    value={formData.fecha_entregado}
                    onChange={(e) => setFormData({ ...formData, fecha_entregado: e.target.value })}
                    className="input-base w-full mt-1"
                  />
                </div>

                {/* Quién Recibe */}
                <div>
                  <label className="text-xs font-semibold text-surface-600">Quién Recibe (Proveedor)</label>
                  <input
                    type="text"
                    value={formData.quien_recibe}
                    onChange={(e) => setFormData({ ...formData, quien_recibe: e.target.value })}
                    className="input-base w-full mt-1"
                    placeholder="Nombre del responsable"
                  />
                </div>

                {/* Fecha Recibido */}
                <div>
                  <label className="text-xs font-semibold text-surface-600">Fecha de Recepción</label>
                  <input
                    type="date"
                    value={formData.fecha_recibido}
                    onChange={(e) => setFormData({ ...formData, fecha_recibido: e.target.value })}
                    className="input-base w-full mt-1"
                  />
                </div>
              </div>

              {/* Causa / Motivo */}
              <div>
                <label className="text-xs font-semibold text-surface-600">Causa / Motivo</label>
                <select
                  value={formData.causa}
                  onChange={(e) => setFormData({ ...formData, causa: e.target.value })}
                  className="input-base w-full mt-1 bg-white"
                >
                  <option value="">Seleccione una causa...</option>
                  <option value="Producto no conforme">Producto no conforme</option>
                  <option value="Próximos a vencer">Próximos a vencer</option>
                  <option value="Alertas sanitarias">Alertas sanitarias</option>
                  <option value="Baja rotación">Baja rotación</option>
                  <option value="Solicitud del proveedor">Solicitud del proveedor</option>
                  <option value="Solicitud del ente regulatorio INVIMA">Solicitud del ente regulatorio INVIMA</option>
                </select>
              </div>

              {/* Observaciones */}
              <div>
                <label className="text-xs font-semibold text-surface-600">Observaciones</label>
                <textarea
                  rows="2"
                  value={formData.observaciones}
                  onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                  className="input-base w-full mt-1 resize-none"
                  placeholder="Observaciones adicionales..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-surface-100">
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
                  Guardar Devolución
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmación Eliminación */}
      {showModalDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-modal border border-surface-100 space-y-4">
            <h3 className="text-base font-semibold text-surface-800">
              ¿Eliminar devolución?
            </h3>
            <p className="text-xs text-surface-600">
              ¿Estás seguro de que deseas eliminar el registro de devolución del lote{' '}
              <strong className="text-surface-800">{devToDelete?.lote}</strong>? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowModalDelete(false)
                  setDevToDelete(null)
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