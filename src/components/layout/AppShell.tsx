import { Outlet } from 'react-router-dom'
import { TabBar } from './TabBar'
import { Fab } from './Fab'
import { GeminiKeyProvider } from '../../contexts/GeminiKeyContext'

export function AppShell() {
  return (
    <GeminiKeyProvider>
      <div className="min-h-screen bg-warm-base">
        <main className="pb-[calc(60px+env(safe-area-inset-bottom))]">
          <Outlet />
        </main>
        <Fab />
        <TabBar />
      </div>
    </GeminiKeyProvider>
  )
}
