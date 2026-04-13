/**
 * Re-export the tool builder and related types for use across agent tool definitions.
 * All tools live in lib/agent-tools/ and are registered in lib/agent-tools/index.ts.
 *
 * To add a new tool:
 *   1. Create lib/agent-tools/your-tool.ts using the `tool()` + zod pattern
 *   2. Export it from lib/agent-tools/index.ts
 */
export { tool } from '@openai/agents'
export { z } from 'zod'
