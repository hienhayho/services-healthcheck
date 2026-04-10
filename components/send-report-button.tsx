'use client'

import { useState } from 'react'
import { Send, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export function SendReportButton() {
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  async function handleSend() {
    setState('loading')
    setMsg('')
    const res = await fetch('/api/report', { method: 'POST' })
    const data = await res.json()
    if (res.ok) {
      setState('ok')
      setMsg(`Sent ${data.sent} service${data.sent !== 1 ? 's' : ''}`)
    } else {
      setState('error')
      setMsg(data.error ?? 'Failed to send')
    }
    setTimeout(() => { setState('idle'); setMsg('') }, 3000)
  }

  return (
    <button
      onClick={handleSend}
      disabled={state === 'loading'}
      className={cn(
        'inline-flex items-center gap-2 rounded px-3.5 py-2 text-sm font-mono border transition-all',
        state === 'idle' && 'text-muted-foreground border-border/60 bg-secondary/50 hover:text-primary hover:border-primary/30 hover:bg-primary/5',
        state === 'loading' && 'text-muted-foreground border-border/60 bg-secondary/50 opacity-60 cursor-not-allowed',
        state === 'ok' && 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10',
        state === 'error' && 'text-red-400 border-red-400/30 bg-red-400/10',
      )}
    >
      {state === 'loading' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {state === 'ok' && <CheckCircle2 className="h-3.5 w-3.5" />}
      {state === 'error' && <AlertCircle className="h-3.5 w-3.5" />}
      {state === 'idle' && <Send className="h-3.5 w-3.5" />}
      {state === 'idle' && 'Send Report'}
      {state === 'loading' && 'Checking…'}
      {(state === 'ok' || state === 'error') && msg}
    </button>
  )
}
