import { z } from 'zod'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { updateFile } from '../functions/updateFile.js'
import { UploadFileResponse } from '../types.js'

export function registerUpdateFileTool(server: McpServer) {
  server.tool(
    'update-file',
    'Updates an existing file in Google Drive. The file ID remains the same, so all existing links continue to work. Can update with text content or from a local file path (for binary files like APK).',
    {
      fileId: z
        .string()
        .describe('The ID of the existing file to update'),
      content: z
        .string()
        .optional()
        .describe('The new text content for the file (for text files)'),
      localFilePath: z
        .string()
        .optional()
        .describe(
          'Local file path to upload from (for binary files like APK, IPA, ZIP). Takes precedence over content if both provided.'
        ),
      mimeType: z
        .string()
        .optional()
        .describe(
          'Optional: The MIME type of the file. Auto-detected for common extensions (.apk, .ipa, .zip, .pdf, .json)'
        ),
    },
    async ({ fileId, content, localFilePath, mimeType }) => {
      try {
        const response: UploadFileResponse = await updateFile(
          fileId,
          content,
          localFilePath,
          mimeType || 'text/plain'
        )

        if (response?.success && response.file) {
          return {
            content: [
              {
                type: 'text',
                text: `File updated successfully!\n\nFile Name: ${response.file.name}\nFile ID: ${response.file.id}\nView Link: ${response.file.viewLink || 'N/A'}\nDownload Link: ${response.file.downloadLink || 'N/A'}`,
              },
            ],
          }
        } else {
          return {
            content: [
              {
                type: 'text',
                text: response.message || 'Failed to update file.',
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
              text: `Error updating file: ${error}`,
            },
          ],
          isError: true,
        }
      }
    }
  )
}
