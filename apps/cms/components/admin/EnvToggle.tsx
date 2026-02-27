'use client'

import { useDeployment } from '@/components/providers/DeploymentProvider'
import { cn } from '@/lib/utils'

export function EnvToggle() {
  const { env, setEnv, testAvailable } = useDeployment()

  return (
    <div
      className={cn(
        'flex items-center gap-0.5 rounded-full border p-0.5 text-xs transition-colors',
        env === 'test'
          ? 'border-amber-500/30 bg-amber-500/10'
          : 'bg-muted/60'
      )}
    >
      <button
        onClick={() => setEnv('live')}
        className={cn(
          'flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium transition-colors',
          env === 'live'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full transition-colors',
            env === 'live' ? 'bg-emerald-500' : 'bg-muted-foreground/40'
          )}
        />
        Live
      </button>
      <button
        onClick={() => setEnv('test')}
        disabled={!testAvailable}
        className={cn(
          'flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium transition-colors',
          !testAvailable && 'cursor-not-allowed opacity-40',
          env === 'test'
            ? 'bg-amber-500/20 text-amber-700 shadow-sm dark:text-amber-300'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full transition-colors',
            env === 'test' ? 'bg-amber-500' : 'bg-muted-foreground/40'
          )}
        />
        Test
      </button>
    </div>
  )
}
