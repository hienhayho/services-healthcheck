import { tool, z } from '@/lib/agent-tools/types'
import { getServices } from '@/lib/db'

/**
 * Tool: search_service
 * Case-insensitive search for services by name (partial match).
 * Returns matching service names the agent can pass to get_services_status.
 */
export const searchServiceTool = tool({
  name: 'search_service',
  description: 'Search for services by name (case-insensitive, partial match). Returns a list of matching service names. Use this before get_services_status when the user mentions a specific service name.',
  parameters: z.object({
    query: z.string().describe('Partial or full service name to search for'),
  }),
  execute: async ({ query }) => {
    const services = getServices()
    const q = query.toLowerCase()
    const matches = services.filter(s => s.name.toLowerCase().includes(q))

    if (matches.length === 0) {
      return `No services found matching "${query}".`
    }

    console.log(`[agent-tools/search_service] query="${query}" matched: ${matches.map(s => s.name).join(', ')}`)
    return JSON.stringify(matches.map(s => ({
      name: s.name,
      type: s.type,
      enabled: s.enabled === 1,
    })))
  },
})
