import { google } from 'googleapis'
import fs from 'fs'
import path from 'path'
import http from 'http'
import open from 'open'
import url from 'url'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const TOKEN_PATH = path.resolve(__dirname, '../../token.json')

const CLIENT_ID = process.env.CLIENT_ID
const CLIENT_SECRET = process.env.CLIENT_SECRET
const REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:3000'
const PORT = parseInt(new URL(REDIRECT_URI).port) || 3000

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
)

let token: any = null
let isAuthenticated = false

// OAuth scopes - use full drive access for better compatibility
const SCOPES = [
  'https://www.googleapis.com/auth/drive',  // Full access to all Drive files
]

export interface ReauthorizeResult {
  success: boolean
  message: string
  scopes?: string[]
}

// Check if token exists and load it
function loadToken(): boolean {
  try {
    if (fs.existsSync(TOKEN_PATH)) {
      token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'))
      oauth2Client.setCredentials(token)
      isAuthenticated = true
      return true
    }
  } catch (error) {
    console.error('Error loading token:', error)
  }
  return false
}

// Start OAuth flow to get new token
async function startAuthFlow(): Promise<void> {
  return new Promise((resolve, reject) => {
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent',  // Force consent screen to ensure new scopes are applied
    })

    console.error('='.repeat(60))
    console.error('Google Drive MCP: Authorization required!')
    console.error('Opening browser for authentication...')
    console.error('If browser does not open, visit this URL:')
    console.error(authUrl)
    console.error('='.repeat(60))

    const server = http.createServer(async (req, res) => {
      if (!req.url) return

      const query = new url.URL(req.url, REDIRECT_URI).searchParams
      const code = query.get('code')
      if (code) {
        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end(
          '<h1>Authentication successful!</h1><p>You can close this tab and restart Claude Code.</p>'
        )

        server.close()

        try {
          const { tokens } = await oauth2Client.getToken(code)
          oauth2Client.setCredentials(tokens)
          token = tokens
          fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2))
          console.error('Token stored successfully!')
          isAuthenticated = true
          resolve()
        } catch (err) {
          console.error('Error retrieving access token:', err)
          reject(err)
        }
      }
    })

    server.listen(PORT, () => {
      console.error(`Authorization server listening on http://localhost:${PORT}`)
      open(authUrl, { wait: false }).then((cp) => cp.unref()).catch(() => {
        console.error('Could not open browser automatically. Please visit the URL above.')
      })
    })

    // Timeout after 5 minutes
    setTimeout(() => {
      if (!isAuthenticated) {
        server.close()
        reject(new Error('Authorization timeout - please try again'))
      }
    }, 5 * 60 * 1000)
  })
}

// Initialize: load token or start auth flow
async function initialize(): Promise<void> {
  if (!loadToken()) {
    await startAuthFlow()
  }
}

// Auto-refresh tokens
oauth2Client.on('tokens', (tokens) => {
  if (tokens.refresh_token || tokens.access_token) {
    const newToken = {
      ...token,
      ...tokens,
      expiry_date: tokens.expiry_date || token?.expiry_date,
    }
    token = newToken
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(newToken, null, 2))
  }
})

// Reauthorize: delete token and start new auth flow
export async function reauthorize(): Promise<ReauthorizeResult> {
  try {
    // Delete existing token
    if (fs.existsSync(TOKEN_PATH)) {
      fs.unlinkSync(TOKEN_PATH)
      console.error('Existing token deleted.')
    }

    // Reset state
    token = null
    isAuthenticated = false
    oauth2Client.setCredentials({})

    // Start new auth flow
    await startAuthFlow()

    return {
      success: true,
      message: 'Reauthorization completed successfully. New token saved.',
      scopes: SCOPES,
    }
  } catch (error) {
    return {
      success: false,
      message: `Reauthorization failed: ${error}`,
    }
  }
}

// Export initialization promise and drive client
export const initPromise = initialize()
export const drive = google.drive({ version: 'v3', auth: oauth2Client })
export { isAuthenticated }
