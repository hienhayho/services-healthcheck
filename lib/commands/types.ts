export interface TelegramEntity {
  type: string
  offset: number
  length: number
}

export interface TelegramMessage {
  text?: string
  chat: { id: number }
  entities?: TelegramEntity[]
}

export interface CommandContext {
  /** Raw message text, trimmed */
  text: string
  /** Lowercase version of text */
  textLower: string
  /**
   * Text with the leading @botname mention stripped, lowercased.
   * e.g. "@mybot /report" → "/report"
   *      "@mybot help"    → "help"
   *      "/status"        → "/status"
   */
  commandText: string
  message: TelegramMessage
  botUsername: string
  /** When set, restrict the report to only this alert channel (used by simulate endpoint) */
  channelId?: number
}

export interface CommandResult {
  triggered: boolean
  /** Human-readable reason when not triggered */
  reason?: string
  /** Optional plain-text reply to show directly in the caller (e.g. simulate UI) */
  reply?: string
  [key: string]: unknown
}

export interface BotCommand {
  /** Short name shown in logs, e.g. "report" */
  name: string
  /** Usage examples shown in /help, e.g. ["/report", "@bot status"] */
  usage: string[]
  /** One-line description shown in /help */
  description: string
  /**
   * Return true if this command should handle the given message.
   * Called before execute(); if multiple commands match, the first one wins.
   */
  matches(ctx: CommandContext): boolean
  /** Run the command. Only called when matches() returned true. */
  execute(ctx: CommandContext): Promise<CommandResult>
}
