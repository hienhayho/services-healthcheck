import { getAlertChannels } from '@/lib/db'
import { SettingsClient } from './settings-client'

export const dynamic = 'force-dynamic'

export default function SettingsPage() {
  const channels = getAlertChannels()
  return <SettingsClient channels={channels} />
}
