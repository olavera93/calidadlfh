import React, { createContext, useContext, useState, useCallback } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token') || null)
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  const login = useCallback(async (username, password) => {
    const response = await api.post('/auth/login', { username, password })
    const data = response.data
    const userData = {
      id: data.usuario_id,
      nombre: data.nombre,
      rol: data.rol,
      sedes: data.sedes ?? [],
    }
    localStorage.setItem('token', data.access_token)
    localStorage.setItem('user', JSON.stringify(userData))
    setToken(data.access_token)
    setUser(userData)
    return userData
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }, [])

  const isAdmin = user?.rol === 'admin'
  const sedesPermitidas = user?.sedes ?? []

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAdmin, sedesPermitidas }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
