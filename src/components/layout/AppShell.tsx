import { Outlet } from 'react-router-dom'
import { TabBar } from './TabBar'
import { Fab } from './Fab'

export function AppShell() {
  return (
    <div className="min-h-screen bg-warm-base">
      <main className="pb-[calc(60px+env(safe-area-inset-bottom))]">
        <Outlet />
      </main>
      <Fab />
      <TabBar />
    </div>
  )
}
