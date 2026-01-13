import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { reauthorize } from '../google/googleClient.js'

export function registerReauthorizeTool(server: McpServer) {
  server.tool(
    'reauthorize',
    'Deletes the current OAuth token and initiates a new authorization flow. Use this when you need to change OAuth scopes or fix permission issues. After calling this tool, a browser will open for re-authentication.',
    {},
    async () => {
      try {
        const result = await reauthorize()

        if (result.success) {
          return {
            content: [
              {
                type: 'text',
                text: `Reauthorization successful!\n\n${result.message}\n\nNew scopes: ${result.scopes?.join(', ') || 'N/A'}`,
              },
            ],
          }
        } else {
          return {
            content: [
              {
                type: 'text',
                text: `Reauthorization failed: ${result.message}`,
              },
            ],
            isError: true,
          }
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error during reauthorization: ${error}`,
            },
          ],
          isError: true,
        }
      }
    }
  )
}
