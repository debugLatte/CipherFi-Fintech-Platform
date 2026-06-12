import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user } = useAuth()
  const token = localStorage.getItem('token')
  const storedUserRaw = localStorage.getItem('user')

  let storedUser = null
  try {
    storedUser = storedUserRaw ? JSON.parse(storedUserRaw) : null
  } catch {
    storedUser = null
  }

  const effectiveUser = user || storedUser

  if (!token || !effectiveUser) return <Navigate to="/login" replace />
  if (adminOnly && effectiveUser.role !== 'ADMIN') return <Navigate to="/dashboard" replace />
  
  return children
}
