'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { Service, CheckResult } from '@/lib/db'
import { StatusBadge } from '@/components/status-badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { History, X, CalendarIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Pagination } from '@/components/pagination'

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

interface Props {
  services: Service[]
  results: CheckResult[]
  total: number
  page: number
  pageSize: number
  serviceIdFilter?: number
  dateFrom?: string
  dateTo?: string
}

export function HistoryClient({ services, results, total, page, pageSize, serviceIdFilter, dateFrom, dateTo }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const serviceMap = new Map(services.map(s => [s.id, s]))

  const [fromOpen, setFromOpen] = useState(false)
  const [toOpen, setToOpen] = useState(false)

  function navigate(params: Record<string, string | undefined>) {
    const sp = new URLSearchParams()
    if (params.service_id) sp.set('service_id', params.service_id)
    if (params.date_from)  sp.set('date_from', params.date_from)
    if (params.date_to)    sp.set('date_to', params.date_to)
    if (params.page && params.page !== '1') sp.set('page', params.page)
    const qs = sp.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  function currentParams(overrides: Record<string, string | undefined> = {}) {
    return {
      service_id: serviceIdFilter ? String(serviceIdFilter) : undefined,
      date_from: dateFrom,
      date_to: dateTo,
      page: '1',
      ...overrides,
    }
  }

  const hasFilter = !!serviceIdFilter || !!dateFrom || !!dateTo

  const fromDate = dateFrom ? parseISO(dateFrom) : undefined
  const toDate = dateTo ? parseISO(dateTo) : undefined

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="animate-fade-up">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">History</h1>
        <p className="text-sm text-muted-foreground mt-1">Check results log</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 animate-fade-up animate-fade-up-1">
        {/* Service filter */}
        <Select
          value={serviceIdFilter ? String(serviceIdFilter) : 'all'}
          onValueChange={v => navigate(currentParams({ service_id: !v || v === 'all' ? undefined : v }))}
        >
          <SelectTrigger className="w-44 bg-secondary/50 border-border/60 text-sm font-mono">
            <SelectValue placeholder="All services" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All services</SelectItem>
            {services.map(s => (
              <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date from */}
        <Popover open={fromOpen} onOpenChange={setFromOpen}>
          <PopoverTrigger
            render={
              <button
                className={cn(
                  'inline-flex h-9 w-40 items-center justify-start gap-2 rounded-md border border-border/60 bg-secondary/50 px-3 text-sm font-mono transition-colors hover:bg-secondary/80',
                  !fromDate ? 'text-muted-foreground' : 'text-foreground'
                )}
              />
            }
          >
            <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
            {fromDate ? format(fromDate, 'MMM d, yyyy') : 'From date'}
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={fromDate}
              onSelect={d => {
                navigate(currentParams({ date_from: d ? format(d, 'yyyy-MM-dd') : undefined }))
                setFromOpen(false)
              }}
              disabled={toDate ? { after: toDate } : undefined}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        {/* Date to */}
        <Popover open={toOpen} onOpenChange={setToOpen}>
          <PopoverTrigger
            render={
              <button
                className={cn(
                  'inline-flex h-9 w-40 items-center justify-start gap-2 rounded-md border border-border/60 bg-secondary/50 px-3 text-sm font-mono transition-colors hover:bg-secondary/80',
                  !toDate ? 'text-muted-foreground' : 'text-foreground'
                )}
              />
            }
          >
            <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
            {toDate ? format(toDate, 'MMM d, yyyy') : 'To date'}
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={toDate}
              onSelect={d => {
                navigate(currentParams({ date_to: d ? format(d, 'yyyy-MM-dd') : undefined }))
                setToOpen(false)
              }}
              disabled={fromDate ? { before: fromDate } : undefined}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        {/* Clear filters */}
        {hasFilter && (
          <button
            onClick={() => router.push(pathname)}
            className="inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-mono border border-border/60 text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}

        <span className="text-xs font-mono text-muted-foreground ml-auto">{total} results</span>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border/60 overflow-hidden animate-fade-up animate-fade-up-2">
        <div className="grid grid-cols-[1.5fr_auto_auto_2fr_1.5fr] gap-4 px-5 py-2.5 bg-secondary/50 border-b border-border/60">
          {['Service', 'Status', 'Latency', 'Message', 'Checked At'].map(h => (
            <span key={h} className="text-xs font-mono text-muted-foreground uppercase tracking-widest">{h}</span>
          ))}
        </div>

        {results.length === 0 ? (
          <div className="py-16 text-center">
            <History className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No results found.</p>
          </div>
        ) : results.map((r, i) => (
          <div
            key={r.id}
            className={cn(
              'grid grid-cols-[1.5fr_auto_auto_2fr_1.5fr] gap-4 px-5 py-3.5 items-center',
              'hover:bg-secondary/30 transition-colors',
              i !== results.length - 1 && 'border-b border-border/40'
            )}
          >
            <span className="font-medium text-sm text-foreground truncate">
              {serviceMap.get(r.service_id)?.name ?? `#${r.service_id}`}
            </span>
            <StatusBadge status={r.status} />
            <span className="font-mono text-sm text-muted-foreground tabular-nums">
              {formatLatency(r.latency_ms)}
            </span>
            <span className="text-sm text-muted-foreground/70 truncate font-mono">
              {r.message ?? '—'}
            </span>
            <span className="text-xs font-mono text-muted-foreground/60">
              {formatDate(r.checked_at)}
            </span>
          </div>
        ))}
      </div>

      <div className="animate-fade-up animate-fade-up-3">
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={pageSize}
          onPage={p => navigate(currentParams({ page: String(p) }))}
        />
      </div>
    </div>
  )
}
