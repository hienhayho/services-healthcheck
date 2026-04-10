'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'

NProgress.configure({ showSpinner: false, speed: 200, minimum: 0.1, trickleSpeed: 200 })

export function ProgressBar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const prev = useRef<string | null>(null)

  useEffect(() => {
    const current = pathname + searchParams.toString()

    if (prev.current === null) {
      // First mount — no navigation happened, just record current URL
      prev.current = current
      return
    }

    if (prev.current !== current) {
      // URL changed — navigation completed
      NProgress.done()
      prev.current = current
    }
  }, [pathname, searchParams])

  useEffect(() => {
    // Intercept all link clicks to start the bar
    function handleClick(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest('a')
      if (!target) return
      const href = target.getAttribute('href')
      if (!href || href.startsWith('#') || href.startsWith('http') || target.target === '_blank') return
      NProgress.start()
    }

    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  return null
}
