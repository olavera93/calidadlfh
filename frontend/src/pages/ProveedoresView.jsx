import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Edit2, Trash2, Truck, Mail, Phone, MapPin, X, Upload, Download, CheckCircle, XCircle } from 'lucide-react'
import * as XLSX from 'xlsx'
import api from '../services/api'
import { EmptyState } from '../components/ui/EmptyState'
import Paginator from '../components/ui/Paginator'
import ExcelPreviewModal from '../components/ui/ExcelPreviewModal'
import { ExcelExportButton } from '../components/ui/ExcelActions'
import { useAuth } from '../context/AuthContext'
import PuedeEditar from '../components/PuedeEditar'

export default function ProveedoresView() {
  const navigate = useNavigate()
  const [proveedores, setProveedores] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Referencia para el input file oculto
  const fileInputRef = useRef(null)

  // Filtros
  const [search, setSearch] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')

  // Selección y Paginación
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Modal State para Proveedor
  const [showModal, setShowModal] = useState(false)
  const [editingProveedor, setEditingProveedor] = useState(null)

  /* ── Estados para Modal de Inactivación / Eliminación ─────── */
  const [showModalDelete, setShowModalDelete] = useState(false)
  const [provToDelete, setProvToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)




  // Modal Excel State (Importar / Exportar)
  const [showExcelModal, setShowExcelModal] = useState(false)
  const [excelModalMode, setExcelModalMode] = useState('export') // 'import' | 'export'
  const [excelData, setExcelData] = useState([])

  // Definición de columnas para la previsualización del Excel y la Plantilla
  const excelColumns = [
    { key: 'identificacion', label: 'Identificación / NIT' },
    { key: 'nombre', label: 'Razón Social / Nombre' },
    { key: 'correo', label: 'Correo' },
    { key: 'telefono', label: 'Teléfono' },
    { key: 'direccion', label: 'Dirección' },
    { key: 'banco', label: 'Banco' },
    { key: 'cuenta', label: 'Número de Cuenta' },
    { key: 'terminos', label: 'Términos y Condiciones' },
    { key: 'activo', label: 'Estado' }
  ]

  // Form State
  const [formData, setFormData] = useState({
    nombre: '',
    identificacion: '',
    telefono: '',
    direccion: '',
    correo: '',
    banco: '',
    cuenta: '',
    terminos: '',
    activo: true
  })

  /* ── Cargar Datos de la API ──────────────────────────────── */
  const fetchProveedores = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await api.get('/proveedores')
      setProveedores(response.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al cargar los proveedores')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProveedores()
  }, [fetchProveedores])

  /* ── Búsqueda y Filtrado Dinámico ────────────────────────── */
  const proveedoresFiltrados = useMemo(() => {
    return proveedores.filter((p) => {
      const term = search.toLowerCase()
      const coincideBusqueda =
        p.nombre?.toLowerCase().includes(term) ||
        p.identificacion?.toLowerCase().includes(term) ||
        p.correo?.toLowerCase().includes(term)

      let coincideEstado = true
      if (filtroEstado === 'activos') coincideEstado = Boolean(p.activo) === true
      if (filtroEstado === 'inactivos') coincideEstado = Boolean(p.activo) === false

      return coincideBusqueda && coincideEstado
    })
  }, [proveedores, search, filtroEstado])

  // Resetear a la página 1 cuando cambian los filtros o el tamaño de página
  useEffect(() => {
    setCurrentPage(1)
  }, [search, filtroEstado, itemsPerPage])

  /* ── Paginación ───────────────────────────────────────────── */
  const proveedoresPaginados = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return proveedoresFiltrados.slice(start, start + itemsPerPage)
  }, [proveedoresFiltrados, currentPage, itemsPerPage])

  /* ── Selección ────────────────────────────────────────────── */
  const toggleSelectOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const isPageFullySelected =
    proveedoresPaginados.length > 0 && proveedoresPaginados.every((p) => selectedIds.has(p.id))

  const toggleSelectPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (isPageFullySelected) {
        proveedoresPaginados.forEach((p) => next.delete(p.id))
      } else {
        proveedoresPaginados.forEach((p) => next.add(p.id))
      }
      return next
    })
  }

  const clearSelection = () => setSelectedIds(new Set())

  /* ── Exportar: Abrir Modal Previo ──────────────────────────── */
 const handleOpenExportModal = () => {
    const proveedoresAExportar =
      selectedIds.size > 0
        ? proveedores.filter((p) => selectedIds.has(p.id))
        : proveedoresFiltrados

    if (proveedoresAExportar.length === 0) {
      alert('No hay proveedores para exportar')
      return
    }

    const formattedData = proveedoresAExportar.map((p) => ({
      identificacion: p.identificacion || '',
      nombre: p.nombre || '',
      correo: p.correo || '',
      telefono: p.telefono || '',
      direccion: p.direccion || '',
      banco: p.banco || '',
      cuenta: p.cuenta || '',
      terminos: p.terminos || '',
      activo: Boolean(p.activo) ? 'Activo' : 'Inactivo'
    }))

    setExcelData(formattedData)
    setExcelModalMode('export')
    setShowExcelModal(true)
  }

  /* ── Confirmar Exportación a Archivo Excel ────────────────── */
  const handleConfirmExport = () => {
    const dataToExport = excelData.map((p) => ({
      'Identificación / NIT': p.identificacion,
      'Razón Social / Nombre': p.nombre,
      'Correo': p.correo,
      'Teléfono': p.telefono,
      'Dirección': p.direccion,
      'Banco': p.banco,
      'Número de Cuenta': p.cuenta,
      'Términos y Condiciones': p.terminos,
      'Estado': p.activo
    }))

    const worksheet = XLSX.utils.json_to_sheet(dataToExport)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Proveedores')

    XLSX.writeFile(workbook, `proveedores_${new Date().toISOString().slice(0, 10)}.xlsx`)
    setShowExcelModal(false)
  }

  /* ── Importar: Lectura del Archivo y Parsing de Estado ───── */
 /* ── Importar desde Excel ───────────────────────────── */
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
            const rawEstado = String(
              item['Estado'] || item['activo'] || item['estado'] || ''
            ).trim().toLowerCase()

            let esActivo = true
            if (['inactivo', 'inactiva', 'no', '0', 'false'].includes(rawEstado)) {
              esActivo = false
            }

            return {
              identificacion: String(
                item['Identificación / NIT'] || item['identificacion'] || item['NIT'] || item['ID'] || ''
              ).trim(),
              nombre: String(
                item['Razón Social / Nombre'] || item['nombre'] || item['Nombre'] || ''
              ).trim(),
              correo: String(item['Correo'] || item['correo'] || item['Email'] || '').trim() || null,
              telefono: String(item['Teléfono'] || item['telefono'] || item['Telefono'] || '').trim() || null,
              direccion: String(item['Dirección'] || item['direccion'] || item['Direccion'] || '').trim() || null,
              banco: String(item['Banco'] || item['banco'] || '').trim() || null,
              cuenta: String(item['Número de Cuenta'] || item['cuenta'] || item['Cuenta'] || '').trim() || null,
              terminos: String(item['Términos y Condiciones'] || item['terminos'] || '').trim() || null,
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

  /* ── Confirmar Importación a Backend ───────────────────────── */
  const handleConfirmImport = async (dataToSubmit) => {
    setLoading(true)
    try {
      const response = await api.post('/proveedores/importar-json', dataToSubmit)
      const { creados, actualizados } = response.data

      alert(`Importación completada: ${creados} creados y ${actualizados} actualizados.`)
      setShowExcelModal(false)
      fetchProveedores()
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al procesar la importación de proveedores')
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
        telefono: formData.telefono?.trim() || null,
        direccion: formData.direccion?.trim() || null,
        correo: formData.correo?.trim() || null,
        banco: formData.banco?.trim() || null,
        cuenta: formData.cuenta?.trim() || null,
        terminos: formData.terminos?.trim() || null,
      }
      if (editingProveedor) {
        await api.put(`/proveedores/${editingProveedor.id}`, payload)
      } else {
        await api.post('/proveedores/', payload)
      }
      setShowModal(false)
      fetchProveedores()
    } catch (err) {
      const detail = err.response?.data?.detail
      let mensaje = 'Error al guardar el proveedor'
      if (typeof detail === 'string') {
        mensaje = detail
      } else if (Array.isArray(detail)) {
        mensaje = detail.map((d) => `${d.loc?.[d.loc.length - 1]}: ${d.msg}`).join('\n')
      }
      alert(mensaje)
    }
  }

  /* ── Handlers de Desactivación (Soft Delete) ─────────────── */
  const handleOpenDeleteModal = (prov) => {
    setProvToDelete(prov)
    setShowModalDelete(true)
  }

  const handleDelete = async () => {
    if (!provToDelete) return

    setDeleting(true)
    try {
      await api.delete(`/proveedores/${provToDelete.id}`)
      setShowModalDelete(false)
      setProvToDelete(null)
      fetchProveedores()
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al desactivar el proveedor')
    } finally {
      setDeleting(false)
    }
  }

  /* ── Abrir Modal ─────────────────────────────────────────── */
 const openModal = (prov = null) => {
    if (prov) {
      setEditingProveedor(prov)
      setFormData({
        nombre: prov.nombre || '',
        identificacion: prov.identificacion || '',
        telefono: prov.telefono || '',
        direccion: prov.direccion || '',
        correo: prov.correo || '',
        banco: prov.banco || '',
        cuenta: prov.cuenta || '',
        terminos: prov.terminos || '',
        activo: prov.activo !== undefined ? Boolean(prov.activo) : true
      })
    } else {
      setEditingProveedor(null)
      setFormData({ 
        nombre: '', 
        identificacion: '', 
        telefono: '', 
        direccion: '', 
        correo: '', 
        banco: '',
        cuenta: '',
        terminos: '',
        activo: true 
      })
    }
    setShowModal(true)
  }

  return (
    <div className="space-y-4">
      {/* Input Oculto para Selección de Archivo */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".xlsx, .xls, .csv"
        className="hidden"
      />

      {/* Buscador & Botones de Acción */}
      <div className="card px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1 min-w-[300px]">
          <div className="relative w-full max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
            <input
              type="text"
              placeholder="Buscar por NIT/ID, nombre o correo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-base pl-9 w-full"
            />
          </div>

          {/* Filtro por Estado */}
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="input-base text-xs py-2 px-3 w-36 cursor-pointer"
          >
            <option value="todos">Todos</option>
            <option value="activos">Sólo Activos</option>
            <option value="inactivos">Sólo Inactivos</option>
          </select>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <ExcelExportButton
            columns={excelColumns}
            filename="plantilla_proveedores"
            sheetName="Plantilla Proveedores"
            label="Plantilla"
            isTemplate={true}
          />

          <PuedeEditar>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="border border-surface-200 hover:bg-surface-100 text-surface-700 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
              title="Importar Excel/CSV"
              disabled={loading}
            >
              <Upload size={16} /> Importar
            </button>
          </PuedeEditar>

          <button
            onClick={handleOpenExportModal}
            className="border border-surface-200 hover:bg-surface-100 text-surface-700 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
            title="Exportar a Excel"
          >
            <Download size={16} />
            {selectedIds.size > 0 ? `Exportar (${selectedIds.size})` : 'Exportar'}
          </button>

          <PuedeEditar>
            <button
              onClick={() => openModal()}
              className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Plus size={16} /> Nuevo Proveedor
            </button>
          </PuedeEditar>
        </div>
      </div>

      {/* Alerta de Error */}
      {error && (
        <div className="bg-danger-50 border border-danger-200 rounded-xl px-4 py-3 text-sm text-danger-700">
          {error}
        </div>
      )}

      {/* Tabla de Proveedores */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-surface-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-surface-700">
            Registros <span className="ml-1 font-normal text-surface-400">({proveedoresFiltrados.length})</span>
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
          {proveedoresFiltrados.length === 0 && !loading ? (
            <EmptyState icon={Truck} title="No se encontraron proveedores" />
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
                  <th className="text-left px-5 py-3">Identificación / NIT</th>
                  <th className="text-left px-4 py-3">Razón Social / Nombre</th>
                  <th className="text-left px-4 py-3">Contacto</th>
                  <th className="text-left px-4 py-3">Ubicación</th>
                  <th className="text-center px-4 py-3">Estado</th>
                  <th className="text-right px-5 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {proveedoresPaginados.map((prov) => (
                  <tr key={prov.id} className="border-b border-surface-100 last:border-0 hover:bg-surface-50/60 transition-colors">
                    <td className="px-5 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(prov.id)}
                        onChange={() => toggleSelectOne(prov.id)}
                        className="rounded border-surface-300"
                      />
                    </td>
                    <td className="px-5 py-3 font-mono text-xs font-bold text-surface-600 whitespace-nowrap">
                      {prov.identificacion}
                    </td>
                    <td className="px-4 py-3 text-surface-800 font-medium">
                      <button
                        onClick={() => navigate(`/proveedores/${prov.id}`)}
                        className="hover:text-brand-600 hover:underline transition-colors text-left"
                        title="Ver laboratorios, productos y documentos"
                      >
                        {prov.nombre}
                      </button>
                    </td>
                    <td className="px-4 py-3 space-y-0.5">
                      {prov.correo && (
                        <div className="flex items-center gap-1.5 text-xs text-surface-600">
                          <Mail size={13} className="text-surface-400 shrink-0" />
                          <span>{prov.correo}</span>
                        </div>
                      )}
                      {prov.telefono && (
                        <div className="flex items-center gap-1.5 text-xs text-surface-500">
                          <Phone size={13} className="text-surface-400 shrink-0" />
                          <span>{prov.telefono}</span>
                        </div>
                      )}
                      {!prov.correo && !prov.telefono && <span className="text-surface-400 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-surface-600 text-xs">
                      {prov.direccion ? (
                        <div className="flex items-center gap-1.5">
                          <MapPin size={13} className="text-surface-400 shrink-0" />
                          <span className="truncate max-w-[200px]">{prov.direccion}</span>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    {/* Badge de Estado */}
                    <td className="px-4 py-3 text-center">
                      {Boolean(prov.activo) ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle size={12} /> Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
                          <XCircle size={12} /> Inactivo
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <PuedeEditar>
                        <button
                          onClick={() => openModal(prov)}
                          className="p-1.5 text-surface-400 hover:text-brand-500 hover:bg-brand-50/50 rounded-lg transition-colors mr-1"
                          title="Editar"
                        >
                          <Edit2 size={15} />
                        </button>
                      </PuedeEditar>

                      <PuedeEditar>
                        {Boolean(prov.activo) && (
                          <button
                            onClick={() => handleOpenDeleteModal(prov)}
                            className="p-1.5 text-surface-400 hover:text-danger-500 hover:bg-danger-50/50 rounded-lg transition-colors"
                            title="Desactivar Proveedor"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </PuedeEditar>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <Paginator
          currentPage={currentPage}
          totalItems={proveedoresFiltrados.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      </div>

      {/* Modal Previsualización Excel */}
      <ExcelPreviewModal
        isOpen={showExcelModal}
        onClose={() => setShowExcelModal(false)}
        title={excelModalMode === 'import' ? 'Previsualización de Importación' : 'Previsualización de Exportación'}
        columns={excelColumns}
        data={excelData}
        mode={excelModalMode}
        existingItems={proveedores}
        matchKey="identificacion"
        onConfirmExport={handleConfirmExport}
        onConfirmImport={handleConfirmImport}
        loading={loading}
      />

      {/* Modal Crear / Editar Proveedor */}
      {/* Modal Crear / Editar Proveedor */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-modal border border-surface-100 max-h-[90vh] overflow-y-auto scrollbar-thin">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-semibold text-surface-800">
                {editingProveedor ? 'Editar Proveedor' : 'Nuevo Proveedor'}
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
                <label className="text-xs font-semibold text-surface-600">Nombre o Razón Social</label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="input-base w-full mt-1"
                  placeholder="Ej. Distribuidora Farmacéutica S.A."
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-surface-600">Identificación / NIT</label>
                <input
                  type="text"
                  required
                  value={formData.identificacion}
                  onChange={(e) => setFormData({ ...formData, identificacion: e.target.value })}
                  className="input-base w-full mt-1"
                  placeholder="Ej. 900123456-1"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-surface-600">Teléfono</label>
                  <input
                    type="text"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    className="input-base w-full mt-1"
                    placeholder="Ej. +57 300 123 4567"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-surface-600">Correo Electrónico</label>
                  <input
                    type="email"
                    value={formData.correo}
                    onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                    className="input-base w-full mt-1"
                    placeholder="contacto@proveedor.com"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-surface-600">Dirección</label>
                <input
                  type="text"
                  value={formData.direccion}
                  onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                  className="input-base w-full mt-1"
                  placeholder="Ej. Calle 10 # 15-20"
                />
              </div>

              {/* Información Bancaria */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-xs font-semibold text-surface-600">Banco</label>
                  <input
                    type="text"
                    value={formData.banco}
                    onChange={(e) => setFormData({ ...formData, banco: e.target.value })}
                    className="input-base w-full mt-1"
                    placeholder="Ej. Bancolombia / Davivienda"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-surface-600">Número de Cuenta</label>
                  <input
                    type="text"
                    value={formData.cuenta}
                    onChange={(e) => setFormData({ ...formData, cuenta: e.target.value })}
                    className="input-base w-full mt-1"
                    placeholder="Ej. 123-456789-00"
                  />
                </div>
              </div>

              {/* Términos y Condiciones */}
              <div>
                <label className="text-xs font-semibold text-surface-600">Términos y Condiciones</label>
                <textarea
                  rows={3}
                  value={formData.terminos}
                  onChange={(e) => setFormData({ ...formData, terminos: e.target.value })}
                  className="input-base w-full mt-1 py-2 resize-none text-xs"
                  placeholder="Especifica los términos de pago, días de crédito u otras condiciones de contratación..."
                />
              </div>

              {/* Switch de Estado Activo/Inactivo */}
              <div className="flex items-center justify-between pt-2 border-t border-surface-100">
                <span className="text-xs font-semibold text-surface-600">Estado del Proveedor</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.activo}
                    onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-surface-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                  <span className="ml-2 text-xs font-medium text-surface-700">
                    {formData.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </label>
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

      {/* MODAL DE CONFIRMACIÓN DE DESACTIVACIÓN */}
      {showModalDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-modal border border-surface-100 space-y-4">
            <h3 className="text-base font-semibold text-surface-800">
              ¿Desactivar proveedor?
            </h3>
            <p className="text-xs text-surface-600">
              El proveedor <strong className="text-surface-800">{provToDelete?.nombre}</strong> pasará a estado <strong>Inactivo</strong>. Sus contactos, devoluciones y productos asociados continuarán registrados sin cambios.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowModalDelete(false)
                  setProvToDelete(null)
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
                {deleting ? 'Desactivando...' : 'Desactivar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}