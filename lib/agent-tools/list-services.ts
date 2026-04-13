import { tool, z } from '@/lib/agent-tools/types'
import { getServices } from '@/lib/db'

/**
 * Tool: list_services
 * Lists all services with optional case-insensitive search and pagination.
 */
export const listServicesTool = tool({
  name: 'list_services',
  description: 'List all configured services with optional search and pagination. Use this when the user wants to see what services are available.',
  parameters: z.object({
    name: z.string().optional().describe('Case-insensitive partial match on service name. Omit to list all names.'),
    type: z.enum(['llm', 'embedding', 'http']).optional().describe('Filter by service type: "llm", "embedding", or "http". Omit to include all types.'),
    page: z.number().int().min(1).optional().default(1).describe('Page number (1-based, default 1).'),
    page_size: z.number().int().min(1).max(50).optional().default(10).describe('Number of results per page (default 10, max 50).'),
  }),
  execute: async ({ name, type, page, page_size }) => {
    const all = getServices()

    const filtered = all.filter(s => {
      if (name && !s.name.toLowerCase().includes(name.toLowerCase())) return false
      if (type && s.type !== type) return false
      return true
    })

    const total = filtered.length
    const totalPages = Math.ceil(total / page_size)
    const start = (page - 1) * page_size
    const paged = filtered.slice(start, start + page_size)

    if (total === 0) {
      const filters = [name && `name="${name}"`, type && `type="${type}"`].filter(Boolean).join(', ')
      return filters ? `No services found matching ${filters}.` : 'No services configured.'
    }

    const rows = paged.map(s =>
      `• ${s.name} | ${s.type} | ${s.enabled ? 'enabled' : 'disabled'} | cron: ${s.cron}`
    ).join('\n')

    const pagination = totalPages > 1
      ? `\nPage ${page}/${totalPages} (${total} total)`
      : `\n${total} service${total === 1 ? '' : 's'}`

    return rows + pagination
  },
})
