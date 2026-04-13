import { tool, z } from '@/lib/agent-tools/types'
import { getEnabledServices } from '@/lib/db'
import { runCheck } from '@/lib/checkers'

/**
 * Tool: get_services_status
 * Triggers a fresh healthcheck and returns results.
 * If `services` is provided, only checks those services (matched by name, case-insensitive).
 * If omitted, checks all enabled services.
 *
 * Workflow when user asks about specific services:
 *   1. Call search_service to resolve the service names
 *   2. Pass the resolved names to get_services_status
 */
export const getServicesStatusTool = tool({
  name: 'get_services_status',
  description: 'Run a fresh healthcheck and return results. If the user asks about specific services, pass their names in the `services` list. If no services are specified, checks all enabled services.',
  parameters: z.object({
    services: z.array(z.string()).optional().describe('List of exact service names to check (use the "name" field from search_service results). Omit to check all enabled services.'),
  }),
  execute: async ({ services }) => {
    const all = getEnabledServices()

    if (all.length === 0) return 'No enabled services configured.'

    const targets = services && services.length > 0
      ? (() => {
          const filtered = all.filter(s =>
            services.some(name => s.name.toLowerCase() === name.toLowerCase())
          )
          if (filtered.length === 0) {
            return `No enabled services matched: ${services.join(', ')}`
          }
          return filtered
        })()
      : all

    if (typeof targets === 'string') return targets

    console.log(`[agent-tools/get_services_status] running fresh checks for: ${targets.map(s => s.name).join(', ')}`)

    const results = await Promise.all(targets.map(s => runCheck(s)))

    return results.map((r, i) => {
      const s = targets[i]
      const latency = r.latency_ms === null ? 'timeout' : `${r.latency_ms}ms`
      const msg = r.message ? ` — ${r.message}` : ''
      return `${s.name} (${s.type}): ${r.status.toUpperCase()} ${latency}${msg}`
    }).join('\n')
  },
})
