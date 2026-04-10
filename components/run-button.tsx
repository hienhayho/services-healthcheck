'use client'

import { useState } from 'react'
import { Play, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

export function RunButton({ serviceId }: { serviceId: number }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleRun() {
    setLoading(true)
    await fetch(`/api/services/${serviceId}/run`, { method: 'POST' })
    setLoading(false)
    router.refresh()
  }

  return (
    <button
      onClick={handleRun}
      disabled={loading}
      className={cn(
        'inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-mono border transition-all',
        'text-muted-foreground border-border/60 bg-secondary/50',
        'hover:text-primary hover:border-primary/30 hover:bg-primary/5',
        'disabled:opacity-40 disabled:cursor-not-allowed'
      )}
    >
      {loading
        ? <Loader2 className="h-3 w-3 animate-spin" />
        : <Play className="h-3 w-3" />
      }
      {loading ? 'Running' : 'Run'}
    </button>
  )
}
