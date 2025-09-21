"use client"

import { useState } from "react"
import { ImageUploader } from "@/components/image-uploader"
import { ImageGallery } from "@/components/image-gallery"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, Battery as Gallery } from "lucide-react"

export default function ImagesPage() {
  const [refreshKey, setRefreshKey] = useState(0)

  const handleImageProcessed = () => {
    setRefreshKey((prev) => prev + 1)
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Image Caption Generator</h1>
        <p className="text-muted-foreground">Generate AI-powered captions and hashtags for your images</p>
      </div>

      <Tabs defaultValue="upload" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload & Analyze
          </TabsTrigger>
          <TabsTrigger value="gallery" className="flex items-center gap-2">
            <Gallery className="h-4 w-4" />
            Image Gallery
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload">
          <ImageUploader />
        </TabsContent>

        <TabsContent value="gallery">
          <ImageGallery refresh={refreshKey} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
