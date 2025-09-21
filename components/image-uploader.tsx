"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Upload,
  ImageIcon,
  Loader2,
  Hash,
  FileText,
  Settings,
  FolderOpen,
  Play,
  Pause,
  Trash2,
  Download,
  Edit3,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Monitor,
  Database,
  Eye,
  EyeOff
} from "lucide-react"
import { useDropzone } from "react-dropzone"

// TypeScript interfaces
interface ImageAnalysis {
  caption: string
  hashtags: string[]
  description: string
  mood: string
  colors: string[]
  objects: string[]
  setting: string
}

interface ProcessedImage {
  id: string
  name: string
  url: string
  thumbnailUrl: string
  analysis: ImageAnalysis
  processedAt: string
  status: 'processing' | 'completed' | 'failed'
  googleDriveFileId?: string
}

interface GoogleDriveFile {
  id: string
  name: string
  thumbnailLink?: string
  webViewLink: string
  modifiedTime: string
  size?: string
}

interface FolderMonitorSettings {
  folderId: string
  folderName: string
  pollingInterval: number
  autoProcess: boolean
  llmPrompt: string
  imageFormats: string[]
}


const DEFAULT_SETTINGS: FolderMonitorSettings = {
  folderId: '',
  folderName: '',
  pollingInterval: 30,
  autoProcess: true,
  llmPrompt: 'Analyze this image and provide a detailed caption, relevant hashtags, description, mood, dominant colors, objects detected, and setting.',
  imageFormats: ['.jpg', '.jpeg', '.png', '.gif', '.webp']
}

export function ImageUploader() {
  // State management
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<ImageAnalysis | null>(null)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [imageName, setImageName] = useState("")
  const [processedImages, setProcessedImages] = useState<ProcessedImage[]>([])
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [monitorProgress, setMonitorProgress] = useState(0)
  const [settings, setSettings] = useState<FolderMonitorSettings>(DEFAULT_SETTINGS)
  const [showSettings, setShowSettings] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authLoading, setAuthLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingImages, setLoadingImages] = useState<string[]>([])

  const { toast } = useToast()
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const processedFilesRef = useRef<Set<string>>(new Set())

  // Initialize Google Drive service
  useEffect(() => {
    initializeGoogleDriveService()
  }, [])

  // Load settings from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const savedSettings = localStorage.getItem('google-drive-monitor-settings')
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings)
        setSettings({ ...DEFAULT_SETTINGS, ...parsedSettings })
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
      // Reset to defaults if parsing fails
      setSettings(DEFAULT_SETTINGS)
    }
  }, [])

  // Save settings to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem('google-drive-monitor-settings', JSON.stringify(settings))
    } catch (error) {
      console.error('Failed to save settings:', error)
    }
  }, [settings])

  // Initialize Google Drive service
  const initializeGoogleDriveService = async () => {
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined') return

      // Check authentication status via API
      try {
        const response = await fetch('/api/auth/google-drive/status')
        if (response.ok) {
          const { isAuthenticated: authStatus } = await response.json()
          setIsAuthenticated(authStatus)
        }
      } catch (error) {
        console.error('Failed to check authentication status:', error)
      }
    } catch (error) {
      console.error('Failed to initialize Google Drive service:', error)
      setError('Failed to initialize Google Drive service')
    }
  }

  // Manual image upload handler
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0]
      if (!file) return

      // Show preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setUploadedImage(e.target?.result as string)
      }
      reader.readAsDataURL(file)

      setImageName(file.name)
      setIsAnalyzing(true)
      setAnalysis(null)

      try {
        const formData = new FormData()
        formData.append("image", file)
        formData.append("imageName", imageName || file.name)

        const response = await fetch("/api/images/analyze", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          throw new Error("Failed to analyze image")
        }

        const data = await response.json()
        setAnalysis(data.analysis)

        // Add to processed images
        const newImage: ProcessedImage = {
          id: Date.now().toString(),
          name: file.name,
          url: uploadedImage || '',
          thumbnailUrl: uploadedImage || '',
          analysis: data.analysis,
          processedAt: new Date().toISOString(),
          status: 'completed'
        }
        setProcessedImages(prev => [newImage, ...prev])

        toast({
          title: "Image Analyzed",
          description: "Caption and hashtags generated successfully!",
        })
      } catch (error) {
        console.error('Analysis error:', error)
        toast({
          title: "Error",
          description: "Failed to analyze image",
          variant: "destructive",
        })
      } finally {
        setIsAnalyzing(false)
      }
    },
    [imageName, uploadedImage, toast],
  )

  // Google Drive folder monitoring
  const startMonitoring = useCallback(async () => {
    if (!settings.folderId || !isAuthenticated) {
      toast({
        title: "Configuration Required",
        description: "Please select a folder and authenticate with Google Drive",
        variant: "destructive",
      })
      return
    }

    // Remove the googleDriveService check since we're using API calls now

    setIsMonitoring(true)
    setMonitorProgress(0)
    processedFilesRef.current.clear()

    // Start polling with error handling
    pollingIntervalRef.current = setInterval(async () => {
      try {
        if (!isMonitoring) {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current)
            pollingIntervalRef.current = null
          }
          return
        }

        const response = await fetch(`/api/google-drive/monitor?folderId=${settings.folderId}`)
        if (!response.ok) {
          throw new Error(`Monitoring API failed: ${response.status}`)
        }

        const { files } = await response.json()

        if (!Array.isArray(files)) {
          throw new Error('Invalid response from Google Drive API')
        }

        // Filter for new image files
        const imageFiles = files.filter(file => {
          if (!file || !file.id || !file.name) return false

          const isImageFile = settings.imageFormats.some(format =>
            file.name.toLowerCase().endsWith(format)
          )

          const isNewFile = !processedFilesRef.current.has(file.id)

          return isImageFile && isNewFile
        })

        if (imageFiles.length > 0) {
          setMonitorProgress(prev => Math.min(prev + 10, 90))

          for (const file of imageFiles) {
            if (!file || !file.id) continue

            processedFilesRef.current.add(file.id)

            if (settings.autoProcess) {
              try {
                await processGoogleDriveImage(file)
              } catch (processError) {
                console.error('Error processing file:', file.name, processError)
                // Continue processing other files even if one fails
              }
            }
          }
        }

        setMonitorProgress(100)
        setTimeout(() => setMonitorProgress(0), 1000)
      } catch (error) {
        console.error('Monitoring error:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'

        toast({
          title: "Monitoring Error",
          description: `Failed to check for new images: ${errorMessage}`,
          variant: "destructive",
        })

        // Stop monitoring on repeated errors
        stopMonitoring()
      }
    }, settings.pollingInterval * 1000)
  }, [settings, isAuthenticated, toast, isMonitoring])

  const stopMonitoring = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
    setIsMonitoring(false)
    setMonitorProgress(0)
  }, [])

  // Process Google Drive image
  const processGoogleDriveImage = async (file: GoogleDriveFile) => {
    if (!file || !file.id || !file.name) {
      console.error('Invalid file object:', file)
      return
    }

    try {
      setLoadingImages(prev => [...prev, file.id])

      // Validate file object
      if (!file.id || !file.name) {
        throw new Error('Invalid file data')
      }

      // Get file content via API
      const contentResponse = await fetch(`/api/google-drive/file/${file.id}`)
      if (!contentResponse.ok) {
        throw new Error(`Failed to get file content: ${contentResponse.status}`)
      }

      const { base64Data } = await contentResponse.json()
      if (!base64Data || typeof base64Data !== 'string') {
        throw new Error('Failed to get file content or invalid content received')
      }

      // Convert base64 to blob for FormData with error handling
      let blob: Blob
      try {
        const response = await fetch(`data:image/jpeg;base64,${base64Data}`)
        if (!response.ok) {
          throw new Error(`Failed to create blob: ${response.status}`)
        }
        blob = await response.blob()
      } catch (blobError) {
        console.error('Blob creation error:', blobError)
        throw new Error('Failed to process image data')
      }

      const formData = new FormData()
      formData.append("image", blob, file.name)
      formData.append("imageName", file.name)
      formData.append("googleDriveFileId", file.id)

      const apiResponse = await fetch("/api/images/analyze", {
        method: "POST",
        body: formData,
      })

      if (!apiResponse.ok) {
        const errorText = await apiResponse.text().catch(() => 'Unknown error')
        throw new Error(`Analysis failed: ${apiResponse.status} - ${errorText}`)
      }

      const data = await apiResponse.json()

      if (!data || !data.analysis) {
        throw new Error('Invalid analysis response received')
      }

      const newImage: ProcessedImage = {
        id: file.id,
        name: file.name,
        url: file.webViewLink || '',
        thumbnailUrl: file.thumbnailLink || '',
        analysis: data.analysis,
        processedAt: new Date().toISOString(),
        status: 'completed',
        googleDriveFileId: file.id
      }

      setProcessedImages(prev => [newImage, ...prev])

      toast({
        title: "Image Processed",
        description: `${file.name} has been analyzed successfully!`,
      })
    } catch (error) {
      console.error('Processing error for file:', file.name, error)

      // Add failed image to processed list for tracking
      const failedImage: ProcessedImage = {
        id: file.id,
        name: file.name,
        url: file.webViewLink || '',
        thumbnailUrl: file.thumbnailLink || '',
        analysis: {
          caption: 'Processing failed',
          hashtags: [],
          description: 'Failed to analyze image',
          mood: 'unknown',
          colors: [],
          objects: [],
          setting: 'unknown'
        },
        processedAt: new Date().toISOString(),
        status: 'failed',
        googleDriveFileId: file.id
      }

      setProcessedImages(prev => [failedImage, ...prev])

      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      toast({
        title: "Processing Error",
        description: `Failed to process ${file.name}: ${errorMessage}`,
        variant: "destructive",
      })
    } finally {
      setLoadingImages(prev => prev.filter(id => id !== file.id))
    }
  }

  // Select folder
  const selectFolder = async () => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please authenticate with Google Drive first",
        variant: "destructive",
      })
      return
    }

    try {
      // Use Google Picker API or show folder selection dialog
      // For now, we'll use a simple input dialog
      const folderId = prompt('Enter Google Drive folder ID:')
      if (folderId) {
        setSettings(prev => ({ ...prev, folderId, folderName: 'Selected Folder' }))
        toast({
          title: "Folder Selected",
          description: "Google Drive folder has been selected for monitoring",
        })
      }
    } catch (error) {
      console.error('Folder selection error:', error)
      toast({
        title: "Selection Error",
        description: "Failed to select folder",
        variant: "destructive",
      })
    }
  }

  // Delete processed image
  const deleteImage = (imageId: string) => {
    setProcessedImages(prev => prev.filter(img => img.id !== imageId))
    toast({
      title: "Image Deleted",
      description: "Image has been removed from the list",
    })
  }

  // Export results
  const exportResults = () => {
    try {
      if (!processedImages || processedImages.length === 0) {
        toast({
          title: "No Data",
          description: "No images to export",
          variant: "destructive",
        })
        return
      }

      const data = processedImages.map(img => ({
        name: img.name || 'Unknown',
        caption: img.analysis?.caption || 'No caption',
        hashtags: img.analysis?.hashtags?.join(', ') || '',
        description: img.analysis?.description || 'No description',
        mood: img.analysis?.mood || 'Unknown',
        processedAt: img.processedAt || new Date().toISOString()
      }))

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = url
      a.download = `image-analysis-results-${new Date().toISOString().split('T')[0]}.json`

      // Ensure the element is properly added to the DOM before clicking
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      // Clean up the URL object
      URL.revokeObjectURL(url)

      toast({
        title: "Results Exported",
        description: "Analysis results have been downloaded",
      })
    } catch (error) {
      console.error('Export error:', error)
      toast({
        title: "Export Failed",
        description: "Failed to export results",
        variant: "destructive",
      })
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".gif", ".webp"],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  })

  const copyToClipboard = async (text: string) => {
    try {
      if (!navigator.clipboard) {
        throw new Error('Clipboard API not available')
      }

      await navigator.clipboard.writeText(text)
      toast({
        title: "Copied",
        description: "Text copied to clipboard",
      })
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)

      // Fallback for older browsers
      try {
        const textArea = document.createElement('textarea')
        textArea.value = text
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)

        toast({
          title: "Copied",
          description: "Text copied to clipboard",
        })
      } catch (fallbackError) {
        console.error('Fallback copy failed:', fallbackError)
        toast({
          title: "Copy Failed",
          description: "Unable to copy to clipboard",
          variant: "destructive",
        })
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with authentication and settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Google Drive Image Monitor
              </CardTitle>
              <CardDescription>
                Monitor Google Drive folders for new images and automatically analyze them with AI
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {!isAuthenticated ? (
                <Button
                  onClick={async () => {
                    setAuthLoading(true)
                    try {
                      // Check if required environment variables are set
                      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
                        throw new Error('Supabase environment variables not configured')
                      }

                      const response = await fetch('/api/auth/google-drive', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' }
                      })

                      if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}))
                        throw new Error(errorData.error || `Authentication failed: ${response.status}`)
                      }

                      const { authUrl } = await response.json()

                      if (!authUrl) {
                        throw new Error('No authentication URL received')
                      }

                      // Open OAuth popup with error handling
                      const popup = window.open(
                        authUrl,
                        'google-auth',
                        'width=500,height=600,scrollbars=yes,resizable=yes'
                      )

                      if (!popup) {
                        throw new Error('Popup blocked by browser. Please allow popups for this site.')
                      }

                      // Listen for authentication result
                      const authPromise = new Promise<void>((resolve, reject) => {
                        let checkClosed: NodeJS.Timeout | null = null

                        const cleanup = () => {
                          if (checkClosed) {
                            clearInterval(checkClosed)
                            checkClosed = null
                          }
                          window.removeEventListener('message', messageHandler)
                        }

                        const messageHandler = (event: MessageEvent) => {
                          if (event.data.type === 'google-auth-success') {
                            cleanup()
                            if (popup && !popup.closed) {
                              popup.close()
                            }
                            resolve()
                          } else if (event.data.type === 'google-auth-error') {
                            cleanup()
                            if (popup && !popup.closed) {
                              popup.close()
                            }
                            reject(new Error(event.data.error || 'Authentication failed'))
                          }
                        }

                        checkClosed = setInterval(() => {
                          if (popup.closed) {
                            cleanup()
                            reject(new Error('Authentication popup was closed'))
                          }
                        }, 1000)

                        window.addEventListener('message', messageHandler)

                        // Timeout after 5 minutes
                        setTimeout(() => {
                          cleanup()
                          if (popup && !popup.closed) {
                            popup.close()
                          }
                          reject(new Error('Authentication timeout'))
                        }, 300000)
                      })

                      await authPromise
                      setIsAuthenticated(true)

                      // Re-initialize the service after successful auth
                      await initializeGoogleDriveService()

                      toast({
                        title: "Authentication Successful",
                        description: "Connected to Google Drive successfully!",
                      })
                    } catch (error) {
                      console.error('Authentication error:', error)
                      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
                      toast({
                        title: "Authentication Failed",
                        description: errorMessage,
                        variant: "destructive",
                      })
                    } finally {
                      setAuthLoading(false)
                    }
                  }}
                  disabled={authLoading}
                  variant="outline"
                >
                  {authLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Monitor className="h-4 w-4 mr-2" />
                  )}
                  Connect Google Drive
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Connected
                  </Badge>
                  <Button
                    onClick={async () => {
                      try {
                        await fetch('/api/auth/google-drive', { method: 'DELETE' })
                        setIsAuthenticated(false)
                        setSettings(prev => ({ ...prev, folderId: '', folderName: '' }))
                        toast({
                          title: "Signed Out",
                          description: "Disconnected from Google Drive",
                        })
                      } catch (error) {
                        console.error('Sign out error:', error)
                      }
                    }}
                    variant="outline"
                    size="sm"
                  >
                    Sign Out
                  </Button>
                </div>
              )}

              <Dialog open={showSettings} onOpenChange={setShowSettings}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Monitor Settings</DialogTitle>
                    <DialogDescription>
                      Configure your Google Drive folder monitoring preferences
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label>Monitored Folder</Label>
                      <div className="flex gap-2">
                        <Input
                          value={settings.folderName}
                          placeholder="No folder selected"
                          readOnly
                        />
                        <Button
                          onClick={selectFolder}
                          disabled={!isAuthenticated}
                          variant="outline"
                        >
                          <FolderOpen className="h-4 w-4 mr-2" />
                          Select Folder
                        </Button>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="pollingInterval">Polling Interval (seconds)</Label>
                      <Input
                        id="pollingInterval"
                        type="number"
                        value={settings.pollingInterval}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          pollingInterval: parseInt(e.target.value) || 30
                        }))}
                        min="10"
                        max="300"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="autoProcess">Auto-process new images</Label>
                      <Switch
                        id="autoProcess"
                        checked={settings.autoProcess}
                        onCheckedChange={(checked) => setSettings(prev => ({
                          ...prev,
                          autoProcess: checked
                        }))}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="llmPrompt">LLM Analysis Prompt</Label>
                      <Textarea
                        id="llmPrompt"
                        value={settings.llmPrompt}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          llmPrompt: e.target.value
                        }))}
                        rows={3}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label>Supported Image Formats</Label>
                      <div className="flex flex-wrap gap-2">
                        {settings.imageFormats.map((format, index) => (
                          <Badge key={index} variant="secondary">
                            {format}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isAuthenticated && settings.folderId && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="flex items-center gap-1">
                    <FolderOpen className="h-3 w-3" />
                    {settings.folderName}
                  </Badge>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {settings.pollingInterval}s interval
                  </Badge>
                </div>
                <div className="flex gap-2">
                  {!isMonitoring ? (
                    <Button onClick={startMonitoring} className="flex items-center gap-2">
                      <Play className="h-4 w-4" />
                      Start Monitoring
                    </Button>
                  ) : (
                    <Button onClick={stopMonitoring} variant="outline" className="flex items-center gap-2">
                      <Pause className="h-4 w-4" />
                      Stop Monitoring
                    </Button>
                  )}
                </div>
              </div>

              {isMonitoring && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Monitoring progress</span>
                    <span>{monitorProgress}%</span>
                  </div>
                  <Progress value={monitorProgress} className="h-2" />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main content tabs */}
      <Tabs defaultValue="upload" className="space-y-4">
        <TabsList>
          <TabsTrigger value="upload">Manual Upload</TabsTrigger>
          <TabsTrigger value="processed">Processed Images ({processedImages.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Manual Image Upload</CardTitle>
              <CardDescription>Upload images directly for immediate analysis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="imageName">Image Name (Optional)</Label>
                <Input
                  id="imageName"
                  value={imageName}
                  onChange={(e) => setImageName(e.target.value)}
                  placeholder="Enter a custom name for the image"
                />
              </div>

              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
                }`}
              >
                <input {...getInputProps()} />
                {isAnalyzing ? (
                  <div className="space-y-2">
                    <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Analyzing image...</p>
                  </div>
                ) : isDragActive ? (
                  <div className="space-y-2">
                    <Upload className="h-8 w-8 mx-auto text-primary" />
                    <p className="text-sm">Drop the image here...</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Drag & drop an image here, or click to select</p>
                    <p className="text-xs text-muted-foreground">Supports JPEG, PNG, GIF, WebP (max 10MB)</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {uploadedImage && (
            <Card>
              <CardHeader>
                <CardTitle>Uploaded Image</CardTitle>
              </CardHeader>
              <CardContent>
                <img
                  src={uploadedImage || "/placeholder.svg"}
                  alt="Uploaded"
                  className="max-w-full h-auto rounded-lg shadow-md"
                />
              </CardContent>
            </Card>
          )}

          {analysis && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Generated Content
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Caption */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Generated Caption</Label>
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm">{analysis.caption}</p>
                    <Button variant="ghost" size="sm" className="mt-2" onClick={() => copyToClipboard(analysis.caption)}>
                      Copy Caption
                    </Button>
                  </div>
                </div>

                {/* Hashtags */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-1">
                    <Hash className="h-4 w-4" />
                    Generated Hashtags
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {analysis.hashtags.map((hashtag, index) => (
                      <Badge key={index} variant="secondary" className="cursor-pointer">
                        #{hashtag}
                      </Badge>
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(analysis.hashtags.map((h) => `#${h}`).join(" "))}
                  >
                    Copy All Hashtags
                  </Button>
                </div>

                {/* Additional Details */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Description</Label>
                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">{analysis.description}</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Mood</Label>
                    <Badge variant="outline">{analysis.mood}</Badge>
                  </div>

                  {analysis.colors && analysis.colors.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Dominant Colors</Label>
                      <div className="flex flex-wrap gap-1">
                        {analysis.colors.map((color, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {color}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {analysis.objects && analysis.objects.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Objects Detected</Label>
                      <div className="flex flex-wrap gap-1">
                        {analysis.objects.map((object, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {object}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {analysis.setting && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Setting</Label>
                      <p className="text-sm text-muted-foreground">{analysis.setting}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="processed" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Processed Images</CardTitle>
                  <CardDescription>Images analyzed from Google Drive and manual uploads</CardDescription>
                </div>
                {processedImages.length > 0 && (
                  <Button onClick={exportResults} variant="outline" className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Export Results
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {processedImages.length === 0 ? (
                <div className="text-center py-8">
                  <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No images processed yet</p>
                  <p className="text-sm text-muted-foreground">Upload an image or start monitoring a Google Drive folder</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {processedImages.map((image) => (
                    <Card key={image.id} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          <div className="flex-shrink-0">
                            {image.thumbnailUrl ? (
                              <img
                                src={image.thumbnailUrl}
                                alt={image.name}
                                className="w-16 h-16 object-cover rounded-lg"
                              />
                            ) : (
                              <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                                <ImageIcon className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium truncate">{image.name}</h4>
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={image.status === 'completed' ? 'default' : image.status === 'processing' ? 'secondary' : 'destructive'}
                                  className="text-xs"
                                >
                                  {image.status === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
                                  {image.status === 'processing' && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                                  {image.status === 'failed' && <AlertCircle className="h-3 w-3 mr-1" />}
                                  {image.status}
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteImage(image.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                              {image.analysis.caption}
                            </p>
                            <div className="flex items-center justify-between">
                              <div className="flex flex-wrap gap-1">
                                {image.analysis.hashtags.slice(0, 3).map((hashtag, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    #{hashtag}
                                  </Badge>
                                ))}
                                {image.analysis.hashtags.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{image.analysis.hashtags.length - 3} more
                                  </Badge>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {new Date(image.processedAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
