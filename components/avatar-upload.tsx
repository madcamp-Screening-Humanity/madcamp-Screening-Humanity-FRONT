"use client"

import React from "react"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { useAppStore } from "@/lib/store"
import { Upload, X, Camera, User, ArrowLeft, Loader2 } from "lucide-react"
import { generationApi } from "@/lib/api/client"

export function AvatarUpload() {
  const { step, setStep, setUploadedImage, setAvatarUrl, setGenerationJobId } = useAppStore()
  const [dragActive, setDragActive] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const isVisible = step === "avatar-upload"

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }, [])

  const handleFile = (file: File) => {
    if (file.type.startsWith("image/")) {
      setSelectedFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        setPreview(result)
        setUploadedImage(result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleContinue = async () => {
    if (!selectedFile) return

    try {
      setIsUploading(true)
      // Call Generation API
      const response = await generationApi.generateCharacter(selectedFile)

      if (response.success && response.data) {
        setGenerationJobId(response.data.job_id)
        setStep("avatar-preview")
      } else {
        console.error("Failed to start generation:", response.error)
        // TODO: Show error toast
      }
    } catch (error) {
      console.error("Error starting generation:", error)
    } finally {
      setIsUploading(false)
    }
  }

  const handleSkip = () => {
    setAvatarUrl("default")
    setStep("scenario-setup")
  }

  const handleBack = () => {
    setStep("mode-select")
  }

  const clearPreview = () => {
    setPreview(null)
    setUploadedImage(null)
  }

  if (!isVisible) return null

  return (
    <div className="min-h-screen flex flex-col bg-background" suppressHydrationWarning>
      <header className="p-4 border-b border-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          뒤로
        </Button>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="max-w-md w-full space-y-8 text-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              아바타 만들기
            </h1>
            <p className="text-muted-foreground mt-2">
              당신의 얼굴로 3D 아바타를 만들어보세요
            </p>
          </div>

          {preview ? (
            <div className="space-y-6">
              <div className="relative w-48 h-48 mx-auto">
                <img
                  src={preview || "/placeholder.svg"}
                  alt="Uploaded preview"
                  className="w-full h-full object-cover rounded-full border-4 border-primary"
                />
                <button
                  onClick={clearPreview}
                  className="absolute -top-2 -right-2 p-1 bg-destructive rounded-full text-destructive-foreground hover:bg-destructive/90"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <Button
                onClick={handleContinue}
                className="w-full py-6 text-lg bg-primary text-primary-foreground hover:bg-primary/90"
              >
                3D 변환하기
                {isUploading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              </Button>
            </div>
          ) : (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-2xl p-12 transition-all ${dragActive
                  ? "border-primary bg-primary/10"
                  : "border-border bg-secondary/30 hover:border-muted-foreground"
                }`}
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleInputChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 rounded-full bg-muted">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-foreground font-medium">
                    사진을 드래그하거나 클릭하여 업로드
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    JPG, PNG (최대 10MB)
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-sm text-muted-foreground">또는</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <Button
            variant="outline"
            onClick={handleSkip}
            className="w-full py-6 border-border text-foreground hover:bg-secondary bg-transparent"
          >
            <User className="h-5 w-5 mr-2" />
            기본 캐릭터 사용하기
          </Button>
        </div>
      </div>
    </div>
  )
}
