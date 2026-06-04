import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { GeminiKeyProvider } from './contexts/GeminiKeyContext'
import { router } from './App'
import './index.css'

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <GeminiKeyProvider>
          <RouterProvider router={router} />
        </GeminiKeyProvider>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
)
