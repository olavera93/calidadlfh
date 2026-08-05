import React from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/layout/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Temperaturas from './pages/temperaturas/Temperaturas'
import OdooRecepciones from './pages/odoo/OdooRecepciones'
import OdooVencimientos from './pages/odoo/OdooVencimientos'
import OdooConfiguracion from './pages/odoo/OdooConfiguracion'
import Configuracion from './pages/configuracion/Configuracion'

function ProtectedRoute({ children, adminOnly = false }) {
  const { token, isAdmin } = useAuth()
  if (!token) return <Navigate to="/login" replace />
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />
  return children
}

function PublicRoute({ children }) {
  const { token } = useAuth()
  if (token) return <Navigate to="/temperaturas" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout><Dashboard /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/temperaturas"
        element={
          <ProtectedRoute>
            <Layout>
              <Temperaturas />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/odoo/recepciones"
        element={
          <ProtectedRoute>
            <Layout><OdooRecepciones /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/odoo/vencimientos"
        element={
          <ProtectedRoute>
            <Layout><OdooVencimientos /></Layout>
          </ProtectedRoute>
        }
      />
      <Route path="/odoo/configuracion" element={<Navigate to="/configuracion" replace />} />
      <Route
        path="/configuracion"
        element={
          <ProtectedRoute>
            <Layout><Configuracion /></Layout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1e293b',
              color: '#f1f5f9',
              fontSize: '0.875rem',
              borderRadius: '0.75rem',
              border: '1px solid #334155',
              padding: '10px 14px',
            },
            success: {
              iconTheme: { primary: '#22c55e', secondary: '#f0fdf4' },
            },
            error: {
              iconTheme: { primary: '#f43f5e', secondary: '#fff1f2' },
            },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  )
}
