import { getLatestResultPerService, getServices } from '@/lib/db'
import { StatusBadge } from '@/components/status-badge'
import { RunButton } from '@/components/run-button'
import { SendReportButton } from '@/components/send-report-button'
import { CheckCircle2, AlertTriangle, XCircle, Clock, Cpu } from 'lucide-react'

function formatLatency(ms: number | null): string {
  if (ms === null) return 'timeout'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function formatDate(dt: string): string {
  return new Date(dt + 'Z').toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

export const dynamic = 'force-dynamic'

export default function OverviewPage() {
  const services = getServices()
  const latestResults = getLatestResultPerService()
  const resultMap = new Map(latestResults.map(r => [r.service_id, r]))

  const okCount = latestResults.filter(r => r.status === 'ok').length
  const degradedCount = latestResults.filter(r => r.status === 'degraded').length
  const downCount = latestResults.filter(r => r.status === 'down').length
  const totalChecked = latestResults.length

  return (
    <div className="max-w-5xl mx-auto space-y-8">

      {/* Page title */}
      <div className="flex items-start justify-between animate-fade-up">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time status of all monitored services
          </p>
        </div>
        <SendReportButton />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4 animate-fade-up animate-fade-up-1">
        <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/5 p-5 flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-400/10 border border-emerald-400/20 shrink-0">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-xs font-mono text-emerald-400/70 uppercase tracking-widest">Healthy</p>
            <p className="text-3xl font-bold text-emerald-400 leading-none mt-1">{okCount}</p>
          </div>
        </div>

        <div className="rounded-lg border border-amber-400/20 bg-amber-400/5 p-5 flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-amber-400/10 border border-amber-400/20 shrink-0">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <p className="text-xs font-mono text-amber-400/70 uppercase tracking-widest">Degraded</p>
            <p className="text-3xl font-bold text-amber-400 leading-none mt-1">{degradedCount}</p>
          </div>
        </div>

        <div className="rounded-lg border border-red-400/20 bg-red-400/5 p-5 flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-red-400/10 border border-red-400/20 shrink-0">
            <XCircle className="h-5 w-5 text-red-400" />
          </div>
          <div>
            <p className="text-xs font-mono text-red-400/70 uppercase tracking-widest">Down</p>
            <p className="text-3xl font-bold text-red-400 leading-none mt-1">{downCount}</p>
          </div>
        </div>
      </div>

      {/* Services list */}
      <div className="animate-fade-up animate-fade-up-2">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
            Services — {totalChecked} monitored
          </h2>
        </div>

        {services.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/60 p-12 text-center">
            <Cpu className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No services configured yet.</p>
            <a href="/services" className="text-primary text-sm hover:underline mt-1 inline-block">
              Add your first service →
            </a>
          </div>
        ) : (
          <div className="rounded-lg border border-border/60 overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-2.5 bg-secondary/50 border-b border-border/60">
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Service</span>
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Type</span>
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Status</span>
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Latency</span>
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Action</span>
            </div>

            {services.map((service, i) => {
              const result = resultMap.get(service.id)
              return (
                <div
                  key={service.id}
                  className={`grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-4 items-center transition-colors hover:bg-secondary/30 ${
                    i !== services.length - 1 ? 'border-b border-border/40' : ''
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground truncate">{service.name}</span>
                      {!service.enabled && (
                        <span className="text-[10px] font-mono text-muted-foreground/50 bg-secondary px-1.5 py-0.5 rounded border border-border/40 uppercase tracking-wider">
                          paused
                        </span>
                      )}
                    </div>
                    {result?.checked_at && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3 text-muted-foreground/50" />
                        <span className="text-xs text-muted-foreground/60 font-mono">
                          {formatDate(result.checked_at)}
                        </span>
                      </div>
                    )}
                    {result?.message && result.status !== 'ok' && (
                      <p className="text-xs text-muted-foreground/60 truncate max-w-xs mt-0.5">{result.message}</p>
                    )}
                  </div>

                  <span className="text-xs font-mono text-muted-foreground bg-secondary px-2 py-1 rounded border border-border/40 uppercase tracking-wider whitespace-nowrap">
                    {service.type}
                  </span>

                  <div className="flex items-center justify-end">
                    {result ? (
                      <StatusBadge status={result.status} />
                    ) : (
                      <span className="text-xs font-mono text-muted-foreground/40">—</span>
                    )}
                  </div>

                  <span className="text-sm font-mono text-muted-foreground tabular-nums text-right whitespace-nowrap">
                    {result ? formatLatency(result.latency_ms) : '—'}
                  </span>

                  <div className="flex justify-end">
                    <RunButton serviceId={service.id} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
