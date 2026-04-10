import { cn } from '@/lib/utils'

type Status = 'ok' | 'degraded' | 'down'

const config: Record<Status, { label: string; dot: string; className: string }> = {
  ok:       { label: 'OK',       dot: 'bg-emerald-400', className: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/25' },
  degraded: { label: 'DEGRADED', dot: 'bg-amber-400',   className: 'text-amber-400 bg-amber-400/10 border-amber-400/25' },
  down:     { label: 'DOWN',     dot: 'bg-red-400',     className: 'text-red-400 bg-red-400/10 border-red-400/25' },
}

export function StatusBadge({ status }: { status: Status }) {
  const { label, dot, className } = config[status]
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-mono font-medium border tracking-wider',
      className
    )}>
      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', dot, status === 'ok' && 'pulse-dot')} />
      {label}
    </span>
  )
}
