'use client'

import { useEnv } from '@/components/providers/EnvProvider'
import { cn } from '@/lib/utils'

export function EnvToggle() {
  const { env, setEnv } = useEnv()

  return (
    <div
      className={cn(
        'flex items-center gap-1 rounded-full border p-1 text-sm transition-colors',
        env === 'preview'
          ? 'border-amber-500/30 bg-amber-500/10'
          : 'bg-muted'
      )}
    >
      <button
        onClick={() => setEnv('production')}
        className={cn(
          'flex items-center gap-1.5 rounded-full px-3 py-1 font-medium transition-colors',
          env === 'production'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full transition-colors',
            env === 'production' ? 'bg-emerald-500' : 'bg-muted-foreground/40'
          )}
        />
        Prod
      </button>
      <button
        onClick={() => setEnv('preview')}
        className={cn(
          'flex items-center gap-1.5 rounded-full px-3 py-1 font-medium transition-colors',
          env === 'preview'
            ? 'bg-amber-500/20 text-amber-700 shadow-sm dark:text-amber-300'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full transition-colors',
            env === 'preview' ? 'bg-amber-500' : 'bg-muted-foreground/40'
          )}
        />
        Dev
      </button>
    </div>
  )
}
