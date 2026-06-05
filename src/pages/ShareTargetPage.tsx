import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

export function ShareTargetPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const redirected = useRef(false)

  useEffect(() => {
    if (redirected.current) return
    redirected.current = true
    const raw = params.get('url')
    let sharedUrl: string | null = null
    try {
      const parsed = new URL(raw ?? '')
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') sharedUrl = raw
    } catch { /* invalid URL — ignore */ }
    navigate('/recipes/new', { state: { sharedUrl }, replace: true })
  }, [navigate, params])

  return <div className="min-h-screen bg-warm-base" />
}
