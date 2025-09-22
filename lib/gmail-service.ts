import { google } from 'googleapis'
import { createClient as createServerClient } from '@/lib/supabase/server'

export interface GmailMessage {
  id: string
  threadId: string
  snippet: string
  subject?: string
  from?: string
  to?: string
  date?: string
  body?: string
  labels?: string[]
}

export interface GmailToken {
  access_token: string
  refresh_token?: string
  expiry_date?: number
  scope: string
  token_type: string
}

export class GmailService {
  private oauth2Client: any
  private userId: string

  constructor(userId: string) {
    this.userId = userId
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID!,
      process.env.GOOGLE_CLIENT_SECRET!,
      process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/auth/gmail/callback`
    )
  }

  async getTokens(): Promise<GmailToken | null> {
    try {
      const supabase = await createServerClient()
      const { data, error } = await supabase
        .from('gmail_tokens')
        .select('*')
        .eq('user_id', this.userId)
        .single()

      if (error || !data) {
        // Fallback to google_drive_tokens for backward compatibility
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('google_drive_tokens')
          .select('*')
          .eq('user_id', this.userId)
          .single()

        if (fallbackError || !fallbackData) {
          return null
        }

        return {
          access_token: fallbackData.access_token,
          refresh_token: fallbackData.refresh_token,
          expiry_date: fallbackData.expiry_date,
          scope: fallbackData.scope,
          token_type: fallbackData.token_type
        }
      }

      return {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expiry_date: data.expiry_date,
        scope: data.scope,
        token_type: data.token_type
      }
    } catch (error) {
      console.error('Error getting Gmail tokens:', error)
      return null
    }
  }

  async setTokens(tokens: GmailToken): Promise<void> {
    try {
      console.log('🔐 SETTING GMAIL TOKENS FOR USER:', this.userId)
      console.log('📝 Token details:', {
        hasAccessToken: !!tokens.access_token,
        hasRefreshToken: !!tokens.refresh_token,
        expiryDate: tokens.expiry_date,
        scope: tokens.scope,
        tokenType: tokens.token_type
      })

      const supabase = await createServerClient()

      // Use upsert to handle both insert and update cases
      console.log('💾 Using upsert to store/update Gmail tokens...')

      // Try gmail_tokens table first
      const { error: gmailError } = await supabase
        .from('gmail_tokens')
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

      if (gmailError) {
        console.warn('Failed to save to gmail_tokens, falling back to google_drive_tokens:', gmailError)
        // Fallback to google_drive_tokens for backward compatibility
        const { error: fallbackError } = await supabase
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

        if (fallbackError) {
          console.error('❌ Error storing Gmail tokens:', fallbackError)
          throw fallbackError
        }
      }

      console.log('✅ Successfully stored Gmail tokens for user:', this.userId)
    } catch (error) {
      console.error('💥 Error setting Gmail tokens:', error)
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
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/gmail.metadata'
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
      throw new Error('No Gmail tokens found')
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
        console.error('Error refreshing Gmail token:', error)
        throw new Error('Failed to refresh Gmail access token')
      }
    }

    // Check if we have sufficient Gmail scopes
    const currentScopes = tokens.scope ? tokens.scope.split(' ') : []
    const hasGmailReadOnly = currentScopes.includes('https://www.googleapis.com/auth/gmail.readonly')
    const hasGmailMetadata = currentScopes.includes('https://www.googleapis.com/auth/gmail.metadata')
    const hasGmailModify = currentScopes.includes('https://www.googleapis.com/auth/gmail.modify')

    // Check if we have at least one Gmail scope
    // Note: gmail.modify scope includes gmail.readonly permissions
    if (!hasGmailReadOnly && !hasGmailMetadata && !hasGmailModify) {
      console.warn('Insufficient Gmail scopes detected. Current scopes:', currentScopes)
      console.warn('Required at least one of: gmail.readonly, gmail.modify, or gmail.metadata')

      throw new Error(
        'Insufficient Gmail API scopes. Please clear your existing Gmail authentication and re-authenticate to get the required Gmail permissions.'
      )
    }

    // Warn if using metadata-only scope (limited functionality)
    if (hasGmailMetadata && !hasGmailReadOnly) {
      console.warn('⚠️ Using Gmail metadata scope only - limited functionality available')
      console.warn('📝 Gmail metadata scope does not support search queries')
      console.warn('📝 Will use client-side filtering for unread emails')
    }

    // If user has both scopes, prioritize readonly for better functionality
    if (hasGmailReadOnly && hasGmailMetadata) {
      console.log('📧 User has both Gmail scopes - prioritizing readonly for search functionality')
    }

    return this.oauth2Client
  }

  async listEmails(maxResults: number = 10): Promise<GmailMessage[]> {
    try {
      const auth = await this.getAuthenticatedClient()
      const gmail = google.gmail({ version: 'v1', auth })

      // Check available scopes to determine the best approach
      const tokens = await this.getTokens()
      const currentScopes = tokens?.scope ? tokens.scope.split(' ') : []
      const hasGmailReadOnly = currentScopes.includes('https://www.googleapis.com/auth/gmail.readonly')
      const hasGmailMetadata = currentScopes.includes('https://www.googleapis.com/auth/gmail.metadata')
      const hasGmailModify = currentScopes.includes('https://www.googleapis.com/auth/gmail.modify')

      let messages: any[] = []

      if (hasGmailReadOnly || hasGmailModify) {
        // Use search functionality with Gmail readonly or modify scope (preferred)
        // Note: gmail.modify includes readonly permissions
        console.log('📧 Using Gmail scope with search functionality')
        const response = await gmail.users.messages.list({
          userId: 'me',
          maxResults: maxResults,
          q: 'is:unread' // Only fetch unread emails for sentiment analysis
        })
        messages = response.data.messages || []
        console.log(`📧 Found ${messages.length} unread emails using search`)
      } else if (hasGmailMetadata) {
        // Use metadata scope - get recent messages and filter client-side
        console.log('📧 Using Gmail metadata scope - fetching recent messages')
        const response = await gmail.users.messages.list({
          userId: 'me',
          maxResults: maxResults * 2, // Get more to account for filtering
          // No query parameter allowed with metadata scope
        })
        const allMessages = response.data.messages || []

        // Filter for unread emails client-side (limited functionality)
        console.log(`📧 Found ${allMessages.length} recent emails, filtering for unread...`)

        // Get message details to check for UNREAD label
        const unreadMessages = []
        for (const message of allMessages.slice(0, maxResults)) {
          try {
            const messageDetail = await gmail.users.messages.get({
              userId: 'me',
              id: message.id!,
              format: 'metadata'
            })

            // Check if message has UNREAD label
            if (messageDetail.data.labelIds?.includes('UNREAD')) {
              unreadMessages.push(message)
            }

            if (unreadMessages.length >= maxResults) break
          } catch (error) {
            console.warn(`Error checking message ${message.id}:`, error)
          }
        }

        messages = unreadMessages
        console.log(`📧 Found ${messages.length} unread emails using metadata filtering`)
      } else {
        throw new Error('No Gmail scopes available for reading emails. Please ensure you have at least one of: gmail.readonly, gmail.modify, or gmail.metadata scopes.')
      }

      console.log(`📧 Found ${messages.length} unread emails`)

      const emailDetails = await Promise.all(
        messages.map(async (message) => {
          try {
            const messageDetail = await gmail.users.messages.get({
              userId: 'me',
              id: message.id!,
              format: 'full'
            })

            const headers = messageDetail.data.payload?.headers || []
            const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject'
            const from = headers.find(h => h.name === 'From')?.value || 'Unknown'
            const to = headers.find(h => h.name === 'To')?.value || 'Unknown'
            const date = headers.find(h => h.name === 'Date')?.value || 'Unknown'

            // Extract body content
            let body = ''
            if (messageDetail.data.payload?.body?.data) {
              body = Buffer.from(messageDetail.data.payload.body.data, 'base64').toString('utf-8')
            } else if (messageDetail.data.payload?.parts) {
              // Handle multipart messages
              for (const part of messageDetail.data.payload.parts) {
                if (part.mimeType === 'text/plain' && part.body?.data) {
                  body = Buffer.from(part.body.data, 'base64').toString('utf-8')
                  break
                }
              }
            }

            return {
              id: messageDetail.data.id!,
              threadId: messageDetail.data.threadId!,
              snippet: messageDetail.data.snippet || '',
              subject,
              from,
              to,
              date,
              body,
              labels: messageDetail.data.labelIds || []
            }
          } catch (error) {
            console.error(`Error fetching email ${message.id}:`, error)
            return null
          }
        })
      )

      return emailDetails.filter(email => email !== null) as GmailMessage[]
    } catch (error) {
      console.error('Error listing Gmail messages:', error)

      // Check if this is the metadata scope error
      if (error instanceof Error &&
          error.message.includes('Metadata scope does not support') &&
          error.message.includes('q parameter')) {
        console.error('❌ Gmail metadata scope error detected')
        console.error('📝 This indicates that the Gmail API is using metadata scope instead of readonly scope')
        console.error('🔧 User may need to re-authenticate with proper Gmail scopes')

        throw new Error(
          'Gmail API is using metadata scope which does not support search queries. ' +
          'Please clear your Gmail authentication and re-authenticate to ensure you have the Gmail readonly scope. ' +
          'Go to /sentiment and click "Sign Out" then "Authenticate with Gmail" again.'
        )
      }

      throw error
    }
  }

  async markAsRead(messageId: string): Promise<void> {
    try {
      const auth = await this.getAuthenticatedClient()
      const gmail = google.gmail({ version: 'v1', auth })

      await gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          removeLabelIds: ['UNREAD']
        }
      })

      console.log(`✅ Marked email ${messageId} as read`)
    } catch (error) {
      console.error(`Error marking email ${messageId} as read:`, error)
      throw error
    }
  }

  async clearTokens(): Promise<void> {
    try {
      const supabase = await createServerClient()

      // Clear from gmail_tokens table
      const { error: gmailError } = await supabase
        .from('gmail_tokens')
        .delete()
        .eq('user_id', this.userId)

      if (gmailError) {
        console.warn('Failed to clear gmail_tokens:', gmailError)
      }

      // Also clear from google_drive_tokens as fallback
      const { error: driveError } = await supabase
        .from('google_drive_tokens')
        .delete()
        .eq('user_id', this.userId)

      if (driveError) {
        console.warn('Failed to clear google_drive_tokens:', driveError)
      }

      console.log('✅ Cleared all Gmail/Drive tokens for user:', this.userId)
    } catch (error) {
      console.error('Error clearing tokens:', error)
      throw error
    }
  }

  async getAvailableScopes(): Promise<string[]> {
    const tokens = await this.getTokens()
    return tokens?.scope ? tokens.scope.split(' ') : []
  }

  async hasGmailScopes(): Promise<{ hasReadOnly: boolean; hasMetadata: boolean; hasModify: boolean }> {
    const scopes = await this.getAvailableScopes()
    return {
      hasReadOnly: scopes.includes('https://www.googleapis.com/auth/gmail.readonly'),
      hasMetadata: scopes.includes('https://www.googleapis.com/auth/gmail.metadata'),
      hasModify: scopes.includes('https://www.googleapis.com/auth/gmail.modify')
    }
  }
}
