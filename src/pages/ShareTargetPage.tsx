import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

export function ShareTargetPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const redirected = useRef(false)

  useEffect(() => {
    if (redirected.current) return
    redirected.current = true
    const url = params.get('url')
    navigate('/recipes/new', { state: { sharedUrl: url }, replace: true })
  }, [navigate, params])

  return <div className="min-h-screen bg-warm-base" />
}
