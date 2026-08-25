import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit2, Trash2, X, Printer, Plus, Download } from 'lucide-react'
import api from '../services/api'

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

export default function DevolucionDetalleView() {
  const { id: devolucionId } = useParams()
  const navigate = useNavigate()

  const [itemsDevolucion, setItemsDevolucion] = useState([])
  const [productos, setProductos] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')

  // Modales de productos
  const [showModalAdd, setShowModalAdd] = useState(false)
  const [showModalEdit, setShowModalEdit] = useState(false)
  const [itemToEdit, setItemToEdit] = useState(null)
  const [formData, setFormData] = useState(initialFormState)
  const [saving, setSaving] = useState(false)

  // Modal para editar cabecera / formato general
  const [showModalHeaderEdit, setShowModalHeaderEdit] = useState(false)
  const [headerFormData, setHeaderFormData] = useState({
    proveedor_id: '',
    quien_recibe: '',
    quien_entrega: '',
    fecha_recibido: '',
    fecha_entregado: '',
    observaciones: '',
    numero_de_formato: '',
    estado: 'Pendiente'
  })

  // Modal Eliminación
  const [showModalDelete, setShowModalDelete] = useState(false)
  const [itemToDelete, setItemToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Registro principal (el primero del grupo)
  const devolucionPrincipal = itemsDevolucion[0] || null

  const getBadgeEstado = (estado) => {
    switch (estado) {
      case 'pendiente':
      case 'Cambio Mano a Mano':
      case 'NotaCredito':
      case'Recogido':
      case 'Completado':
      case 'Otro':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'Destruido':
        return 'bg-danger-50 text-danger-700 border-danger-200'
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200'
    }
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [resDevs, resProds, resProvs] = await Promise.all([
        api.get('/devoluciones/'),
        api.get('/productos/', { params: { limit: 1000 } }),
        api.get('/proveedores/')
      ])

      const devolucionesArray = Array.isArray(resDevs.data) ? resDevs.data : (resDevs.data?.items || resDevs.data?.data || [])
      const productosArray = Array.isArray(resProds.data) ? resProds.data : (resProds.data?.items || resProds.data?.data || [])
      const proveedoresArray = Array.isArray(resProvs.data) ? resProvs.data : (resProvs.data?.items || resProvs.data?.data || [])

      setProductos(productosArray)
      setProveedores(proveedoresArray)

      // Encontrar la devolución inicial para conocer su numero_de_formato
      const inicial = devolucionesArray.find((d) => String(d.id) === String(devolucionId))
      if (!inicial) {
        setError('Devolución no encontrada.')
        return
      }

      // Si tiene número de formato, traemos todos los ítems de ese formato
      if (inicial.numero_de_formato) {
        const agrupar = devolucionesArray.filter((d) => d.numero_de_formato === inicial.numero_de_formato)
        setItemsDevolucion(agrupar.length > 0 ? agrupar : [inicial])
      } else {
        setItemsDevolucion([inicial])
      }
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(Array.isArray(detail) ? detail.map((d) => `${d.loc.slice(-1)}: ${d.msg}`).join(', ') : detail || 'Error al cargar los datos')
    } finally {
      setLoading(false)
    }
  }, [devolucionId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleProductoChange = (e) => {
    const prodId = e.target.value
    const selectedProd = productos.find((p) => p.id === Number(prodId))
    setFormData((prev) => ({
      ...prev,
      producto_id: prodId,
      registrosanitario: selectedProd?.registro_sanitario || prev.registrosanitario
    }))
  }

  const handleHeaderProveedorChange = (e) => {
    const provId = e.target.value
    const selectedProv = proveedores.find((p) => p.id === Number(provId))
    setHeaderFormData((prev) => ({
      ...prev,
      proveedor_id: provId,
      quien_recibe: selectedProv ? selectedProv.nombre : prev.quien_recibe
    }))
  }

  /* Abrir Modal de Agregar Producto al mismo formato */
  const handleOpenAdd = () => {
    if (!devolucionPrincipal) return
    setFormData({
      ...initialFormState,
      proveedor_id: devolucionPrincipal.proveedor_id || '',
      numero_de_formato: devolucionPrincipal.numero_de_formato || '',
      observaciones: devolucionPrincipal.observaciones || '',
      quien_entrega: devolucionPrincipal.quien_entrega || '',
      quien_recibe: devolucionPrincipal.quien_recibe || '',
      fecha_recibido: devolucionPrincipal.fecha_recibido || '',
      fecha_entregado: devolucionPrincipal.fecha_entregado || '',
      estado: devolucionPrincipal.estado || 'Pendiente'
    })
    setShowModalAdd(true)
  }

  const handleSaveAdd = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...formData,
        producto_id: Number(formData.producto_id),
        proveedor_id: Number(devolucionPrincipal.proveedor_id),
        cantidad: Number(formData.cantidad),
        numero_de_formato: devolucionPrincipal.numero_de_formato || null,
        observaciones: devolucionPrincipal.observaciones || '',
        quien_entrega: devolucionPrincipal.quien_entrega || '',
        quien_recibe: devolucionPrincipal.quien_recibe || '',
        estado: devolucionPrincipal.estado || 'Pendiente',
        fecha_de_vencimiento: formData.fecha_de_vencimiento || null,
        fecha_recibido: devolucionPrincipal.fecha_recibido || null,
        fecha_entregado: devolucionPrincipal.fecha_entregado || null
      }
      await api.post('/devoluciones/', payload)
      setShowModalAdd(false)
      fetchData()
    } catch (err) {
      const detail = err.response?.data?.detail
      const msg = Array.isArray(detail)
        ? detail.map((d) => `${d.loc.slice(-1)}: ${d.msg}`).join('\n')
        : detail || 'Error al agregar el ítem'
      alert(msg)
    } finally {
      setSaving(false)
    }
  }

  /* Abrir Modal de Editar Datos Generales del Formato */
  const handleOpenHeaderEdit = () => {
    if (!devolucionPrincipal) return
    setHeaderFormData({
      proveedor_id: devolucionPrincipal.proveedor_id || '',
      quien_recibe: devolucionPrincipal.quien_recibe || '',
      quien_entrega: devolucionPrincipal.quien_entrega || '',
      fecha_recibido: devolucionPrincipal.fecha_recibido || '',
      fecha_entregado: devolucionPrincipal.fecha_entregado || '',
      observaciones: devolucionPrincipal.observaciones || '',
      numero_de_formato: devolucionPrincipal.numero_de_formato || '',
      estado: devolucionPrincipal.estado || 'Pendiente'
    })
    setShowModalHeaderEdit(true)
  }

  const handleSaveHeaderEdit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const updatePromises = itemsDevolucion.map((item) => {
        const payload = {
          producto_id: item.producto_id,
          proveedor_id: Number(headerFormData.proveedor_id),
          forma_farmaceutica: item.forma_farmaceutica,
          lote: item.lote,
          fecha_de_vencimiento: item.fecha_de_vencimiento || null,
          fecha_recibido: headerFormData.fecha_recibido || null,
          fecha_entregado: headerFormData.fecha_entregado || null,
          registrosanitario: item.registrosanitario,
          cantidad: item.cantidad,
          causa: item.causa,
          observaciones: headerFormData.observaciones,
          quien_recibe: headerFormData.quien_recibe,
          quien_entrega: headerFormData.quien_entrega,
          numero_de_formato: headerFormData.numero_de_formato,
          estado: headerFormData.estado || 'Pendiente'
        }
        return api.put(`/devoluciones/${item.id}`, payload)
      })

      await Promise.all(updatePromises)
      setShowModalHeaderEdit(false)
      fetchData()
    } catch (err) {
      const detail = err.response?.data?.detail
      const msg = Array.isArray(detail)
        ? detail.map((d) => `${d.loc.slice(-1)}: ${d.msg}`).join('\n')
        : detail || 'Error al actualizar la cabecera del formato'
      alert(msg)
    }finally {
      setSaving(false)
    }
  }

  /* Abrir Modal de Editar Ítem */
  const handleOpenEdit = (item) => {
    setItemToEdit(item)
    setFormData({
      producto_id: item.producto_id || '',
      proveedor_id: item.proveedor_id || '',
      forma_farmaceutica: item.forma_farmaceutica || '',
      lote: item.lote || '',
      fecha_de_vencimiento: item.fecha_de_vencimiento || '',
      fecha_recibido: item.fecha_recibido || '',
      fecha_entregado: item.fecha_entregado || '',
      registrosanitario: item.registrosanitario || '',
      cantidad: item.cantidad || 1,
      causa: item.causa || '',
      observaciones: item.observaciones || '',
      quien_recibe: item.quien_recibe || '',
      quien_entrega: item.quien_entrega || '',
      numero_de_formato: item.numero_de_formato || '',
      estado: item.estado || 'Pendiente'
    })
    setShowModalEdit(true)
  }

  const handleSaveEdit = async (e) => {
    e.preventDefault()
    if (!itemToEdit) return
    setSaving(true)
    try {
      const payload = {
        ...formData,
        producto_id: Number(formData.producto_id),
        proveedor_id: Number(formData.proveedor_id),
        cantidad: Number(formData.cantidad),
        fecha_de_vencimiento: formData.fecha_de_vencimiento || null,
        fecha_recibido: formData.fecha_recibido || null,
        fecha_entregado: formData.fecha_entregado || null
      }
      await api.put(`/devoluciones/${itemToEdit.id}`, payload)
      setShowModalEdit(false)
      fetchData()
    } catch (err) {
      const detail = err.response?.data?.detail
      const msg = Array.isArray(detail)
        ? detail.map((d) => `${d.loc.slice(-1)}: ${d.msg}`).join('\n')
        : detail || 'Error al actualizar el ítem'
      alert(msg)
    } finally {
      setSaving(false)
    }
  }

  /* Eliminar ítem individual */
  const handleDeleteItem = async () => {
    if (!itemToDelete) return
    setDeleting(true)
    try {
      await api.delete(`/devoluciones/${itemToDelete.id}`)
      setShowModalDelete(false)
      if (itemsDevolucion.length === 1) {
        navigate('/devoluciones')
      } else {
        fetchData()
      }
    } catch (err) {
      const detail = err.response?.data?.detail
      alert(Array.isArray(detail) ? detail.map((d) => `${d.loc.slice(-1)}: ${d.msg}`).join('\n') : detail || 'Error al eliminar el ítem')
    } finally {
      setDeleting(false)
    }
  }

  /* Descarga directa de PDF */
  const handleDirectExport = async () => {
    if (itemsDevolucion.length === 0) {
      alert('No hay datos para exportar')
      return
    }

    try {
      setExporting(true)
      const ids = itemsDevolucion.map((d) => d.id).join(',')

      const response = await api.get('/devoluciones/exportar/pdf', {
        params: { ids },
        responseType: 'blob'
      })

      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `formato_devolucion_${devolucionPrincipal.numero_de_formato || 'detalle'}.pdf`)
      document.body.appendChild(link)
      link.click()

      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      const detail = err.response?.data?.detail
      alert(Array.isArray(detail) ? detail.map((d) => `${d.loc.slice(-1)}: ${d.msg}`).join('\n') : detail || 'Error al generar el archivo PDF con formato')
    } finally {
      setExporting(false)
    }
  }

  const fechaCreacionFmt = useMemo(() => {
    if (!devolucionPrincipal?.fecha_creacion) return ''
    return devolucionPrincipal.fecha_creacion.split('T')[0]
  }, [devolucionPrincipal])

  const filasVacias = useMemo(() => {
    const totalMostrados = itemsDevolucion.length
    const faltantes = Math.max(0, 10 - totalMostrados)
    return Array.from({ length: faltantes })
  }, [itemsDevolucion])

  if (loading && itemsDevolucion.length === 0) {
    return <div className="p-8 text-center text-slate-500 text-sm">Cargando devolución...</div>
  }

  if (error) {
    return <div className="p-8 text-center text-red-500 text-sm">{error}</div>
  }

  if (!devolucionPrincipal) {
    return <div className="p-8 text-center text-slate-500 text-sm">Devolución no encontrada.</div>
  }

  return (
    <div className="space-y-4 w-full p-0">
      {/* BARRA DE ACCIONES */}
      <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-sm print:hidden">
        <button
          onClick={() => navigate('/devoluciones')}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={16} /> Volver
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 text-white text-xs font-medium hover:bg-cyan-700 transition-colors"
          >
            <Plus size={14} /> Agregar Producto
          </button>

          <button
            onClick={handleOpenHeaderEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-50 transition-colors"
            title="Editar datos del formato"
          >
            <Edit2 size={14} /> Editar Formato
          </button>

          <button
            onClick={handleDirectExport}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
            title="Exportar PDF"
          >
            <Download size={14} /> {exporting ? 'Exportando...' : 'Exportar'}
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-50 transition-colors"
          >
            <Printer size={14} /> Imprimir / PDF
          </button>
        </div>
      </div>

      {/* DOCUMENTO FORMATO IMPRESO */}
      <div className="bg-white p-4 rounded-lg border border-slate-300 shadow-sm font-sans text-slate-900 text-xs space-y-3 w-full print:p-0 print:border-none print:shadow-none">
        
        {/* CABECERA */}
        <div className="grid grid-cols-12 gap-2 items-stretch">
          <div className="col-span-5 flex flex-col justify-center border border-slate-900 p-3 rounded-sm">
            <h1 className="text-lg font-extrabold text-[#0080C6] tracking-tight uppercase">
              LA FARMACIA HOMEOPÁTICA <span className="text-[#0080C6]">+</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-medium tracking-wide">
              Más alternativas, más servicio
            </p>
          </div>

          <div className="col-span-7 border border-slate-900 text-[11px] font-bold uppercase divide-y divide-slate-900">
            <div className="grid grid-cols-12 divide-x divide-slate-900">
              <span className="col-span-3 bg-slate-100 p-1.5">FECHA:</span>
              <span className="col-span-9 p-1.5 font-mono text-slate-800">{fechaCreacionFmt}</span>
            </div>
            <div className="grid grid-cols-12 divide-x divide-slate-900">
              <span className="col-span-3 bg-slate-100 p-1.5">PROVEEDOR:</span>
              <span className="col-span-9 p-1.5 font-mono text-slate-800">
                {devolucionPrincipal.proveedor?.nombre || devolucionPrincipal.quien_recibe}
              </span>
            </div>
            <div className="grid grid-cols-12 divide-x divide-slate-900">
              <span className="col-span-3 bg-slate-100 p-1.5">OBSERVACIONES:</span>
              <span className="col-span-9 p-1.5 font-mono text-slate-800 whitespace-pre-wrap">
                {devolucionPrincipal.observaciones || ''}
              </span>
            </div>
          </div>
        </div>

        {/* TABLA PRINCIPAL MULTI-PRODUCTO */}
        <div className="overflow-x-auto border border-slate-900 w-full">
          <table className="w-full text-center border-collapse text-[10px] uppercase">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-900 font-bold divide-x divide-slate-900">
                <th className="p-1.5 w-[22%]">DESCRIPCIÓN DEL PRODUCTO FARMACÉUTICO</th>
                <th className="p-1.5 w-[10%]">FORMA FARMACÉUTICA</th>
                <th className="p-1.5 w-[8%]">LOTE</th>
                <th className="p-1.5 w-[10%]">FECHA VENC.</th>
                <th className="p-1.5 w-[11%]">REGISTRO SANITARIO</th>
                <th className="p-1.5 w-[11%]">LABORATORIO</th>
                <th className="p-1.5 w-[5%]">CANT.</th>
                <th className="p-1.5 w-[11%]">CAUSA DEVOLUCIÓN</th>
                <th className="p-1.5 w-[4%] print:hidden">ACC.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900 font-mono text-slate-800">
              {itemsDevolucion.map((item) => (
                <tr key={item.id} className="divide-x divide-slate-900 hover:bg-slate-50 transition-colors">
                  <td className="p-1 font-semibold text-left">{item.producto?.nombre}</td>
                  <td className="p-1">{item.forma_farmaceutica}</td>
                  <td className="p-1">{item.lote}</td>
                  <td className="p-1">{item.fecha_de_vencimiento}</td>
                  <td className="p-1">{item.registrosanitario}</td>
                  <td className="p-1">{item.producto?.laboratorio || item.proveedor?.nombre}</td>
                  <td className="p-1 font-bold">{item.cantidad}</td>
                  <td className="p-1 text-left">{item.causa}</td>
                  <td className="p-1 print:hidden flex items-center justify-center gap-1">
                    <button onClick={() => handleOpenEdit(item)} className="p-0.5 text-slate-600 hover:text-slate-900" title="Editar ítem">
                      <Edit2 size={12} />
                    </button>
                    <button onClick={() => { setItemToDelete(item); setShowModalDelete(true) }} className="p-0.5 text-red-500 hover:text-red-700" title="Eliminar ítem">
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}

              {filasVacias.map((_, idx) => (
                <tr key={`empty-${idx}`} className="divide-x divide-slate-900 h-7">
                  <td className="p-1"></td>
                  <td className="p-1"></td>
                  <td className="p-1"></td>
                  <td className="p-1"></td>
                  <td className="p-1"></td>
                  <td className="p-1"></td>
                  <td className="p-1"></td>
                  <td className="p-1"></td>
                  <td className="p-1 print:hidden"></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* PIE DE PÁGINA */}
        <div className="grid grid-cols-12 border border-slate-900 divide-x divide-slate-900 text-[10px] uppercase font-bold">
          <div className="col-span-4 divide-y divide-slate-900">
            <div className="bg-slate-100 p-1 text-center border-b border-slate-900">QUIEN RECIBE (PROVEEDOR)</div>
            <div className="grid grid-cols-12 divide-x divide-slate-900">
              <span className="col-span-3 p-1.5 bg-slate-50">NOMBRE:</span>
              <span className="col-span-9 p-1.5 font-mono text-slate-800">{devolucionPrincipal.quien_recibe}</span>
            </div>
            <div className="grid grid-cols-12 divide-x divide-slate-900">
              <span className="col-span-3 p-1.5 bg-slate-50">FECHA:</span>
              <span className="col-span-9 p-1.5 font-mono text-slate-800">
                {devolucionPrincipal.fecha_recibido || fechaCreacionFmt}
              </span>
            </div>
          </div>

          <div className="col-span-4 divide-y divide-slate-900">
            <div className="bg-slate-100 p-1 text-center border-b border-slate-900">QUIEN ENTREGA</div>
            <div className="grid grid-cols-12 divide-x divide-slate-900">
              <span className="col-span-3 p-1.5 bg-slate-50">NOMBRE:</span>
              <span className="col-span-9 p-1.5 font-mono text-slate-800">{devolucionPrincipal.quien_entrega}</span>
            </div>
            <div className="grid grid-cols-12 divide-x divide-slate-900">
              <span className="col-span-3 p-1.5 bg-slate-50">FECHA:</span>
              <span className="col-span-9 p-1.5 font-mono text-slate-800">
                {devolucionPrincipal.fecha_entregado || fechaCreacionFmt}
              </span>
            </div>
          </div>

          <div className="col-span-2 flex flex-col divide-y divide-slate-900">
            <div className="bg-slate-100 p-1 text-center border-b border-slate-900">ESTADO</div>
            <div className="flex-1 flex items-center justify-center p-2 bg-white">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold border normal-case ${getBadgeEstado(devolucionPrincipal.estado)}`}>
                {devolucionPrincipal.estado || 'Pendiente'}
              </span>
            </div>
          </div>

          <div className="col-span-2 flex items-center justify-center p-2 bg-slate-50">
            <span className="text-3xl font-extrabold font-mono tracking-tight text-slate-900">
              {devolucionPrincipal.numero_de_formato || devolucionPrincipal.id}
            </span>
          </div>
        </div>

      </div>

      {/* MODAL EDITAR CABECERA DEL FORMATO */}
      {showModalHeaderEdit && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-semibold text-slate-800">
                Editar Datos Generales — Formato N.º {headerFormData.numero_de_formato}
              </h3>
              <button onClick={() => setShowModalHeaderEdit(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveHeaderEdit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="col-span-1 md:col-span-2">
                  <label className="text-xs font-semibold text-slate-600">Proveedor *</label>
                  <select
                    required
                    value={headerFormData.proveedor_id}
                    onChange={handleHeaderProveedorChange}
                    className="w-full mt-1 border border-slate-300 rounded-lg p-2 text-xs"
                  >
                    <option value="">Seleccione un proveedor...</option>
                    {proveedores.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">Quién Entrega</label>
                  <input
                    type="text"
                    value={headerFormData.quien_entrega}
                    onChange={(e) => setHeaderFormData({ ...headerFormData, quien_entrega: e.target.value })}
                    className="w-full mt-1 border border-slate-300 rounded-lg p-2 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">Fecha de Entrega</label>
                  <input
                    type="date"
                    value={headerFormData.fecha_entregado}
                    onChange={(e) => setHeaderFormData({ ...headerFormData, fecha_entregado: e.target.value })}
                    className="w-full mt-1 border border-slate-300 rounded-lg p-2 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">Quién Recibe</label>
                  <input
                    type="text"
                    value={headerFormData.quien_recibe}
                    onChange={(e) => setHeaderFormData({ ...headerFormData, quien_recibe: e.target.value })}
                    className="w-full mt-1 border border-slate-300 rounded-lg p-2 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">Fecha de Recibido</label>
                  <input
                    type="date"
                    value={headerFormData.fecha_recibido}
                    onChange={(e) => setHeaderFormData({ ...headerFormData, fecha_recibido: e.target.value })}
                    className="w-full mt-1 border border-slate-300 rounded-lg p-2 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">Estado *</label>
                  <select
                    required
                    value={headerFormData.estado}
                    onChange={(e) => setHeaderFormData({ ...headerFormData, estado: e.target.value })}
                    className="w-full mt-1 border border-slate-300 rounded-lg p-2 text-xs bg-white"
                  >
                    <option value="Pendiente">Pendiente</option>
                    <option value="Cambio Mano a Mano">Cambio Mano a Mano</option>
                    <option value="NotaCredito">Nota Crédito</option>
                    <option value="Recogido">Recogido</option>
                    <option value="Completado">Completado</option>
                    <option value="Destruido">Destruido</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">Observaciones</label>
                <textarea
                  rows="3"
                  value={headerFormData.observaciones}
                  onChange={(e) => setHeaderFormData({ ...headerFormData, observaciones: e.target.value })}
                  className="w-full mt-1 border border-slate-300 rounded-lg p-2 text-xs resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModalHeaderEdit(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-600 text-white hover:bg-cyan-700 disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Actualizar Cabecera'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL AGREGAR PRODUCTO AL FORMATO */}
      {showModalAdd && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-semibold text-slate-800">
                Agregar Producto al Formato N.º {devolucionPrincipal.numero_de_formato}
              </h3>
              <button onClick={() => setShowModalAdd(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Producto *</label>
                  <select
                    required
                    value={formData.producto_id}
                    onChange={handleProductoChange}
                    className="w-full mt-1 border border-slate-300 rounded-lg p-2 text-xs bg-white"
                  >
                    <option value="">Seleccione un producto...</option>
                    {productos.map((p) => (
                      <option key={p.id} value={p.id}>{p.codigo} - {p.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">Lote *</label>
                  <input
                    type="text"
                    required
                    value={formData.lote}
                    onChange={(e) => setFormData({ ...formData, lote: e.target.value })}
                    className="w-full mt-1 border border-slate-300 rounded-lg p-2 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">Cantidad *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.cantidad}
                    onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
                    className="w-full mt-1 border border-slate-300 rounded-lg p-2 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">Forma Farmacéutica</label>
                  <input
                    type="text"
                    value={formData.forma_farmaceutica}
                    onChange={(e) => setFormData({ ...formData, forma_farmaceutica: e.target.value })}
                    className="w-full mt-1 border border-slate-300 rounded-lg p-2 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">Fecha de Vencimiento</label>
                  <input
                    type="date"
                    value={formData.fecha_de_vencimiento}
                    onChange={(e) => setFormData({ ...formData, fecha_de_vencimiento: e.target.value })}
                    className="w-full mt-1 border border-slate-300 rounded-lg p-2 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">Registro Sanitario</label>
                  <input
                    type="text"
                    value={formData.registrosanitario}
                    onChange={(e) => setFormData({ ...formData, registrosanitario: e.target.value })}
                    className="w-full mt-1 border border-slate-300 rounded-lg p-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">Causa / Motivo</label>
                <select
                  value={formData.causa}
                  onChange={(e) => setFormData({ ...formData, causa: e.target.value })}
                  className="w-full mt-1 border border-slate-300 rounded-lg p-2 text-xs bg-white"
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

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModalAdd(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-600 text-white hover:bg-cyan-700 disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar Ítem'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR ÍTEM */}
      {showModalEdit && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-semibold text-slate-800">
                Editar Producto — {itemToEdit?.producto?.nombre}
              </h3>
              <button onClick={() => setShowModalEdit(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Producto *</label>
                  <select
                    required
                    value={formData.producto_id}
                    onChange={handleProductoChange}
                    className="w-full mt-1 border border-slate-300 rounded-lg p-2 text-xs bg-white"
                  >
                    {productos.map((p) => (
                      <option key={p.id} value={p.id}>{p.codigo} - {p.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">Lote *</label>
                  <input
                    type="text"
                    required
                    value={formData.lote}
                    onChange={(e) => setFormData({ ...formData, lote: e.target.value })}
                    className="w-full mt-1 border border-slate-300 rounded-lg p-2 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">Cantidad *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.cantidad}
                    onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
                    className="w-full mt-1 border border-slate-300 rounded-lg p-2 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">Forma Farmacéutica</label>
                  <input
                    type="text"
                    value={formData.forma_farmaceutica}
                    onChange={(e) => setFormData({ ...formData, forma_farmaceutica: e.target.value })}
                    className="w-full mt-1 border border-slate-300 rounded-lg p-2 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">Fecha de Vencimiento</label>
                  <input
                    type="date"
                    value={formData.fecha_de_vencimiento}
                    onChange={(e) => setFormData({ ...formData, fecha_de_vencimiento: e.target.value })}
                    className="w-full mt-1 border border-slate-300 rounded-lg p-2 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">Registro Sanitario</label>
                  <input
                    type="text"
                    value={formData.registrosanitario}
                    onChange={(e) => setFormData({ ...formData, registrosanitario: e.target.value })}
                    className="w-full mt-1 border border-slate-300 rounded-lg p-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">Causa / Motivo</label>
                <select
                  value={formData.causa}
                  onChange={(e) => setFormData({ ...formData, causa: e.target.value })}
                  className="w-full mt-1 border border-slate-300 rounded-lg p-2 text-xs bg-white"
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

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModalEdit(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Actualizar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ELIMINAR ÍTEM */}
      {showModalDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 border border-slate-200 space-y-4">
            <h3 className="text-base font-semibold text-slate-800">¿Eliminar ítem del formato?</h3>
            <p className="text-xs text-slate-600">
              ¿Deseas eliminar el producto <strong className="text-slate-800">{itemToDelete?.producto?.nombre}</strong> del formato <strong className="text-slate-800">{devolucionPrincipal.numero_de_formato}</strong>?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowModalDelete(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteItem}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
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