import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <div className="min-h-screen bg-warm-base" />
  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}
