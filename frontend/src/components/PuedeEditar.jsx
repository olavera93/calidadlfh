import { useAuth } from '../context/AuthContext'

export default function PuedeEditar({ children, fallback = null }) {
  const { puedeEditar } = useAuth()
  return puedeEditar ? children : fallback
}