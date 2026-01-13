import { z } from 'zod'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { uploadFile } from '../functions/uploadFile.js'
import { UploadFileResponse } from '../types.js'

export function registerUploadFileTool(server: McpServer) {
  server.tool(
    'upload-file',
    'Uploads a text file to Google Drive. You can specify the file name, content, and optionally a folder ID to upload to a specific folder.',
    {
      fileName: z
        .string()
        .describe('The name of the file to create (e.g., "test.txt")'),
      content: z.string().describe('The text content of the file'),
      folderId: z
        .string()
        .optional()
        .describe(
          'Optional: The ID of the folder to upload the file to. If not provided, uploads to root.'
        ),
      mimeType: z
        .string()
        .optional()
        .describe(
          'Optional: The MIME type of the file (default: "text/plain"). Examples: "text/plain", "application/json", "text/markdown"'
        ),
    },
    async ({ fileName, content, folderId, mimeType }) => {
      try {
        const response: UploadFileResponse = await uploadFile(
          fileName,
          content,
          folderId,
          mimeType || 'text/plain'
        )

        if (response?.success && response.file) {
          return {
            content: [
              {
                type: 'text',
                text: `File uploaded successfully!\n\nFile Name: ${response.file.name}\nFile ID: ${response.file.id}\nView Link: ${response.file.viewLink || 'N/A'}\nDownload Link: ${response.file.downloadLink || 'N/A'}`,
              },
            ],
          }
        } else {
          return {
            content: [
              {
                type: 'text',
                text: response.message || 'Failed to upload file.',
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
              text: `Error uploading file: ${error}`,
            },
          ],
          isError: true,
        }
      }
    }
  )
}
