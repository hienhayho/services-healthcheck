/**
 * All agent tools registered here are passed to the chat agent.
 * To add a new tool: implement it in its own file and append it to the array.
 */
import { getServicesStatusTool } from '@/lib/agent-tools/get-services-status'
import { searchServiceTool } from '@/lib/agent-tools/search-service'
import { listServicesTool } from '@/lib/agent-tools/list-services'
import { getUserDailyActivityTool } from '@/lib/agent-tools/get-user-daily-activity'

export const agentTools = [
  listServicesTool,
  searchServiceTool,
  getServicesStatusTool,
  getUserDailyActivityTool,
]
