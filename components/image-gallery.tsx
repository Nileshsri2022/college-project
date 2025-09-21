"use client"

import { Label } from "@/components/ui/label"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { ImageCaption } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { ImageIcon, Hash, Copy, Calendar, Loader2 } from "lucide-react"

export function ImageGallery({ refresh }: { refresh?: number }) {
  const [images, setImages] = useState<ImageCaption[]>([])
  const [stats, setStats] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchImages()
  }, [refresh])

  const fetchImages = async () => {
    try {
      const response = await fetch("/api/images")
      if (!response.ok) throw new Error("Failed to fetch images")

      const data = await response.json()
      setImages(data.images || [])
      setStats(data.stats || {})
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load images",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied",
      description: "Text copied to clipboard",
    })
  }

  const getStatusColor = (status: string) => {
    const colors = {
      completed: "bg-green-100 text-green-800 border-green-200",
      processing: "bg-yellow-100 text-yellow-800 border-yellow-200",
      pending: "bg-blue-100 text-blue-800 border-blue-200",
      failed: "bg-red-100 text-red-800 border-red-200",
    }
    return colors[status as keyof typeof colors] || colors.pending
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading images...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{images.length}</p>
              <p className="text-sm text-muted-foreground">Total Images</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{stats.completed || 0}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">{stats.processing || 0}</p>
              <p className="text-sm text-muted-foreground">Processing</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{stats.failed || 0}</p>
              <p className="text-sm text-muted-foreground">Failed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Image Gallery */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Processed Images
          </CardTitle>
          <CardDescription>Your images with AI-generated captions and hashtags</CardDescription>
        </CardHeader>
        <CardContent>
          {images.length === 0 ? (
            <div className="text-center py-8">
              <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No images processed yet. Upload your first image above!</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {images.map((image) => (
                <Card key={image.id} className="overflow-hidden">
                  <div className="aspect-square relative">
                    {image.image_url && (
                      <img
                        src={image.image_url || "/placeholder.svg"}
                        alt={image.image_name || "Processed image"}
                        className="w-full h-full object-cover"
                      />
                    )}
                    <div className="absolute top-2 right-2">
                      <Badge className={getStatusColor(image.processing_status)}>{image.processing_status}</Badge>
                    </div>
                  </div>

                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-sm truncate">{image.image_name || "Untitled"}</h3>
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3 mr-1" />
                        {new Date(image.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    {image.processing_status === "completed" && (
                      <>
                        {image.generated_caption && (
                          <div className="space-y-2">
                            <Label className="text-xs font-medium">Caption</Label>
                            <p className="text-xs text-muted-foreground line-clamp-3">{image.generated_caption}</p>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs"
                              onClick={() => copyToClipboard(image.generated_caption)}
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              Copy
                            </Button>
                          </div>
                        )}

                        {image.generated_hashtags && image.generated_hashtags.length > 0 && (
                          <div className="space-y-2">
                            <Label className="text-xs font-medium flex items-center gap-1">
                              <Hash className="h-3 w-3" />
                              Hashtags
                            </Label>
                            <div className="flex flex-wrap gap-1">
                              {image.generated_hashtags.slice(0, 6).map((hashtag, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  #{hashtag}
                                </Badge>
                              ))}
                              {image.generated_hashtags.length > 6 && (
                                <Badge variant="outline" className="text-xs">
                                  +{image.generated_hashtags.length - 6} more
                                </Badge>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs"
                              onClick={() => copyToClipboard(image.generated_hashtags.map((h) => `#${h}`).join(" "))}
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              Copy All
                            </Button>
                          </div>
                        )}
                      </>
                    )}

                    {image.processing_status === "processing" && (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        <span className="text-sm text-muted-foreground">Processing...</span>
                      </div>
                    )}

                    {image.processing_status === "failed" && (
                      <div className="text-center py-4">
                        <p className="text-sm text-red-600">Processing failed</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
