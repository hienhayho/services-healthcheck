import type { BotCommand, CommandContext, CommandResult } from '@/lib/commands/types'
import { sendMessage } from '@/lib/telegram'

/**
 * Builds the /help command with a reference to the full command registry
 * so it can list every registered command and its usage.
 */
export function makeHelpCommand(getCommands: () => BotCommand[]): BotCommand {
  return {
    name: 'help',
    usage: ['/help', `@${process.env.TELEGRAM_BOT_USERNAME ?? 'yourbot'} /help`],
    description: 'List all available commands and their usage.',

    matches(ctx: CommandContext): boolean {
      // Accepts: "/help", "@botname /help"
      return ctx.commandText.startsWith('/help')
    },

    async execute(ctx: CommandContext): Promise<CommandResult> {
      const cmds = getCommands()
      const botUsername = ctx.botUsername
        ? `@${ctx.botUsername}`
        : process.env.TELEGRAM_BOT_USERNAME
          ? `@${process.env.TELEGRAM_BOT_USERNAME}`
          : 'this bot'

      // Plain-text version for the simulate UI bubble
      const plainLines: string[] = [
        `Services Healthcheck Bot`,
        `Available commands for ${botUsername}:`,
        '',
      ]
      for (const cmd of cmds) {
        plainLines.push(cmd.usage.join('  '))
        plainLines.push(`  ${cmd.description}`)
        plainLines.push('')
      }
      const plainText = plainLines.join('\n').trimEnd()

      // HTML version for Telegram
      const htmlLines: string[] = [
        `<b>Services Healthcheck Bot</b>`,
        `<i>Available commands for ${botUsername}:</i>`,
        '',
      ]
      const escHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      for (const cmd of cmds) {
        htmlLines.push(cmd.usage.map(u => `<code>${escHtml(u)}</code>`).join('  '))
        htmlLines.push(`  ${cmd.description}`)
        htmlLines.push('')
      }
      const htmlText = htmlLines.join('\n').trimEnd()

      const chatId = ctx.message.chat.id

      if (chatId !== 0) {
        // Real Telegram message — send reply back to the originating chat
        const { getEnabledAlertChannels } = await import('@/lib/db')
        const channels = getEnabledAlertChannels()
        if (channels.length > 0) {
          const result = await sendMessage(channels[0].bot_token, chatId, htmlText)
          if (!result.ok) {
            console.error('[commands/help] failed to send help message:', result.error)
          }
        }
      }

      console.log('[commands/help] help sent')
      return { triggered: true, reply: plainText }
    },
  }
}
