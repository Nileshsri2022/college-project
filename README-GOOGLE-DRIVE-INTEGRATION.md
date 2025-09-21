# Google Drive Image Monitor Component

A comprehensive React component that integrates with Google Drive API to monitor folders for new image uploads and automatically analyze them using AI services.

## Features

- **Google Drive Integration**: OAuth 2.0 authentication with Google Drive API
- **Folder Monitoring**: Real-time monitoring of specified folders via polling
- **AI-Powered Analysis**: Automatic image analysis using LLM services (OpenAI GPT-4 Vision)
- **Comprehensive UI**: Modern, responsive interface with settings panel
- **Result Management**: View, edit, delete, and export analysis results
- **Error Handling**: Robust error handling and user notifications
- **TypeScript Support**: Full type safety throughout the application

## Setup Instructions

### 1. Google Drive API Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Drive API
4. Create OAuth 2.0 credentials:
   - Go to "Credentials" in the left sidebar
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Set application type to "Web application"
   - Add authorized redirect URIs:
     - `http://localhost:3000/api/auth/google-drive/callback` (for development)
     - `https://yourdomain.com/api/auth/google-drive/callback` (for production)

### 2. Environment Variables

Create a `.env.local` file with the following variables:

```env
# Google Drive API Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google-drive/callback

# LLM Configuration
MODEL_NAME=gpt-4-vision-preview
MODEL_BASE_URL=https://api.openai.com/v1
MODEL_API_KEY=your_openai_api_key_here

# Database Configuration (if using Supabase)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 3. Database Setup

Run the database migration to create the required tables:

```bash
# If using Supabase
psql -f scripts/008_create_google_drive_tokens_table.sql
```

### 4. Install Dependencies

The required dependencies are already included in `package.json`:

```json
{
  "@google-cloud/local-auth": "^3.0.1",
  "googleapis": "^160.0.0",
  "react-google-picker": "^0.1.0"
}
```

### 5. Component Usage

Import and use the component in your React application:

```tsx
import { ImageUploader } from '@/components/image-uploader'

export default function MyPage() {
  return (
    <div className="container mx-auto p-4">
      <ImageUploader />
    </div>
  )
}
```

## Component API

### Props

The component accepts no props and is self-contained.

### State Management

The component manages the following state:

- `isAuthenticated`: Boolean indicating Google Drive authentication status
- `settings`: Configuration object for monitoring preferences
- `processedImages`: Array of processed images with analysis results
- `isMonitoring`: Boolean indicating if folder monitoring is active
- `monitorProgress`: Progress percentage for monitoring operations

### Settings Configuration

Users can configure the following through the settings panel:

- **Monitored Folder**: Google Drive folder ID to monitor
- **Polling Interval**: Time between folder checks (10-300 seconds)
- **Auto-process**: Whether to automatically analyze new images
- **LLM Prompt**: Custom prompt for image analysis
- **Image Formats**: Supported file extensions

## Authentication Flow

1. User clicks "Connect Google Drive" button
2. OAuth popup opens with Google authentication
3. User grants permissions for Drive API access
4. Tokens are stored securely in the database
5. Component updates to show authenticated state

## Folder Monitoring

1. User selects a Google Drive folder
2. User starts monitoring with configurable polling interval
3. Component periodically checks for new image files
4. New images are automatically processed if auto-process is enabled
5. Results are displayed in the processed images tab

## Image Processing

1. Images are downloaded from Google Drive as base64 data
2. Converted to blob format for API upload
3. Sent to `/api/images/analyze` endpoint
4. AI analysis is performed using configured LLM service
5. Results are stored and displayed in the UI

## Error Handling

The component includes comprehensive error handling for:

- Authentication failures
- Network connectivity issues
- Invalid image files
- API rate limiting
- Permission errors
- Token expiration

## Security Considerations

- OAuth tokens are stored securely in the database
- Row-level security ensures users only access their own data
- API calls are authenticated and authorized
- Sensitive data is not exposed in client-side code

## Customization

### Custom Analysis Prompts

Users can customize the LLM analysis prompt through the settings panel:

```typescript
const customPrompt = "Analyze this image and provide detailed information about the scene, objects, colors, and mood. Also suggest relevant hashtags for social media."
```

### Supported Image Formats

The component supports common image formats by default:

- `.jpg`, `.jpeg`
- `.png`
- `.gif`
- `.webp`

Additional formats can be added through the settings.

### Polling Intervals

Configurable polling intervals from 10 to 300 seconds balance between:
- Real-time detection (lower intervals)
- API rate limits (higher intervals)
- Battery life (higher intervals)

## Troubleshooting

### Common Issues

1. **Authentication Failed**
   - Check Google Cloud Console credentials
   - Verify redirect URIs are correct
   - Ensure OAuth consent screen is configured

2. **Folder Not Found**
   - Verify the folder ID is correct
   - Check if the folder is shared with the service account
   - Ensure proper permissions are granted

3. **Images Not Processing**
   - Check if images are in supported formats
   - Verify LLM API key is valid
   - Check network connectivity

### Debug Mode

Enable debug logging by setting the environment variable:

```env
DEBUG=google-drive-monitor:*
```

## Performance Optimization

- Images are processed asynchronously
- Polling uses efficient API calls
- Results are cached to reduce redundant processing
- UI updates are debounced for smooth performance

## Browser Support

- Chrome/Chromium (recommended)
- Firefox
- Safari
- Edge

## Contributing

When contributing to this component:

1. Follow TypeScript best practices
2. Include proper error handling
3. Add accessibility features
4. Write comprehensive tests
5. Update documentation

## License

This component is part of the main application license.
