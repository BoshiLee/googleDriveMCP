import { UploadFileResponse } from '../types.js'
import { drive } from '../google/googleClient.js'
import { Readable } from 'stream'
import * as fs from 'fs'
import * as path from 'path'

export const updateFile = async (
  fileId: string,
  content?: string,
  localFilePath?: string,
  mimeType: string = 'text/plain'
): Promise<UploadFileResponse> => {
  try {
    let stream: Readable
    let detectedMimeType = mimeType

    if (localFilePath) {
      // Read from local file path
      if (!fs.existsSync(localFilePath)) {
        return {
          success: false,
          message: `File not found: ${localFilePath}`,
        }
      }
      stream = fs.createReadStream(localFilePath)

      // Auto-detect MIME type for common file types
      const ext = path.extname(localFilePath).toLowerCase()
      if (ext === '.apk') {
        detectedMimeType = 'application/vnd.android.package-archive'
      } else if (ext === '.ipa') {
        detectedMimeType = 'application/octet-stream'
      } else if (ext === '.zip') {
        detectedMimeType = 'application/zip'
      } else if (ext === '.pdf') {
        detectedMimeType = 'application/pdf'
      } else if (ext === '.json') {
        detectedMimeType = 'application/json'
      }
    } else if (content) {
      // Use provided content string
      stream = Readable.from([content])
    } else {
      return {
        success: false,
        message: 'Either content or localFilePath must be provided',
      }
    }

    const response = await drive.files.update({
      fileId: fileId,
      media: {
        mimeType: detectedMimeType,
        body: stream,
      },
      fields: 'id, name, webViewLink, webContentLink',
    })

    const file = response.data

    return {
      success: true,
      file: {
        id: file.id,
        name: file.name,
        viewLink: file.webViewLink,
        downloadLink: file.webContentLink,
      },
    }
  } catch (error) {
    console.error('Error updating file:', error)
    return {
      success: false,
      message: `Error updating file: ${error}`,
    }
  }
}
