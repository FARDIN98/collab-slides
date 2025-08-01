import { createClient } from '@supabase/supabase-js'

// Get Supabase URL and anonymous key from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Validate that required environment variables are present
if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
}

if (!supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')
}

// Create and configure the Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Enable automatic token refresh
    autoRefreshToken: true,
    // Persist auth state in localStorage
    persistSession: true,
    // Detect auth state changes and update accordingly
    detectSessionInUrl: true
  }
})

// Export the Supabase client for app-wide usage
export default supabase

// Named export for convenience
export { supabase }