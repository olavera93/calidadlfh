import React, { useCallback, useEffect, useState, useRef } from 'react'
import { Plus, Search, Edit2, Eye, Trash2, Users, X, Upload, Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import api from '../services/api'
import { EmptyState } from '../components/ui/EmptyState'
import Paginator from '../components/ui/Paginator'
import ExcelPreviewModal from '../components/ui/ExcelPreviewModal'
import { ExcelExportButton } from '../components/ui/ExcelActions'
import { useSearchParams } from 'react-router-dom'
import ProveedorSearchSelect from '../components/ui/ProveedorSearchSelect'
import PuedeEditar from '../components/PuedeEditar'

export default function ContactosView() {
  // Datos
  const [contactos, setContactos] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Referencia para el input de archivo oculto
  const fileInputRef = useRef(null)
  
  const proveedorOptions = React.useMemo(
    () => proveedores.map((p) => ({
      id: p.id,
      label: p.nombre,
      sublabel: p.identificacion || undefined
    })),
    [proveedores]
  )

  // Filtros y Búsqueda
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [proveedorFilter, setProveedorFilter] = useState(searchParams.get('proveedor_id') || '')

  // Selección y Paginación
  const [selectedItems, setSelectedItems] = useState(new Map())
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [totalItems, setTotalItems] = useState(0)

  // Modal Contacto State
  const [showModalContacto, setShowModalContacto] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [viewMode, setViewMode] = useState(false)

  /* ── Estados para Modal de Eliminación de Contacto ──────── */
  const [showModalDelete, setShowModalDelete] = useState(false)
  const [contactoToDelete, setContactoToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Modal Excel State
  const [showExcelModal, setShowExcelModal] = useState(false)
  const [excelModalMode, setExcelModalMode] = useState('export')
  const [excelData, setExcelData] = useState([])
  const [allContactosForImport, setAllContactosForImport] = useState([])

  const excelColumns = [
    { key: 'nombre', label: 'Nombre' },
    { key: 'fecha_cumpleanios', label: 'Fecha de Cumpleaños' },
    { key: 'cargo', label: 'Cargo' },
    { key: 'telefono', label: 'Teléfono' },
    { key: 'correo', label: 'Correo' },
    { key: 'observaciones', label: 'Observaciones' },
    { key: 'proveedor_identificacion', label: 'NIT / ID Proveedor' },
    { key: 'proveedor_nombre', label: 'Nombre Proveedor' }
  ]

  // Formulario State
  const [formContacto, setFormContacto] = useState({
    nombre: '',
    fecha_cumpleanios: '',
    cargo: '',
    telefono: '',
    correo: '',
    observaciones: '',
    proveedor_id: ''
  })

  useEffect(() => {
    api.get('/proveedores')
      .then((res) => setProveedores(res.data))
      .catch((err) => setError(err.response?.data?.detail || 'Error al cargar proveedores'))
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    const proveedorIdUrl = searchParams.get('proveedor_id') || ''
    setProveedorFilter(proveedorIdUrl)
  }, [searchParams])

  const handleProveedorFilterChange = (value) => {
    setProveedorFilter(value)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value) {
        next.set('proveedor_id', value)
      } else {
        next.delete('proveedor_id')
      }
      return next
    })
  }

  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, proveedorFilter, itemsPerPage])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/contactos', {
        params: {
          skip: (currentPage - 1) * itemsPerPage,
          limit: itemsPerPage,
          search: debouncedSearch || undefined,
          proveedor_id: proveedorFilter || undefined
        }
      })

      if (res.data && Array.isArray(res.data.items)) {
        setContactos(res.data.items)
        setTotalItems(res.data.total ?? res.data.items.length)
      } else if (Array.isArray(res.data)) {
        setContactos(res.data)
        setTotalItems(res.data.length)
      } else {
        setContactos([])
        setTotalItems(0)
      }

    } catch (err) {
      setError(err.response?.data?.detail || 'Error al cargar la información')
      setContactos([])
    } finally {
      setLoading(false)
    }
  }, [currentPage, itemsPerPage, debouncedSearch, proveedorFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const toggleSelectOne = (contacto) => {
    setSelectedItems((prev) => {
      const next = new Map(prev)
      if (next.has(contacto.id)) next.delete(contacto.id)
      else next.set(contacto.id, contacto)
      return next
    })
  }

  const isPageFullySelected =
    contactos.length > 0 && contactos.every((c) => selectedItems.has(c.id))

  const toggleSelectPage = () => {
    setSelectedItems((prev) => {
      const next = new Map(prev)
      if (isPageFullySelected) {
        contactos.forEach((c) => next.delete(c.id))
      } else {
        contactos.forEach((c) => next.set(c.id, c))
      }
      return next
    })
  }

  const clearSelection = () => setSelectedItems(new Map())

  const handleOpenExportModal = async () => {
    let contactosAExportar = []

    if (selectedItems.size > 0) {
      contactosAExportar = Array.from(selectedItems.values())
    } else {
      setLoading(true)
      try {
        const res = await api.get('/contactos', {
          params: {
            skip: 0,
            limit: 100000,
            search: debouncedSearch || undefined,
            proveedor_id: proveedorFilter || undefined
          }
        })
        contactosAExportar = res.data.items
      } catch (err) {
        alert(err.response?.data?.detail || 'Error al preparar la exportación')
        setLoading(false)
        return
      }
      setLoading(false)
    }

    if (contactosAExportar.length === 0) {
      alert('No hay contactos para exportar')
      return
    }

    const formattedData = contactosAExportar.map((c) => ({
      nombre: c.nombre || '',
      fecha_cumpleanios: c.fecha_cumpleanios || '',
      cargo: c.cargo || '',
      telefono: c.telefono || '',
      correo: c.correo || '',
      observaciones: c.observaciones || '',
      proveedor_identificacion: c.proveedor?.identificacion || '',
      proveedor_nombre: c.proveedor?.nombre || ''
    }))

    setExcelData(formattedData)
    setExcelModalMode('export')
    setShowExcelModal(true)
  }

  const handleConfirmExport = () => {
    const dataToExport = excelData.map((c) => ({
      'Nombre': c.nombre,
      'Fecha de Cumpleaños': c.fecha_cumpleanios,
      'Cargo': c.cargo,
      'Teléfono': c.telefono,
      'Correo': c.correo,
      'Observaciones': c.observaciones,
      'NIT / ID Proveedor': c.proveedor_identificacion,
      'Nombre Proveedor': c.proveedor_nombre
    }))

    const worksheet = XLSX.utils.json_to_sheet(dataToExport)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Contactos')
    XLSX.writeFile(workbook, `contactos_${new Date().toISOString().slice(0, 10)}.xlsx`)

    setShowExcelModal(false)
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (evt) => {
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

        const contactosAImportar = data
          .map((item) => ({
            nombre: String(item['Nombre'] || item['nombre'] || '').trim(),
            fecha_cumpleanios: String(item['Fecha de Cumpleaños'] || item['fecha_cumpleanios'] || '').trim() || null,
            cargo: String(item['Cargo'] || item['cargo'] || '').trim() || null,
            telefono: String(item['Teléfono'] || item['telefono'] || item['Telefono'] || '').trim() || null,
            correo: String(item['Correo'] || item['correo'] || item['Email'] || '').trim() || null,
            observaciones: String(item['Observaciones'] || item['observaciones'] || '').trim() || null,
            proveedor_identificacion: String(
              item['NIT / ID Proveedor'] || item['proveedor_identificacion'] || item['NIT Proveedor'] || item['NIT'] || ''
            ).trim() || null,
            proveedor_nombre: String(item['Nombre Proveedor'] || item['Proveedor'] || '').trim() || null,
            proveedor_id: item['proveedor_id'] || null
          }))
          .filter((item) => item.nombre !== '')

        if (contactosAImportar.length === 0) {
          alert('No se encontraron contactos válidos en el archivo.')
          return
        }

        try {
          const res = await api.get('/contactos', { params: { skip: 0, limit: 100000 } })
          setAllContactosForImport(res.data.items)
        } catch (err) {
          setAllContactosForImport([])
        }

        setExcelData(contactosAImportar)
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

  const handleConfirmImport = async (dataToSubmit) => {
    setLoading(true)
    try {
      const response = await api.post('/contactos/importar-json', dataToSubmit)
      const { creados, actualizados, errores } = response.data
      let mensaje = `Importación completada: ${creados} creados y ${actualizados} actualizados.`
      if (errores && errores.length > 0) {
        mensaje += `\n\n${errores.length} fila(s) con problemas:\n${errores.slice(0, 5).join('\n')}`
      }
      alert(mensaje)
      setShowExcelModal(false)
      fetchData()
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al importar contactos')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveContacto = async (e) => {
    e.preventDefault()
    if (!formContacto.proveedor_id) {
      alert('Por favor selecciona un proveedor')
      return
    }
    try {
      if (editingItem) {
        await api.put(`/contactos/${editingItem.id}`, formContacto)
      } else {
        await api.post('/contactos/', formContacto)
      }
      setShowModalContacto(false)
      fetchData()
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al guardar el contacto')
    }
  }

  const handleOpenDeleteModal = (contacto) => {
    setContactoToDelete(contacto)
    setShowModalDelete(true)
  }

  const handleDeleteContacto = async () => {
    if (!contactoToDelete) return

    setDeleting(true)
    try {
      await api.delete(`/contactos/${contactoToDelete.id}`)
      setShowModalDelete(false)
      setContactoToDelete(null)
      fetchData()
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al eliminar el contacto')
    } finally {
      setDeleting(false)
    }
  }

  const openContactoModal = (contacto = null) => {
    if (contacto) {
      setEditingItem(contacto)
      setFormContacto({
        nombre: contacto.nombre || '',
        cargo: contacto.cargo || '',
        telefono: contacto.telefono || '',
        correo: contacto.correo || '',
        observaciones: contacto.observaciones || '',
        fecha_cumpleanios: contacto.fecha_cumpleanios || '',
        proveedor_id: contacto.proveedor_id || ''
      })
    } else {
      setEditingItem(null)
      setFormContacto({
        nombre: '',
        cargo: '',
        telefono: '',
        correo: '',
        observaciones: '',
        fecha_cumpleanios: '',
        proveedor_id: proveedorFilter || (proveedores[0]?.id ? String(proveedores[0].id) : '')
      })
    }
    setViewMode(false)
    setShowModalContacto(true)
  }

  const openViewModal = (contacto) => {
    setEditingItem(contacto)
    setFormContacto({
      nombre: contacto.nombre || '',
      cargo: contacto.cargo || '',
      telefono: contacto.telefono || '',
      correo: contacto.correo || '',
      observaciones: contacto.observaciones || '',
      fecha_cumpleanios: contacto.fecha_cumpleanios || '',
      proveedor_id: contacto.proveedor_id || ''
    })
    setViewMode(true)
    setShowModalContacto(true)
  }

  return (
    <div className="space-y-4">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".xlsx, .xls, .csv"
        className="hidden"
      />

      {/* Barra de Búsqueda, Filtro y Acciones */}
      <div className="card px-4 py-3 flex items-center justify-between flex-wrap gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, cargo, teléfono o correo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-base pl-9 w-full"
          />
        </div>

        <ProveedorSearchSelect
          options={proveedorOptions}
          value={proveedorFilter}
          onChange={(id) => handleProveedorFilterChange(id)}
          placeholder="Todos los Proveedores"
          clearable
          className="w-56"
        />

        <div className="flex items-center gap-2 shrink-0">
          <ExcelExportButton
            columns={excelColumns}
            filename="plantilla_contactos"
            sheetName="Plantilla Contactos"
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
            {selectedItems.size > 0 ? `Exportar (${selectedItems.size})` : 'Exportar'}
          </button>

          <PuedeEditar> 
          <button
            onClick={() => openContactoModal()}
            className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Plus size={16} /> Nuevo Contacto
          </button>
          </PuedeEditar>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-danger-50 border border-danger-200 rounded-xl px-4 py-3 text-sm text-danger-700">
          {error}
        </div>
      )}

      {/* TABLA DE CONTACTOS */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-surface-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-surface-700">
            Listado de Contactos
            <span className="ml-2 font-normal text-surface-400">({totalItems})</span>
          </h3>
          {selectedItems.size > 0 && (
            <button
              onClick={clearSelection}
              className="text-xs font-medium text-brand-500 hover:text-brand-600"
            >
              Limpiar selección ({selectedItems.size})
            </button>
          )}
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          {totalItems === 0 && !loading ? (
            <EmptyState icon={Users} title="No hay contactos registrados" />
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
                  <th className="text-left px-4 py-3">Nombre</th>
                  <th className="text-left px-4 py-3">Cargo</th>
                  <th className="text-left px-4 py-3">Teléfono</th>
                  <th className="text-left px-4 py-3">Correo</th>
                  <th className="text-left px-4 py-3">Proveedor</th>
                  <th className="text-right px-5 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {contactos.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-surface-100 last:border-0 hover:bg-surface-50 transition-colors"
                  >
                    <td className="px-5 py-2.5">
                      <input
                        type="checkbox"
                        checked={selectedItems.has(c.id)}
                        onChange={() => toggleSelectOne(c)}
                        className="rounded border-surface-300"
                      />
                    </td>
                    <td className="px-4 py-2.5 text-surface-700 font-medium">{c.nombre}</td>
                    <td className="px-4 py-2.5 text-surface-500">{c.cargo || '—'}</td>
                    <td className="px-4 py-2.5 text-surface-500 whitespace-nowrap">{c.telefono || '—'}</td>
                    <td className="px-4 py-2.5 text-surface-500">{c.correo || '—'}</td>
                    <td className="px-4 py-2.5 text-surface-600">{c.proveedor?.nombre || '—'}</td>
                    <td className="px-5 py-2.5 text-right whitespace-nowrap">
                      <button
                        onClick={() => openViewModal(c)}
                        className="p-1 hover:text-brand-500 transition-colors mr-2"
                        title="Ver"
                      >
                        <Eye size={15} />
                      </button>
                      
                      <PuedeEditar>
                        <button
                          onClick={() => handleOpenDeleteModal(c)}
                          className="p-1 hover:text-danger-500 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={15} />
                        </button>
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
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      </div>

      {/* MODAL PREVISUALIZACIÓN EXCEL */}
      <ExcelPreviewModal
        isOpen={showExcelModal}
        onClose={() => setShowExcelModal(false)}
        title={excelModalMode === 'import' ? 'Previsualización de Importación' : 'Previsualización de Exportación'}
        columns={excelColumns}
        data={excelData}
        mode={excelModalMode}
        existingItems={excelModalMode === 'import' ? allContactosForImport : contactos}
        matchKey="nombre"
        onConfirmExport={handleConfirmExport}
        onConfirmImport={handleConfirmImport}
        loading={loading}
      />

      {/* MODAL CONTACTO (Horizontal layout para evitar scrollbar) */}
      {showModalContacto && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-modal border border-surface-100">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-surface-100">
              <h3 className="text-base font-semibold text-surface-800">
                {viewMode ? 'Detalle del Contacto' : editingItem ? 'Editar Contacto' : 'Nuevo Contacto'}
              </h3>
              <button
                onClick={() => setShowModalContacto(false)}
                className="text-surface-400 hover:text-surface-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {viewMode ? (
              /* ── MODO SOLO LECTURA (Grid 2 columnas) ─────────────────── */
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <div>
                    <span className="text-xs font-semibold text-surface-500 uppercase tracking-wide">Nombre</span>
                    <p className="text-sm text-surface-800 mt-0.5">{formContacto.nombre || '—'}</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-surface-500 uppercase tracking-wide">Fecha de Cumpleaños</span>
                    <p className="text-sm text-surface-800 mt-0.5">{formContacto.fecha_cumpleanios || '—'}</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-surface-500 uppercase tracking-wide">Cargo</span>
                    <p className="text-sm text-surface-800 mt-0.5">{formContacto.cargo || '—'}</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-surface-500 uppercase tracking-wide">Teléfono</span>
                    <p className="text-sm text-surface-800 mt-0.5">{formContacto.telefono || '—'}</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-surface-500 uppercase tracking-wide">Correo</span>
                    <p className="text-sm text-surface-800 mt-0.5">{formContacto.correo || '—'}</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-surface-500 uppercase tracking-wide">Proveedor</span>
                    <p className="text-sm text-surface-800 mt-0.5">{editingItem?.proveedor?.nombre || '—'}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs font-semibold text-surface-500 uppercase tracking-wide">Observaciones</span>
                    <p className="text-sm text-surface-800 mt-0.5 whitespace-pre-wrap">{formContacto.observaciones || '—'}</p>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-surface-100">
                  <button
                    type="button"
                    onClick={() => setShowModalContacto(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-surface-600 hover:bg-surface-100 transition-colors"
                  >
                    Cerrar
                  </button>

                  <PuedeEditar>
                  <button
                    type="button"
                    onClick={() => openContactoModal(editingItem)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-400 text-amber-950 hover:bg-amber-500 transition-colors shadow-sm flex items-center gap-1.5"
                  >
                    <Edit2 size={13} /> Editar
                  </button>
                  </PuedeEditar>
                </div>
              </div>
            ) : (
              /* ── MODO FORMULARIO (Grid 2 columnas) ─────────────── */
              <form onSubmit={handleSaveContacto} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-surface-600">Nombre</label>
                    <input
                      type="text"
                      required
                      value={formContacto.nombre}
                      onChange={(e) => setFormContacto({ ...formContacto, nombre: e.target.value })}
                      className="input-base w-full mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-surface-600">Fecha de Cumpleaños</label>
                    <input
                      type="date"
                      value={formContacto.fecha_cumpleanios}
                      onChange={(e) => setFormContacto({ ...formContacto, fecha_cumpleanios: e.target.value })}
                      className="input-base w-full mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-surface-600">Cargo</label>
                    <input
                      type="text"
                      value={formContacto.cargo}
                      onChange={(e) => setFormContacto({ ...formContacto, cargo: e.target.value })}
                      className="input-base w-full mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-surface-600">Teléfono</label>
                    <input
                      type="text"
                      value={formContacto.telefono}
                      onChange={(e) => setFormContacto({ ...formContacto, telefono: e.target.value })}
                      className="input-base w-full mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-surface-600">Correo</label>
                    <input
                      type="email"
                      value={formContacto.correo}
                      onChange={(e) => setFormContacto({ ...formContacto, correo: e.target.value })}
                      className="input-base w-full mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-surface-600">Proveedor</label>
                    <div className="mt-1">
                      <ProveedorSearchSelect
                        options={proveedorOptions}
                        value={formContacto.proveedor_id}
                        onChange={(id) => setFormContacto({ ...formContacto, proveedor_id: id })}
                        placeholder="Selecciona un proveedor"
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-surface-600">Observaciones</label>
                    <textarea
                      rows={2}
                      value={formContacto.observaciones}
                      onChange={(e) => setFormContacto({ ...formContacto, observaciones: e.target.value })}
                      className="input-base w-full mt-1 resize-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-surface-100">
                  <button
                    type="button"
                    onClick={() =>
                      editingItem ? setViewMode(true) : setShowModalContacto(false)
                    }
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
            )}
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
      {showModalDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-modal border border-surface-100 space-y-4">
            <h3 className="text-base font-semibold text-surface-800">
              ¿Eliminar contacto?
            </h3>
            <p className="text-xs text-surface-600">
              ¿Estás seguro de que deseas eliminar el contacto{' '}
              <strong className="text-surface-800">{contactoToDelete?.nombre}</strong>? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowModalDelete(false)
                  setContactoToDelete(null)
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-surface-600 hover:bg-surface-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteContacto}
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