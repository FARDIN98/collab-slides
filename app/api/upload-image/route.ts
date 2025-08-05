import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'


const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)


const ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml'
]


const MAX_FILE_SIZE = 10 * 1024 * 1024


function generateUniqueFilename(originalName: string): string {
  const timestamp = Date.now()
  const randomString = crypto.randomBytes(6).toString('hex')
  const extension = originalName.split('.').pop()?.toLowerCase() || 'jpg'
  return `img-${timestamp}-${randomString}.${extension}`
}


function validateFile(file: File): { isValid: boolean; error?: string } {
  
  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File size too large. Maximum allowed size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`
    }
  }

  
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      isValid: false,
      error: `Unsupported file type. Allowed types: ${ALLOWED_TYPES.join(', ')}`
    }
  }

  return { isValid: true }
}


function sanitizePresentationId(id: string): string {
  return id.replace(/[^a-zA-Z0-9-_]/g, '')
}

export async function POST(request: NextRequest) {
  try {
    
    const formData = await request.formData()
    const file = formData.get('image') as File
    const presentationId = formData.get('presentationId') as string


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


    const validation = validateFile(file)
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      )
    }


    const sanitizedPresentationId = sanitizePresentationId(presentationId)
    if (!sanitizedPresentationId) {
      return NextResponse.json(
        { success: false, error: 'Invalid presentation ID' },
        { status: 400 }
      )
    }


    const fileName = generateUniqueFilename(file.name)
    

    const filePath = `presentations/${sanitizedPresentationId}/${fileName}`
    

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    

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