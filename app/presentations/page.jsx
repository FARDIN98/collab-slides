'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import useAuthStore from '../../stores/authStore'
import usePresentationStore from '../../stores/presentationStore'
import CreatePresentationModal from '../../components/CreatePresentationModal'

export default function Presentations() {
  const { nickname, hasNickname, clearNickname } = useAuthStore()
  const { 
    presentations, 
    isLoading: presentationsLoading, 
    error, 
    createPresentation, 
    fetchUserPresentations,
    clearError 
  } = usePresentationStore()
  const router = useRouter()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isMounted) return
    
    if (!hasNickname()) {
      router.push('/')
    } else {
      // Fetch user presentations when component mounts
      fetchUserPresentations(nickname)
    }
  }, [isMounted, hasNickname, router, nickname, fetchUserPresentations])

  const handleLogout = () => {
    clearNickname()
    router.push('/')
  }

  const handleCreatePresentation = async (title, description) => {
    try {
      await createPresentation(title, description, nickname)
    } catch (error) {
      // Error is handled in the store and modal
      throw error
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const handleJoinPresentation = (presentationId) => {
    router.push(`/slideEditor?id=${presentationId}`)
  }

  if (!isMounted || !hasNickname()) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Collab Slides</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {nickname}!</span>
              <button
                onClick={handleLogout}
                className="bg-gray-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Create New Presentation Button */}
          <div className="mb-6">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md font-medium transition-colors flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create New Presentation
            </button>
          </div>

          {/* Presentations List */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">All Presentations</h2>
            </div>
            
            {/* Loading State */}
            {presentationsLoading ? (
              <div className="px-6 py-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading presentations...</p>
              </div>
            ) : presentations.length === 0 ? (
              /* Empty State */
              <div className="px-6 py-12 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No presentations yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by creating your first collaborative presentation.
                </p>
                <div className="mt-6">
                  <button 
                    onClick={() => setIsModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Create Presentation
                  </button>
                </div>
              </div>
            ) : (
              /* Presentations Grid */
              <div className="p-6">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {presentations.map((presentation) => (
                    <div key={presentation.id} className="border-2 border-gray-300 rounded-lg p-6 hover:shadow-lg transition-all duration-200 bg-white">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">{presentation.name}</h3>
                        {presentation.user_role ? (
                          <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                            presentation.user_role === 'creator' 
                              ? 'bg-blue-100 text-blue-800' 
                              : presentation.user_role === 'editor'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {presentation.user_role}
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs rounded-full font-medium bg-yellow-100 text-yellow-800">
                            not joined
                          </span>
                        )}
                      </div>
                      {presentation.description && (
                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{presentation.description}</p>
                      )}
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                        <span>By {presentation.creator_nickname}</span>
                        <span>{formatDate(presentation.created_at)}</span>
                      </div>
                      <button 
                        onClick={() => handleJoinPresentation(presentation.id)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md text-sm font-medium transition-colors"
                      >
                        Join
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>


        </div>
      </div>

      {/* Create Presentation Modal */}
      <CreatePresentationModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          clearError()
        }}
        onSubmit={handleCreatePresentation}
        isLoading={presentationsLoading}
      />

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-6 py-3 rounded-md shadow-lg z-50">
          <div className="flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={clearError}
              className="ml-4 text-white hover:text-gray-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}