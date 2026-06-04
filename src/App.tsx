import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { LoginPage } from './pages/LoginPage'
import { RecipesPage } from './pages/RecipesPage'
import { PlannerPage } from './pages/PlannerPage'
import { GroceryPage } from './pages/GroceryPage'
import { SettingsPage } from './pages/SettingsPage'
import { AddRecipePage } from './pages/AddRecipePage'
import { EditRecipePage } from './pages/EditRecipePage'
import { RecipeDetailPage } from './pages/RecipeDetailPage'

const ProtectedShell = () => (
  <ProtectedRoute>
    <AppShell />
  </ProtectedRoute>
)

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedShell />,
    children: [
      { path: '/recipes',          element: <RecipesPage /> },
      { path: '/recipes/new',      element: <AddRecipePage /> },
      { path: '/recipes/:id/edit', element: <EditRecipePage /> },
      { path: '/recipes/:id',      element: <RecipeDetailPage /> },
      { path: '/planner',          element: <PlannerPage /> },
      { path: '/grocery',  element: <GroceryPage /> },
      { path: '/settings', element: <SettingsPage /> },
      { path: '/',         element: <RecipesPage /> },
    ],
  },
])
