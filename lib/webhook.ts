import { dispatch } from '@/lib/commands'

export interface TelegramEntity {
  type: string
  offset: number
  length: number
}

export interface TelegramUpdate {
  message?: TelegramMessage
  channel_post?: TelegramMessage
}

export interface TelegramMessage {
  text?: string
  chat: { id: number }
  entities?: TelegramEntity[]
}

export interface ProcessResult {
  triggered: boolean
  reason?: string
  [key: string]: unknown
}

/**
 * Parses a Telegram update and dispatches it to the matching command handler.
 */
export async function processWebhookUpdate(
  update: TelegramUpdate,
  channelId?: number
): Promise<ProcessResult> {
  const message = update.message ?? update.channel_post
  if (!message?.text) return { triggered: false, reason: 'no text' }

  const text = message.text.trim()
  const botUsername = (process.env.TELEGRAM_BOT_USERNAME ?? '').toLowerCase()
  const textLower = text.toLowerCase()

  // If TELEGRAM_BOT_USERNAME is configured, the message must mention this bot.
  // Accepts both entity-based mentions and plain text mentions.
  if (botUsername) {
    const mentionedViaEntity = (message.entities ?? []).some(
      e =>
        e.type === 'mention' &&
        message.text!.slice(e.offset, e.offset + e.length).toLowerCase() === `@${botUsername}`
    )
    const mentionedViaText = textLower.includes(`@${botUsername}`)
    if (!mentionedViaEntity && !mentionedViaText) {
      console.log(`[webhook] ignored — message does not mention @${botUsername}`)
      return { triggered: false, reason: `message does not mention @${botUsername}` }
    }
  }

  // Normalise "@botname /command" → "/command"
  // Use textLower only for the prefix check; slice from the original `text` to preserve casing.
  const mentionPrefix = botUsername ? `@${botUsername}` : null
  const commandText = (
    mentionPrefix && textLower.startsWith(mentionPrefix)
      ? text.slice(mentionPrefix.length).trimStart()
      : text
  )

  const ctx = {
    text,
    textLower,
    commandText,
    message,
    botUsername,
    channelId,
  }

  const result = await dispatch(ctx)

  if (!result) {
    console.log(`[webhook] no command matched for text="${text}"`)
    return { triggered: false, reason: 'no trigger keyword' }
  }

  return result
}
