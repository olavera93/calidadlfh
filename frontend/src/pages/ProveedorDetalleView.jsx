import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Beaker, Package, FileText, Tag, Mail, Phone, MapPin, Plus, X } from 'lucide-react'
import api from '../services/api'
import { EmptyState } from '../components/ui/EmptyState'

/**
 * Vista de detalle de un Proveedor. Ruta esperada: /proveedores/:id
 *
 * Muestra:
 *  - Datos de contacto del proveedor
 *  - Laboratorios que maneja (derivados de sus productos) y los productos de cada uno
 *  - Documentos asignados al proveedor (directos o a través de sus productos)
 *  - Modal para crear un nuevo documento asociado directamente al proveedor
 */
export default function ProveedorDetalleView() {
  const { id: proveedorId } = useParams()
  const navigate = useNavigate()

  const [proveedor, setProveedor] = useState(null)
  const [productos, setProductos] = useState([])
  const [documentos, setDocumentos] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  /* ── Estados para el Modal de Crear Documento ────────────── */
  const [showModalDocumento, setShowModalDocumento] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [formDocumento, setFormDocumento] = useState({
    nombre_docu: '',
    etiquetas: []
  })

  /* ── Cargar datos ─────────────────────────────────────────── */
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [resProd, resDoc, resProv] = await Promise.all([
        api.get('/productos'),
        api.get('/documentos/'),
        api.get('/proveedores')
      ])

      const productosArray = Array.isArray(resProd.data) ? resProd.data : (resProd.data?.data || [])
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

  /* ── Abrir y Guardar Modal ───────────────────────────────── */
  const handleOpenModal = () => {
    setFormDocumento({
      nombre_docu: '',
      etiquetas: []
    })
    setTagInput('')
    setShowModalDocumento(true)
  }

  const handleSaveDocumento = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        nombre_docu: formDocumento.nombre_docu,
        etiquetas: formDocumento.etiquetas,
        proveedor_id: Number(proveedorId), // Se asocia directamente a este proveedor
        producto_id: null
      }

      await api.post('/documentos/', payload)
      setShowModalDocumento(false)
      fetchData() // Recarga los documentos actualizados
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al guardar el documento')
    }
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
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate('/proveedores')}
            className="p-2 rounded-xl text-surface-500 hover:text-surface-800 hover:bg-surface-100 transition-colors mt-0.5"
            title="Volver a proveedores"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-surface-800">{proveedor.nombre}</h2>
            <p className="text-xs font-mono text-surface-500">{proveedor.identificacion}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-surface-600">
              {proveedor.correo && (
                <span className="flex items-center gap-1.5">
                  <Mail size={13} className="text-surface-400" /> {proveedor.correo}
                </span>
              )}
              {proveedor.telefono && (
                <span className="flex items-center gap-1.5">
                  <Phone size={13} className="text-surface-400" /> {proveedor.telefono}
                </span>
              )}
              {proveedor.direccion && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={13} className="text-surface-400" /> {proveedor.direccion}
                </span>
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
            onClick={handleOpenModal}
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
                <div className="flex items-center gap-2 min-w-0">
                  <FileText size={14} className="text-surface-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-surface-800 truncate">{doc.nombre_docu}</p>
                    {doc.producto && (
                      <p className="text-[11px] text-surface-500">
                        Vía producto: {doc.producto.nombre} ({doc.producto.laboratorio || 'Sin lab'})
                      </p>
                    )}
                  </div>
                </div>
                {Array.isArray(doc.etiquetas) && doc.etiquetas.length > 0 && (
                  <div className="flex flex-wrap gap-1 shrink-0">
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
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* MODAL CREAR DOCUMENTO */}
      {showModalDocumento && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-modal border border-surface-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-semibold text-surface-800">
                Nuevo Documento para {proveedor.nombre}
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
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-brand-500 text-white hover:bg-brand-600 transition-colors shadow-sm"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}