import { useState, useEffect } from 'react'

/**
 * Custom hook to handle client-side mounting state
 * Prevents hydration mismatches in Next.js
 */
export const useClientMount = () => {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  return isMounted
}