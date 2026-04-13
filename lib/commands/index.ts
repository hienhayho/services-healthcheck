import type { BotCommand, CommandContext, CommandResult } from '@/lib/commands/types'
import { reportCommand } from '@/lib/commands/report'
import { chatCommand } from '@/lib/commands/chat'
import { makeHelpCommand } from '@/lib/commands/help'

/**
 * All registered bot commands, in priority order.
 * The first command whose matches() returns true handles the message.
 * To add a new command: implement BotCommand and append it here.
 */
const commands: BotCommand[] = [
  reportCommand,
  chatCommand,
]

// Help is registered last so it appears at the bottom of its own output,
// but receives a reference to the full list so it can describe every command.
commands.push(makeHelpCommand(() => commands))

/**
 * Finds the first matching command and executes it.
 * Returns null if no command matched.
 */
export async function dispatch(ctx: CommandContext): Promise<CommandResult | null> {
  for (const cmd of commands) {
    if (cmd.matches(ctx)) {
      console.log(`[commands] matched command "${cmd.name}" for text="${ctx.text}"`)
      return cmd.execute(ctx)
    }
  }
  return null
}

export type { BotCommand, CommandContext, CommandResult }
