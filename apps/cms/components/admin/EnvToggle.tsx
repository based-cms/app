'use client'

import { useEnv } from '@/components/providers/EnvProvider'
import { cn } from '@/lib/utils'

export function EnvToggle() {
  const { env, setEnv } = useEnv()

  return (
    <div className="flex items-center gap-1 rounded-full border bg-muted p-1 text-sm">
      <button
        onClick={() => setEnv('production')}
        className={cn(
          'rounded-full px-3 py-1 font-medium transition-colors',
          env === 'production'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        Prod
      </button>
      <button
        onClick={() => setEnv('preview')}
        className={cn(
          'rounded-full px-3 py-1 font-medium transition-colors',
          env === 'preview'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        Dev
      </button>
    </div>
  )
}
