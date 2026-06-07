"use client"

import * as React from "react"

type WappyState = 
  | "idle" | "working" | "banning" | "scheduled"
  | "protected" | "happy" | "alert" | "sad"
  | "thinking" | "surprised" | "waving" | "sleeping"

interface WappyContextType {
  state: WappyState
  setState: (state: WappyState, duration?: number) => void
}

const WappyContext = React.createContext<WappyContextType | undefined>(undefined)

export function WappyProvider({ children }: { children: React.ReactNode }) {
  const [state, setStateRaw] = React.useState<WappyState>("idle")
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  const setState = React.useCallback((newState: WappyState, duration?: number) => {
    // Clear any pending auto-return to idle
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    
    setStateRaw(newState)
    
    // Auto-return to idle after duration (default 5s)
    const ms = duration ?? 5000
    if (ms > 0) {
      timeoutRef.current = setTimeout(() => {
        setStateRaw("idle")
      }, ms)
    }
  }, [])

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  return (
    <WappyContext.Provider value={{ state, setState }}>
      {children}
    </WappyContext.Provider>
  )
}

export function useWappy() {
  const context = React.useContext(WappyContext)
  if (!context) {
    throw new Error("useWappy must be used within a WappyProvider")
  }
  return context
}
