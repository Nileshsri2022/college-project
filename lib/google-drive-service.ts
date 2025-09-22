import { google } from 'googleapis'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createBrowserClient } from '@/lib/supabase/client'

export interface GoogleDriveFile {
  id: string
  name: string
  thumbnailLink?: string
  webViewLink: string
  modifiedTime: string
  size?: string
  mimeType: string
}

export interface GoogleDriveToken {
  access_token: string
  refresh_token?: string
  expiry_date?: number
  scope: string
  token_type: string
}

export class GoogleDriveService {
  private oauth2Client: any
  private userId: string

  constructor(userId: string) {
    this.userId = userId
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID!,
      process.env.GOOGLE_CLIENT_SECRET!,
      process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/auth/google-drive/callback`
    )
  }

  async getTokens(): Promise<GoogleDriveToken | null> {
    try {
      const supabase = await createServerClient()
      const { data, error } = await supabase
        .from('google_drive_tokens')
        .select('*')
        .eq('user_id', this.userId)
        .single()

      if (error || !data) {
        return null
      }

      return {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expiry_date: data.expiry_date,
        scope: data.scope,
        token_type: data.token_type
      }
    } catch (error) {
      console.error('Error getting tokens:', error)
      return null
    }
  }

  async setTokens(tokens: GoogleDriveToken): Promise<void> {
    try {
      console.log('🔐 SETTING GOOGLE DRIVE TOKENS FOR USER:', this.userId)
      console.log('📝 Token details:', {
        hasAccessToken: !!tokens.access_token,
        hasRefreshToken: !!tokens.refresh_token,
        expiryDate: tokens.expiry_date,
        scope: tokens.scope,
        tokenType: tokens.token_type
      })

      const supabase = await createServerClient()

      // Use upsert to handle both insert and update cases
      console.log('💾 Using upsert to store/update Google Drive tokens...')
      const { error } = await supabase
        .from('google_drive_tokens')
        .upsert({
          user_id: this.userId,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expiry_date: tokens.expiry_date,
          scope: tokens.scope,
          token_type: tokens.token_type,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })

      if (error) {
        console.error('❌ Error storing tokens:', error)
        // Handle specific error cases
        if (error.code === '23505') {
          console.log('🔄 Token record already exists, this is expected behavior')
          // This is expected when updating existing tokens, so we don't throw
          console.log('✅ Token storage completed (record already existed)')
          return
        }
        throw error
      }

      console.log('✅ Successfully stored Google Drive tokens for user:', this.userId)
    } catch (error) {
      console.error('💥 Error setting tokens:', error)
      throw error
    }
  }

  async isAuthenticated(): Promise<boolean> {
    const tokens = await this.getTokens()
    return tokens !== null && tokens.access_token !== null
  }

  async authenticate(): Promise<string> {
    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/drive.metadata.readonly',
        'https://www.googleapis.com/auth/drive.file'
      ],
      state: this.userId,
      prompt: 'consent'
    })
    console.log("url=>",authUrl)


    return authUrl
  }

  async getAuthenticatedClient(): Promise<any> {
    const tokens = await this.getTokens()

    if (!tokens) {
      throw new Error('No tokens found')
    }

    this.oauth2Client.setCredentials(tokens)

    // Check if token is expired and refresh if needed
    if (tokens.expiry_date && Date.now() >= tokens.expiry_date) {
      try {
        const { credentials } = await this.oauth2Client.refreshAccessToken()
        await this.setTokens({
          access_token: credentials.access_token!,
          refresh_token: tokens.refresh_token,
          expiry_date: credentials.expiry_date,
          scope: credentials.scope!,
          token_type: credentials.token_type!
        })
        this.oauth2Client.setCredentials(credentials)
      } catch (error) {
        console.error('Error refreshing token:', error)
        throw new Error('Failed to refresh access token')
      }
    }

    return this.oauth2Client
  }

  async listFiles(folderId: string): Promise<GoogleDriveFile[]> {
    try {
      const auth = await this.getAuthenticatedClient()
      const drive = google.drive({ version: 'v3', auth })

      const response = await drive.files.list({
        q: `'${folderId}' in parents and (mimeType contains 'image/')`,
        fields: 'files(id, name, thumbnailLink, webViewLink, modifiedTime, size, mimeType)',
        orderBy: 'modifiedTime desc'
      })

      return response.data.files?.map(file => ({
        id: file.id!,
        name: file.name!,
        thumbnailLink: file.thumbnailLink || undefined,
        webViewLink: file.webViewLink!,
        modifiedTime: file.modifiedTime!,
        size: file.size || undefined,
        mimeType: file.mimeType!
      })) || []
    } catch (error) {
      console.error('Error listing files:', error)
      throw error
    }
  }

  async getFileContent(fileId: string): Promise<string> {
    try {
      const auth = await this.getAuthenticatedClient()
      const drive = google.drive({ version: 'v3', auth })

      const response = await drive.files.get({
        fileId: fileId,
        alt: 'media'
      }, { responseType: 'arraybuffer' })

      // Convert ArrayBuffer to base64
      const buffer = Buffer.from(response.data as ArrayBuffer)
      return buffer.toString('base64')
    } catch (error) {
      console.error('Error getting file content:', error)
      throw error
    }
  }

  async getFileMetadata(fileId: string): Promise<any> {
    try {
      const auth = await this.getAuthenticatedClient()
      const drive = google.drive({ version: 'v3', auth })

      const response = await drive.files.get({
        fileId: fileId,
        fields: 'id, name, thumbnailLink, webViewLink, modifiedTime, size, mimeType, parents'
      })

      return response.data
    } catch (error) {
      console.error('Error getting file metadata:', error)
      throw error
    }
  }

  async searchFiles(query: string): Promise<GoogleDriveFile[]> {
    try {
      const auth = await this.getAuthenticatedClient()
      const drive = google.drive({ version: 'v3', auth })

      const response = await drive.files.list({
        q: `name contains '${query}' and mimeType contains 'image/'`,
        fields: 'files(id, name, thumbnailLink, webViewLink, modifiedTime, size, mimeType)',
        orderBy: 'modifiedTime desc'
      })

      return response.data.files?.map(file => ({
        id: file.id!,
        name: file.name!,
        thumbnailLink: file.thumbnailLink || undefined,
        webViewLink: file.webViewLink!,
        modifiedTime: file.modifiedTime!,
        size: file.size || undefined,
        mimeType: file.mimeType!
      })) || []
    } catch (error) {
      console.error('Error searching files:', error)
      throw error
    }
  }

  async setupWebhook(folderId: string, callbackUrl: string): Promise<string> {
    try {
      const auth = await this.getAuthenticatedClient()
      const drive = google.drive({ version: 'v3', auth })

      const channel = {
        id: `folder-${folderId}-${Date.now()}`,
        type: 'web_hook',
        address: callbackUrl,
        payload: true
      }

      const response = await drive.changes.watch({
        requestBody: channel,
        pageToken: '1' // Start watching from now
      })

      return response.data.id!
    } catch (error) {
      console.error('Error setting up webhook:', error)
      throw error
    }
  }

  async removeWebhook(channelId: string): Promise<void> {
    try {
      const auth = await this.getAuthenticatedClient()
      const drive = google.drive({ version: 'v3', auth })

      await drive.channels.stop({
        requestBody: {
          id: channelId,
          resourceId: ''
        }
      })
    } catch (error) {
      console.error('Error removing webhook:', error)
      throw error
    }
  }

  async getFolders(): Promise<GoogleDriveFile[]> {
    try {
      const auth = await this.getAuthenticatedClient()
      const drive = google.drive({ version: 'v3', auth })

      const response = await drive.files.list({
        q: "mimeType = 'application/vnd.google-apps.folder'",
        fields: 'files(id, name, modifiedTime)',
        orderBy: 'modifiedTime desc'
      })

      return response.data.files?.map(file => ({
        id: file.id!,
        name: file.name!,
        modifiedTime: file.modifiedTime!,
        mimeType: 'application/vnd.google-apps.folder',
        webViewLink: `https://drive.google.com/drive/folders/${file.id}`
      })) || []
    } catch (error) {
      console.error('Error getting folders:', error)
      throw error
    }
  }
}
