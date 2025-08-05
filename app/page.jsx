'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import useAuthStore from '../stores/authStore'
import { useClientMount } from '../hooks/useClientMount'
import { logError, getErrorMessage } from '../lib/errorHandler'

export default function Home() {
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')
  const isMounted = useClientMount()
  const router = useRouter()
  
  const { setNickname: setAuthNickname, isLoading, hasNickname } = useAuthStore()

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
      await setAuthNickname(trimmedNickname)
      router.push('/presentations')
    } catch (err) {
      logError('Nickname Setup', err)
      setError(getErrorMessage(err, 'Please try again.'))
    }
  }

  // Show fancy loading state until mounted
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative mx-auto w-16 h-16 mb-4">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
            <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-transparent border-r-purple-400 animate-spin animation-delay-150"></div>
          </div>
          <p className="text-gray-700 font-medium">
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Loading...
            </span>
          </p>
        </div>
      </div>
    )
  }

  // Don't render form if user already has nickname
  if (hasNickname()) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative mx-auto w-16 h-16 mb-4">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-200 border-t-green-600"></div>
            <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-transparent border-r-blue-400 animate-spin animation-delay-150"></div>
          </div>
          <p className="text-gray-700 font-medium">
            <span className="bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
              Redirecting to presentations...
            </span>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-10 left-10 w-72 h-72 bg-blue-300/20 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
        <div className="absolute top-0 right-4 w-72 h-72 bg-purple-300/20 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300/20 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Hero section */}
          <div className="text-center space-y-6">
            {/* Logo/Icon */}
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl transform hover:scale-105 transition-transform duration-300">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>

            {/* Main heading */}
            <div className="space-y-3">
              <h1 className="text-4xl md:text-5xl font-bold">
                <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent hover:from-blue-500 hover:via-purple-500 hover:to-indigo-500 transition-all duration-500 tracking-tight transform hover:scale-105 cursor-default inline-block">
                  Collab Slides
                </span>
              </h1>
              <p className="text-xl text-gray-600 max-w-sm mx-auto leading-relaxed">
                <span className="bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 bg-clip-text text-transparent hover:from-blue-600 hover:via-purple-600 hover:to-indigo-600 transition-all duration-300 cursor-default">
                  Create, collaborate, and present together in real-time
                </span>
              </p>
            </div>

            {/* Feature highlights */}
            <div className="flex justify-center space-x-6 text-sm text-gray-500">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="font-medium bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent">Real-time</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse animation-delay-1000"></div>
                <span className="font-medium bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">Collaborative</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse animation-delay-2000"></div>
                <span className="font-medium bg-gradient-to-r from-purple-600 to-purple-700 bg-clip-text text-transparent">No signup</span>
              </div>
            </div>
          </div>

          {/* Form card */}
          <div className="relative">
            {/* Gradient border effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 rounded-2xl blur-sm opacity-30"></div>
            
            <div className="relative bg-white/80 backdrop-blur-xl py-8 px-6 shadow-2xl rounded-2xl border border-white/20">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="nickname" className="block text-sm font-bold text-gray-700 mb-3">
                    <span className="bg-gradient-to-r from-gray-800 via-blue-700 to-gray-800 bg-clip-text text-transparent">
                      Choose your nickname
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      id="nickname"
                      type="text"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder="Enter your nickname"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 bg-white/70 backdrop-blur-sm hover:bg-white/90"
                      disabled={isLoading}
                      maxLength={50}
                    />
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-400/10 via-purple-400/10 to-pink-400/10 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                  </div>
                  {error && (
                    <div className="mt-3 p-3 bg-red-50/80 backdrop-blur-sm border border-red-200 rounded-lg">
                      <p className="text-sm text-red-600 font-medium">{error}</p>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !nickname.trim()}
                  className="w-full relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 text-white font-bold py-3 px-6 rounded-xl shadow-xl hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none group"
                >
                  {/* Animated shimmer effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  
                  <div className="relative flex items-center justify-center">
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                        <span className="tracking-wide">Signing in...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-2 transform group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                        <span className="tracking-wide">Get Started</span>
                      </>
                    )}
                  </div>
                </button>
              </form>
            </div>
          </div>

          {/* Bottom text */}
          <div className="text-center">
            <p className="text-sm text-gray-500">
              <span className="bg-gradient-to-r from-gray-600 via-gray-500 to-gray-600 bg-clip-text text-transparent hover:from-blue-500 hover:via-purple-500 hover:to-indigo-500 transition-all duration-300 cursor-default">
                ✨ No registration required - just enter your nickname and start creating
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        .animation-delay-1000 {
          animation-delay: 1s;
        }
        .animation-delay-150 {
          animation-delay: 150ms;
        }
      `}</style>
    </div>
  )
}
