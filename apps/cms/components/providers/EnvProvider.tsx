'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

type Env = 'production' | 'preview'

interface EnvContextValue {
  env: Env
  setEnv: (env: Env) => void
}

const EnvContext = createContext<EnvContextValue | null>(null)

export function EnvProvider({ children }: { children: ReactNode }) {
  const [env, setEnv] = useState<Env>('production')
  return (
    <EnvContext.Provider value={{ env, setEnv }}>
      {children}
    </EnvContext.Provider>
  )
}

export function useEnv(): EnvContextValue {
  const ctx = useContext(EnvContext)
  if (!ctx) throw new Error('useEnv must be used within EnvProvider')
  return ctx
}
