import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// Initialize Supabase client with service role key for file uploads
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Supported image MIME types
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml'
]

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024

// Generate unique filename
function generateUniqueFilename(originalName: string): string {
  const timestamp = Date.now()
  const randomString = crypto.randomBytes(6).toString('hex')
  const extension = originalName.split('.').pop()?.toLowerCase() || 'jpg'
  return `img-${timestamp}-${randomString}.${extension}`
}

// Validate file type and size
function validateFile(file: File): { isValid: boolean; error?: string } {
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
      error: `Unsupported file type. Allowed types: ${ALLOWED_TYPES.join(', ')}`
    }
  }

  return { isValid: true }
}

// Sanitize presentation ID to prevent directory traversal
function sanitizePresentationId(id: string): string {
  return id.replace(/[^a-zA-Z0-9-_]/g, '')
}

export async function POST(request: NextRequest) {
  try {
    // Parse form data
    const formData = await request.formData()
    const file = formData.get('image') as File
    const presentationId = formData.get('presentationId') as string

    // Validate required fields
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No image file provided' },
        { status: 400 }
      )
    }

    if (!presentationId) {
      return NextResponse.json(
        { success: false, error: 'Presentation ID is required' },
        { status: 400 }
      )
    }

    // Validate file
    const validation = validateFile(file)
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      )
    }

    // Sanitize presentation ID
    const sanitizedPresentationId = sanitizePresentationId(presentationId)
    if (!sanitizedPresentationId) {
      return NextResponse.json(
        { success: false, error: 'Invalid presentation ID' },
        { status: 400 }
      )
    }

    // Generate unique filename
    const fileName = generateUniqueFilename(file.name)
    
    // Create file path for organized storage
    const filePath = `presentations/${sanitizedPresentationId}/${fileName}`
    
    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('images')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false
      })

    if (error) {
      console.error('Supabase storage error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to upload image to storage' },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('images')
      .getPublicUrl(filePath)

    if (!urlData?.publicUrl) {
      return NextResponse.json(
        { success: false, error: 'Failed to generate public URL' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      imageUrl: urlData.publicUrl,
      fileName
    })
    
  } catch (error) {
    console.error('Image upload error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error during file upload' },
      { status: 500 }
    )
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' },
    { status: 405 }
  )
}

export async function PUT() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' },
    { status: 405 }
  )
}

export async function DELETE() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' },
    { status: 405 }
  )
}