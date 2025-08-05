'use client'

import React, { useState, useRef, useCallback } from 'react'
import { Upload, X, AlertCircle, CheckCircle } from 'lucide-react'

interface ImageUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onImageUpload: (imageUrl: string) => void
  presentationId: string
}

interface UploadState {
  isUploading: boolean
  progress: number
  error: string | null
  success: boolean
}

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export default function ImageUploadModal({ isOpen, onClose, onImageUpload, presentationId }: ImageUploadModalProps) {
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
    success: false
  })
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetState = useCallback(() => {
    setUploadState({
      isUploading: false,
      progress: 0,
      error: null,
      success: false
    })
    setIsDragOver(false)
  }, [])

  const validateFile = useCallback((file: File): { isValid: boolean; error?: string } => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        isValid: false,
        error: `File size too large. Maximum allowed size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`
      }
    }

    // Check file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return {
        isValid: false,
        error: 'Unsupported file type. Please upload JPG, PNG, GIF, WEBP, or SVG images.'
      }
    }

    return { isValid: true }
  }, [])

  const uploadFile = useCallback(async (file: File) => {
    // Validate file
    const validation = validateFile(file)
    if (!validation.isValid) {
      setUploadState(prev => ({ ...prev, error: validation.error || 'Invalid file' }))
      return
    }

    setUploadState(prev => ({ ...prev, isUploading: true, error: null, progress: 0 }))

    try {
      const formData = new FormData()
      formData.append('image', file)
      formData.append('presentationId', presentationId)

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (result.success) {
        setUploadState(prev => ({ ...prev, isUploading: false, success: true, progress: 100 }))
        onImageUpload(result.imageUrl)
        
        // Close modal after short delay
        setTimeout(() => {
          onClose()
          resetState()
        }, 1000)
      } else {
        setUploadState(prev => ({ 
          ...prev, 
          isUploading: false, 
          error: result.error || 'Upload failed' 
        }))
      }
    } catch (error) {
      console.error('Upload error:', error)
      setUploadState(prev => ({ 
        ...prev, 
        isUploading: false, 
        error: 'Network error. Please try again.' 
      }))
    }
  }, [validateFile, presentationId, onImageUpload, onClose, resetState])

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return
    
    const file = files[0]
    uploadFile(file)
  }, [uploadFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    
    const files = e.dataTransfer.files
    handleFileSelect(files)
  }, [handleFileSelect])

  const handleClick = useCallback(() => {
    if (!uploadState.isUploading) {
      fileInputRef.current?.click()
    }
  }, [uploadState.isUploading])

  const handleClose = useCallback(() => {
    if (!uploadState.isUploading) {
      onClose()
      resetState()
    }
  }, [uploadState.isUploading, onClose, resetState])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Upload Image</h3>
          <button
            onClick={handleClose}
            disabled={uploadState.isUploading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Upload Area */}
          <div
            className={`
              relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 cursor-pointer
              ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
              ${uploadState.isUploading ? 'pointer-events-none opacity-50' : ''}
              ${uploadState.success ? 'border-green-500 bg-green-50' : ''}
              ${uploadState.error ? 'border-red-500 bg-red-50' : ''}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleClick}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
            />

            {/* Upload Icon and Text */}
            <div className="space-y-4">
              {uploadState.success ? (
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
              ) : uploadState.error ? (
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
              ) : (
                <Upload className={`w-12 h-12 mx-auto transition-colors ${
                  isDragOver ? 'text-blue-500' : 'text-gray-400'
                }`} />
              )}
              
              {uploadState.isUploading ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">Uploading...</p>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadState.progress}%` }}
                    />
                  </div>
                </div>
              ) : uploadState.success ? (
                <p className="text-sm text-green-600 font-medium">Image uploaded successfully!</p>
              ) : uploadState.error ? (
                <p className="text-sm text-red-600">{uploadState.error}</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-base font-medium text-gray-900">
                    Click here to upload your image
                  </p>
                  <p className="text-sm text-gray-500">
                    or drag and drop your image here
                  </p>
                  <p className="text-xs text-gray-400">
                    Supports JPG, PNG, GIF, WEBP, SVG (max 10MB)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={handleClose}
              disabled={uploadState.isUploading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploadState.success ? 'Done' : 'Cancel'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}