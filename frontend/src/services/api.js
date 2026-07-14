import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
})

// Adjuntar token en cada request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Manejo de 401: limpiar sesión y redirigir
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// ── Odoo ──────────────────────────────────────────────────────────────────────

export const odoo = {
  getRecepciones: (params = {}) =>
    api.get('/odoo/recepciones', { params }),

  getRecepcionesXlsx: (params = {}) =>
    api.get('/odoo/recepciones/xlsx', { params, responseType: 'blob' }),

  getVencimientos: (params = {}) =>
    api.get('/odoo/vencimientos', { params }),

  getVencimientosXlsx: (params = {}) =>
    api.get('/odoo/vencimientos/xlsx', { params, responseType: 'blob' }),

  getSettings: () =>
    api.get('/odoo/settings'),

  saveSettings: (data) =>
    api.put('/odoo/settings', data),

  testConnection: () =>
    api.post('/odoo/settings/test'),
}

export default api
