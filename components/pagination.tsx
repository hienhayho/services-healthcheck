'use client'

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PaginationProps {
  page: number
  totalPages: number
  total: number
  pageSize: number
  onPage: (page: number) => void
}

export function Pagination({ page, totalPages, total, pageSize, onPage }: PaginationProps) {
  if (totalPages <= 1) return null

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  const btnClass = (disabled: boolean) => cn(
    'inline-flex items-center justify-center h-7 w-7 rounded border text-muted-foreground transition-colors',
    disabled
      ? 'border-border/30 opacity-30 cursor-not-allowed'
      : 'border-border/60 bg-secondary/50 hover:text-foreground hover:bg-secondary cursor-pointer'
  )

  return (
    <div className="flex items-center justify-between pt-2">
      <span className="text-xs font-mono text-muted-foreground">
        {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-1">
        <button className={btnClass(page <= 1)} disabled={page <= 1} onClick={() => onPage(1)}>
          <ChevronsLeft className="h-3.5 w-3.5" />
        </button>
        <button className={btnClass(page <= 1)} disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <span className="text-xs font-mono text-muted-foreground px-2 min-w-[4rem] text-center">
          {page} / {totalPages}
        </span>
        <button className={btnClass(page >= totalPages)} disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
        <button className={btnClass(page >= totalPages)} disabled={page >= totalPages} onClick={() => onPage(totalPages)}>
          <ChevronsRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
