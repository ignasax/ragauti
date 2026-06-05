import { Outlet, ScrollRestoration } from 'react-router-dom'
import { TabBar } from './TabBar'
import { Fab } from './Fab'
import { GeminiKeyProvider } from '../../contexts/GeminiKeyContext'
import { Toast } from '../Toast'
import { ToastProvider, useToast } from '../../contexts/ToastContext'

function ShellInner() {
  const { toasts, dismissToast } = useToast()
  return (
    <GeminiKeyProvider>
      <ScrollRestoration />
      <div className="min-h-screen bg-warm-base">
        <main className="pb-[calc(60px+env(safe-area-inset-bottom))]">
          <Outlet />
        </main>
        <Fab />
        <TabBar />
        <Toast toasts={toasts} onDismiss={dismissToast} />
      </div>
    </GeminiKeyProvider>
  )
}

export function AppShell() {
  return <ToastProvider><ShellInner /></ToastProvider>
}
