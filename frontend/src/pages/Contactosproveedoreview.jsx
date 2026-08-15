import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Users, Building2, Plus, X, Phone, Mail, Briefcase,
  StickyNote, Edit2, Trash2
} from 'lucide-react'
import api from '../services/api'
import { EmptyState } from '../components/ui/EmptyState'
import Paginator from '../components/ui/Paginator'

/**
 * Vista de Contactos de un Proveedor. Ruta esperada: /proveedores/:id/contactos
 *
 * Vista independiente (no se carga dentro del detalle de proveedor) que permite:
 *  - Listar los contactos asociados a un proveedor
 *  - Crear, editar y eliminar contactos
 */

export default function ContactosProveedorView() {
  const { id: proveedorId } = useParams()
  const navigate = useNavigate()

  const [proveedor, setProveedor] = useState(null)
  const [contactos, setContactos] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  /* ── Estados para el Modal de Crear/Editar Contacto ──────── */
  const [showModal, setShowModal] = useState(false)
  const [editingContactoId, setEditingContactoId] = useState(null) // null = Crear, ID = Editar
  const [formContacto, setFormContacto] = useState({
    nombre: '',
    telefono: '',
    correo: '',
    cargo: '',
    observaciones: ''
  })
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  /* ── Estados para Modal de Eliminación ───────────────────── */
  const [showModalDelete, setShowModalDelete] = useState(false)
  const [contactoToDelete, setContactoToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  /* ── Paginación ───────────────────────────────────────────── */
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(6)

  /* ── Cargar datos ─────────────────────────────────────────── */
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [resContactos, resProv] = await Promise.all([
        api.get(`/contactos/proveedor/${proveedorId}`),
        api.get('/proveedores')
      ])

      const contactosArray = Array.isArray(resContactos.data)
        ? resContactos.data
        : (resContactos.data?.items || resContactos.data?.data || [])

      const proveedoresArray = Array.isArray(resProv.data) ? resProv.data : (resProv.data?.data || [])

      setContactos(contactosArray)

      const encontrado = proveedoresArray.find((p) => String(p.id) === String(proveedorId))
      setProveedor(encontrado || null)
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al cargar los contactos del proveedor')
    } finally {
      setLoading(false)
    }
  }, [proveedorId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Ajustar página si cambia el tamaño de la lista
  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(contactos.length / itemsPerPage))
    if (currentPage > maxPage) {
      setCurrentPage(maxPage)
    }
  }, [contactos.length, itemsPerPage, currentPage])

  const paginatedContactos = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return contactos.slice(startIndex, startIndex + itemsPerPage)
  }, [contactos, currentPage, itemsPerPage])

  /* ── Abrir Modal Crear Contacto ───────────────────────────── */
  const handleOpenCreateModal = () => {
    setEditingContactoId(null)
    setFormContacto({
      nombre: '',
      telefono: '',
      correo: '',
      cargo: '',
      observaciones: ''
    })
    setFormError('')
    setShowModal(true)
  }

  /* ── Abrir Modal Editar Contacto ──────────────────────────── */
  const handleOpenEditModal = (contacto) => {
    setEditingContactoId(contacto.id)
    setFormContacto({
      nombre: contacto.nombre || '',
      telefono: contacto.telefono || '',
      correo: contacto.correo || '',
      cargo: contacto.cargo || '',
      observaciones: contacto.observaciones || ''
    })
    setFormError('')
    setShowModal(true)
  }

  /* ── Guardar Contacto (Crear o Editar) ────────────────────── */
  const handleSaveContacto = async (e) => {
    e.preventDefault()

    if (!formContacto.nombre.trim()) {
      setFormError('El nombre es obligatorio.')
      return
    }

    setSaving(true)
    setFormError('')
    try {
      const payload = {
        nombre: formContacto.nombre.trim(),
        telefono: formContacto.telefono.trim() || null,
        correo: formContacto.correo.trim() || null,
        cargo: formContacto.cargo.trim() || null,
        observaciones: formContacto.observaciones.trim() || null,
        proveedor_id: Number(proveedorId)
      }

      if (editingContactoId) {
        await api.put(`/contactos/${editingContactoId}`, payload)
      } else {
        await api.post('/contactos/', payload)
      }

      setShowModal(false)
      fetchData()
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Error al guardar el contacto')
    } finally {
      setSaving(false)
    }
  }

  /* ── Modal y Acción de Eliminar Contacto ─────────────────── */
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

  if (loading && !proveedor) {
    return <div className="p-8 text-center text-surface-500 text-sm">Cargando contactos...</div>
  }

  if (error) {
    return <div className="p-8 text-center text-danger-500 text-sm">{error}</div>
  }

  if (!proveedor) {
    return <div className="p-8 text-center text-surface-500 text-sm">Proveedor no encontrado.</div>
  }

  return (
    <div className="space-y-5">
      {/* ENCABEZADO */}
      <div className="relative overflow-hidden rounded-2xl border border-surface-100 bg-white p-6 shadow-sm">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-[#22D3EE]" />

        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate(`/proveedores/${proveedorId}`)}
            className="p-2 rounded-xl text-surface-500 hover:text-surface-800 hover:bg-surface-100 transition-colors mt-0.5"
            title="Volver al proveedor"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="hidden sm:flex h-12 w-12 shrink-0 rounded-2xl bg-[#0B1220] items-center justify-center shadow-sm">
            <Users size={22} className="text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-surface-400 uppercase tracking-wide">
              <Building2 size={12} className="text-[#22D3EE]" />
              {proveedor.nombre}
            </div>
            <h2 className="text-xl font-bold text-surface-800 mt-0.5">Contactos</h2>
          </div>
        </div>
      </div>

      {/* LISTA DE CONTACTOS */}
      <div className="bg-white rounded-2xl border border-surface-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center h-8 w-8 rounded-xl bg-[#0B1220] text-[#22D3EE]">
              <Users size={16} />
            </span>
            <h3 className="text-sm font-semibold text-surface-800">
              Contactos ({contactos.length})
            </h3>
          </div>

          <button
            onClick={handleOpenCreateModal}
            className="bg-[#0B1220] hover:bg-[#16233A] text-[#22D3EE] text-xs font-medium px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Plus size={14} /> Nuevo Contacto
          </button>
        </div>

        {contactos.length === 0 ? (
          <EmptyState message="Este proveedor no tiene contactos registrados." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {paginatedContactos.map((contacto) => (
              <div
                key={contacto.id}
                className="rounded-xl border border-surface-100 p-4 flex flex-col gap-2.5 hover:border-surface-200 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-surface-800 truncate">{contacto.nombre}</p>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenEditModal(contacto)}
                      className="p-1.5 rounded-lg text-surface-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                      title="Editar contacto"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleOpenDeleteModal(contacto)}
                      className="p-1.5 rounded-lg text-surface-400 hover:text-danger-600 hover:bg-danger-50 transition-colors"
                      title="Eliminar contacto"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {contacto.cargo && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-surface-600">
                    <Briefcase size={12} className="text-[#22D3EE] shrink-0" />
                    {contacto.cargo}
                  </span>
                )}

                {contacto.telefono && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-surface-600">
                    <Phone size={12} className="text-[#22D3EE] shrink-0" />
                    {contacto.telefono}
                  </span>
                )}

                {contacto.correo && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-surface-600 truncate">
                    <Mail size={12} className="text-[#22D3EE] shrink-0" />
                    {contacto.correo}
                  </span>
                )}

                {contacto.observaciones && (
                  <div className="mt-1 pt-2 border-t border-surface-100 flex items-start gap-1.5">
                    <StickyNote size={12} className="text-surface-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-surface-500 leading-snug">{contacto.observaciones}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {contactos.length > 0 && (
          <div className="mt-4 pt-4 border-t border-surface-100">
            <Paginator
              currentPage={currentPage}
              totalItems={contactos.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
            />
          </div>
        )}
      </div>

      {/* MODAL DE CREAR/EDITAR CONTACTO */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-modal border border-surface-100 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
              <h3 className="text-sm font-semibold text-surface-800">
                {editingContactoId ? 'Editar Contacto' : 'Nuevo Contacto'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-surface-400 hover:text-surface-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveContacto} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-surface-600">Nombre *</label>
                <input
                  type="text"
                  value={formContacto.nombre}
                  onChange={(e) => setFormContacto((prev) => ({ ...prev, nombre: e.target.value }))}
                  className="mt-1 w-full border border-surface-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  placeholder="Nombre del contacto"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-surface-600">Cargo</label>
                <input
                  type="text"
                  value={formContacto.cargo}
                  onChange={(e) => setFormContacto((prev) => ({ ...prev, cargo: e.target.value }))}
                  className="mt-1 w-full border border-surface-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  placeholder="Ej: Gerente comercial"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-surface-600">Teléfono</label>
                  <input
                    type="text"
                    value={formContacto.telefono}
                    onChange={(e) => setFormContacto((prev) => ({ ...prev, telefono: e.target.value }))}
                    className="mt-1 w-full border border-surface-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    placeholder="Teléfono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-surface-600">Correo</label>
                  <input
                    type="email"
                    value={formContacto.correo}
                    onChange={(e) => setFormContacto((prev) => ({ ...prev, correo: e.target.value }))}
                    className="mt-1 w-full border border-surface-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    placeholder="correo@dominio.com"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-surface-600">Observaciones</label>
                <textarea
                  value={formContacto.observaciones}
                  onChange={(e) => setFormContacto((prev) => ({ ...prev, observaciones: e.target.value }))}
                  rows={3}
                  className="mt-1 w-full border border-surface-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none"
                  placeholder="Notas adicionales sobre este contacto"
                />
              </div>

              {formError && (
                <p className="text-[11px] text-danger-500">{formError}</p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-surface-600 hover:bg-surface-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-brand-500 text-white hover:bg-brand-600 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saving ? 'Guardando...' : editingContactoId ? 'Actualizar' : 'Guardar'}
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
              ¿Eliminar contacto?
            </h3>
            <p className="text-xs text-surface-600">
              ¿Estás seguro de que deseas eliminar a{' '}
              <strong className="text-surface-800">{contactoToDelete?.nombre}</strong>? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowModalDelete(false)}
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