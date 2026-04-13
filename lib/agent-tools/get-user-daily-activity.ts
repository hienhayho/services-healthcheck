import { tool, z } from '@/lib/agent-tools/types'

/**
 * Tool: get_user_daily_activity
 * Fetches aggregated daily activity from LiteLLM for a date range,
 * optionally filtered by model or API key.
 */
export const getUserDailyActivityTool = tool({
  name: 'get_user_daily_activity',
  description: 'Fetch aggregated daily LiteLLM usage activity for a date range. Filter by model or API key. Returns metadata with spend, token counts, and request stats.',
  parameters: z.object({
    start_date: z.string().describe('Start date in YYYY-MM-DD format (required).'),
    end_date: z.string().describe('End date in YYYY-MM-DD format (required).'),
    model: z.string().optional().describe('Filter by model name. CRITICAL: This field is case-sensitive. You MUST pass the EXACT string the user provided, character-for-character. Do NOT lowercase, uppercase, normalize, trim, or alter it in any way. Passing a modified value will return wrong results. Either model or api_key must be provided.'),
    api_key: z.string().optional().describe('Filter by API key. Either model or api_key must be provided.'),
  }).refine(
    data => data.model !== undefined || data.api_key !== undefined,
    { message: 'At least one of model or api_key must be provided.' }
  ),
  execute: async ({ start_date, end_date, model, api_key }) => {
    const baseUrl = process.env.LITELLM_API_URL
    const bearerToken = process.env.LITELLM_BEARER_TOKEN

    if (!baseUrl) return '❌ LITELLM_API_URL is not configured.'
    if (!bearerToken) return '❌ LITELLM_BEARER_TOKEN is not configured.'

    const params = new URLSearchParams({ start_date, end_date })
    if (model) params.set('model', model)
    if (api_key) params.set('api_key', api_key)

    const url = `${baseUrl.replace(/\/$/, '')}/user/daily/activity/aggregated?${params.toString()}`

    let res: Response
    try {
      res = await fetch(url, {
        headers: { Authorization: `Bearer ${bearerToken}` },
      })
    } catch (err) {
      return `❌ Network error: ${err instanceof Error ? err.message : String(err)}`
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return `❌ LiteLLM API error ${res.status}: ${body || res.statusText}`
    }

    let data: unknown
    try {
      data = await res.json()
    } catch {
      return '❌ Failed to parse LiteLLM response as JSON.'
    }

    if (
      typeof data !== 'object' ||
      data === null ||
      !('metadata' in data) ||
      data.metadata === null ||
      data.metadata === undefined
    ) {
      return '❌ Unexpected response shape — no "metadata" field found.'
    }

    return JSON.stringify((data as { metadata: unknown }).metadata, null, 2)
  },
})
