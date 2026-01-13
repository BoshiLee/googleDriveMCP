import { UploadFileResponse } from '../types.js'
import { drive } from '../google/googleClient.js'
import { Readable } from 'stream'

export const uploadFile = async (
  fileName: string,
  content: string,
  folderId?: string,
  mimeType: string = 'text/plain'
): Promise<UploadFileResponse> => {
  try {
    // Convert content string to a readable stream
    const stream = Readable.from([content])

    const fileMetadata: { name: string; parents?: string[] } = {
      name: fileName,
    }

    // If folderId is provided, set the parent folder
    if (folderId) {
      fileMetadata.parents = [folderId]
    }

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: {
        mimeType: mimeType,
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
    console.error('Error uploading file:', error)
    return {
      success: false,
      message: `Error uploading file: ${error}`,
    }
  }
}
