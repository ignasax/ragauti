import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="min-h-screen bg-warm-base" />
  if (!session) {
    const errorParam = new URLSearchParams(location.search).get('error')
    const to = errorParam ? `/login?error=${encodeURIComponent(errorParam)}` : '/login'
    return <Navigate to={to} replace />
  }
  return <>{children}</>
}
