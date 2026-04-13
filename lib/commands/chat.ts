import { Agent, run, setDefaultOpenAIClient, setOpenAIAPI, setTracingDisabled } from '@openai/agents'
import { OpenAI } from 'openai'
import { sendMessage } from '@/lib/telegram'
import { agentTools } from '@/lib/agent-tools'
import type { BotCommand, CommandContext, CommandResult } from '@/lib/commands/types'

/**
 * /chat <message> — processes the user's message with an OpenAI agent and
 * sends the reply back to the originating Telegram chat.
 *
 * Required env vars:
 *   OPENAI_BASE_URL    — e.g. https://api.openai.com/v1 or LiteLLM proxy URL
 *   OPENAI_API_KEY     — API key
 *   OPENAI_MODEL_NAME  — model name, e.g. gpt-4o-mini
 *
 * Optional env vars:
 *   OPENAI_EXTRA_BODY  — JSON string of extra fields merged into every API request body
 *                        e.g. '{"thinking":{"type":"enabled","budget_tokens":1024}}'
 */

let clientInitialized = false

function ensureClient(): void {
  if (clientInitialized) return

  const extraBody = parseExtraBody()
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
    baseURL: process.env.OPENAI_BASE_URL,
    fetch: extraBody ? buildFetchWithExtraBody(extraBody) : undefined,
  })
  setDefaultOpenAIClient(client)
  // Use chat completions API (compatible with LiteLLM and other proxies)
  setOpenAIAPI('chat_completions')
  // Disable tracing — tracing always hits api.openai.com regardless of baseURL,
  // which causes 401 errors when using a custom/proxy server.
  setTracingDisabled(true)
  clientInitialized = true
}

function parseExtraBody(): Record<string, unknown> | undefined {
  const raw = process.env.OPENAI_EXTRA_BODY
  if (!raw) return undefined
  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
    console.warn('[commands/chat] OPENAI_EXTRA_BODY is not a JSON object, ignoring')
    return undefined
  } catch {
    console.warn('[commands/chat] Failed to parse OPENAI_EXTRA_BODY as JSON, ignoring:', raw)
    return undefined
  }
}

/**
 * Build a fetch wrapper that merges OPENAI_EXTRA_BODY fields at the top level
 * of every POST request body. The OpenAI Node SDK passes body as a plain JSON
 * string to fetch, so JSON.parse is safe here.
 */
/**
 * LiteLLM-aware fetch wrapper for OPENAI_EXTRA_BODY fields.
 *
 * LiteLLM handles fields differently:
 *   - `cache` (and related keys) must be at the TOP LEVEL — LiteLLM reads them directly.
 *   - Provider-specific kwargs (e.g. `chat_template_kwargs`) must go inside `extra_body` —
 *     LiteLLM forwards them to the underlying provider without treating them as its own params.
 *
 * This matches Python SDK behavior where `extra_body={"cache": ...}` merges `cache` at top level,
 * while unknown provider kwargs are passed via `extra_body`.
 */
const LITELLM_TOP_LEVEL_KEYS = new Set(['cache', 'no-cache', 'no-store', 'ttl', 'cache_ttl'])

function buildFetchWithExtraBody(extraBody: Record<string, unknown>): typeof fetch {
  const topLevel: Record<string, unknown> = {}
  const nested: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(extraBody)) {
    if (LITELLM_TOP_LEVEL_KEYS.has(k)) topLevel[k] = v
    else nested[k] = v
  }

  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    if (init?.method?.toUpperCase() === 'POST' && typeof init.body === 'string') {
      try {
        const original = JSON.parse(init.body)
        const existingExtraBody = typeof original.extra_body === 'object' && original.extra_body !== null
          ? original.extra_body as Record<string, unknown>
          : {}
        const merged = {
          ...original,
          ...topLevel,
          ...(Object.keys(nested).length > 0 ? { extra_body: { ...existingExtraBody, ...nested } } : {}),
        }
        console.log('[commands/chat] top-level:', JSON.stringify(topLevel), '| extra_body:', JSON.stringify(merged.extra_body ?? {}))
        init = { ...init, body: JSON.stringify(merged) }
      } catch {
        // not JSON — leave untouched
      }
    }
    return globalThis.fetch(input, init)
  }
}

function buildAgent(): Agent {
  return new Agent({
    name: 'Healthcheck Assistant',
    model: process.env.OPENAI_MODEL_NAME!,
    instructions: [
      'You are a helpful assistant embedded in a services healthcheck monitoring tool.',
      'Use available tools to answer questions about service health and status.',
      'Answer questions concisely. Keep replies short and suitable for a Telegram message.',
    ].join(' '),
    tools: agentTools,
  })
}

async function replyToChat(ctx: CommandContext, text: string): Promise<void> {
  const chatId = ctx.message.chat.id
  if (chatId === 0) return // simulate mode — reply returned via CommandResult.reply
  const { getEnabledAlertChannels } = await import('@/lib/db')
  const channels = getEnabledAlertChannels()
  if (channels.length > 0) {
    const result = await sendMessage(channels[0].bot_token, chatId, text)
    if (!result.ok) console.error('[commands/chat] failed to send reply:', result.error)
  }
}

export const chatCommand: BotCommand = {
  name: 'chat',
  usage: [`@${process.env.TELEGRAM_BOT_USERNAME ?? 'yourbot'} /chat <message>`],
  description: 'Send a message to the AI assistant and get a reply in this chat.',

  matches(ctx: CommandContext): boolean {
    return ctx.commandText.startsWith('/chat')
  },

  async execute(ctx: CommandContext): Promise<CommandResult> {
    const userMessage = ctx.commandText.slice('/chat'.length).trim()

    if (!userMessage) {
      const hint = 'Usage: /chat &lt;your message&gt;'
      await replyToChat(ctx, hint)
      return { triggered: true, reply: 'Usage: /chat <your message>' }
    }

    ensureClient()

    console.log(`[commands/chat] running agent for: "${userMessage}"`)

    let agentReply: string
    try {
      const agent = buildAgent()
      const result = await run(agent, userMessage)
      agentReply = result.finalOutput ?? '(no response)'
    } catch (err) {
      console.error('[commands/chat] agent error:', err)
      agentReply = `❌ Agent error: ${err instanceof Error ? err.message : 'unknown'}`
    }

    console.log(`[commands/chat] reply: "${agentReply}"`)

    await replyToChat(ctx, agentReply)
    return { triggered: true, reply: agentReply }
  },
}
