import { getEnabledServices, getEnabledAlertChannels, getAlertChannels } from '@/lib/db'
import { runCheck } from '@/lib/checkers'
import { sendReport } from '@/lib/telegram'
import type { BotCommand, CommandContext, CommandResult } from '@/lib/commands/types'

/**
 * Triggers a full healthcheck report.
 * Responds to: /report, /status, or @mention of this bot.
 * When ctx.channelId is set, only that channel receives the report.
 */
export const reportCommand: BotCommand = {
  name: 'report',
  usage: ['/report', '/status', `@${process.env.TELEGRAM_BOT_USERNAME ?? 'yourbot'} /report`],
  description: 'Run a full healthcheck and send the results to all alert channels.',

  matches(ctx: CommandContext): boolean {
    const { commandText } = ctx
    // Accepts: "/report", "/status", "@botname /report", "@botname /status"
    return commandText.startsWith('/report') || commandText.startsWith('/status')
  },

  async execute(ctx: CommandContext): Promise<CommandResult> {
    const allChannels = ctx.channelId !== undefined
      ? getAlertChannels().filter(c => c.id === ctx.channelId)
      : getEnabledAlertChannels()

    const services = getEnabledServices()

    if (services.length === 0) {
      console.log('[commands/report] no enabled services, skipping')
      return { triggered: false, reason: 'no enabled services' }
    }

    if (allChannels.length === 0) {
      console.log('[commands/report] no alert channels, skipping')
      return { triggered: false, reason: 'no alert channels' }
    }

    console.log(`[commands/report] triggering report for ${services.length} services → ${allChannels.length} channel(s)`)

    void (async () => {
      try {
        const results = await Promise.all(services.map(s => runCheck(s)))
        await sendReport(results, services, allChannels)
        console.log('[commands/report] report sent')
      } catch (err) {
        console.error('[commands/report] error running report:', err)
      }
    })()

    return { triggered: true, serviceCount: services.length }
  },
}
