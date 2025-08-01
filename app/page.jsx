'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import useAuthStore from '../stores/authStore'

export default function Home() {
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')
  const [isMounted, setIsMounted] = useState(false)
  const router = useRouter()
  
  const { setNickname: setStoreNickname, isLoading, hasNickname } = useAuthStore()

  // Ensure component is mounted before checking nickname
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Check if user already has a nickname set
  useEffect(() => {
    if (isMounted && hasNickname()) {
      router.push('/presentations')
    }
  }, [isMounted, hasNickname, router])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const trimmedNickname = nickname.trim()
    
    if (!trimmedNickname) {
      setError('Please enter a nickname')
      return
    }

    try {
      await setStoreNickname(trimmedNickname)
      router.push('/presentations')
    } catch (err) {
      setError(err.message || 'Please try again.')
    }
  }

  // Show loading state until mounted
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render form if user already has nickname
  if (hasNickname()) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Redirecting to presentations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to Collab Slides
          </h1>
          <p className="text-gray-600">
             Enter your nickname to access the presentations list
           </p>
        </div>

        <div className="bg-white py-8 px-6 shadow-lg rounded-lg">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-2">
                Nickname
              </label>
              <input
                id="nickname"
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Enter your nickname"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                disabled={isLoading}
                maxLength={50}
              />
              {error && (
                <p className="mt-2 text-sm text-red-600">{error}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || !nickname.trim()}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Signing in...
                </div>
              ) : (
                'Get Started'
              )}
            </button>
          </form>
        </div>

        <div className="text-center text-sm text-gray-500">
           <p>No registration required - just enter your nickname</p>
         </div>
      </div>
    </div>
  )
}
