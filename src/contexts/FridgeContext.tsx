import { createContext, useContext, useState, type ReactNode } from 'react'

type FridgeStatus = 'empty' | 'scanning' | 'results' | 'error'

interface FridgeState {
  status: FridgeStatus
  detected: string[]
  error: string | null
}

interface FridgeContextValue extends FridgeState {
  startScan: () => void
  setScanResult: (detected: string[]) => void
  setScanError: (msg: string) => void
  updateDetected: (detected: string[]) => void
  reset: () => void
}

const FridgeContext = createContext<FridgeContextValue | null>(null)

export function FridgeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FridgeState>({
    status: 'empty',
    detected: [],
    error: null,
  })

  return (
    <FridgeContext.Provider
      value={{
        ...state,
        startScan: () => setState({ status: 'scanning', detected: [], error: null }),
        setScanResult: (detected) => setState({ status: 'results', detected, error: null }),
        setScanError: (msg) => setState({ status: 'error', detected: [], error: msg }),
        updateDetected: (detected) => setState(s => ({ ...s, detected })),
        reset: () => setState({ status: 'empty', detected: [], error: null }),
      }}
    >
      {children}
    </FridgeContext.Provider>
  )
}

export function useFridge() {
  const ctx = useContext(FridgeContext)
  if (!ctx) throw new Error('useFridge must be used within FridgeProvider')
  return ctx
}
