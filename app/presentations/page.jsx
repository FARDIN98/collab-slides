'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import useAuthStore from '../../stores/authStore'
import usePresentationStore from '../../stores/presentationStore'
import CreatePresentationModal from '../../components/CreatePresentationModal'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { useClientMount } from '../../hooks/useClientMount'

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
  const isMounted = useClientMount()

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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
            <div className="absolute inset-0 rounded-full h-12 w-12 border-4 border-transparent border-r-purple-400 animate-spin animation-delay-150 mx-auto"></div>
          </div>
          <p className="mt-4 text-gray-700 font-medium">Loading your workspace...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-white/20 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent hover:from-blue-500 hover:via-purple-500 hover:to-indigo-500 transition-all duration-500 tracking-wide transform hover:scale-105 cursor-default inline-block">
                  Collab Slides
                </span>
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-2 bg-white/60 backdrop-blur-sm rounded-full px-4 py-2 border border-white/30">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="bg-gradient-to-r from-gray-700 via-gray-800 to-gray-700 bg-clip-text text-transparent font-bold tracking-wide hover:from-blue-600 hover:via-purple-600 hover:to-indigo-600 transition-all duration-300 cursor-default">Welcome, {nickname}!</span>
              </div>
              <Button
                onClick={handleLogout}
                variant="outline"
                className="bg-white/60 backdrop-blur-sm border-blue-400 hover:bg-red-50 hover:border-red-200 hover:text-red-700 transition-all duration-200"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="font-bold tracking-wide">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Hero Section */}
          <div className="text-center mb-12">
            
            <Button 
              onClick={() => setIsModalOpen(true)}
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="font-bold tracking-wide">Create New Presentation</span>
            </Button>
          </div>

          {/* Presentations List */}
          <div className="bg-white/60 backdrop-blur-sm shadow-xl rounded-2xl border border-white/20">
            <div className="px-8 py-6 border-b border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    <span className="bg-gradient-to-r from-gray-900 via-blue-800 to-gray-900 bg-clip-text text-transparent hover:from-blue-600 hover:via-purple-600 hover:to-indigo-600 transition-all duration-300 tracking-wide cursor-default">
                      Your Presentations
                    </span>
                  </h2>
                  
                </div>
                <div className="hidden md:flex items-center space-x-2 text-sm text-gray-500">
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent hover:from-blue-500 hover:to-blue-700 transition-all duration-200 cursor-default">Creator</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="font-bold bg-gradient-to-r from-green-600 to-green-800 bg-clip-text text-transparent hover:from-green-500 hover:to-green-700 transition-all duration-200 cursor-default">Editor</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                  <span className="font-bold bg-gradient-to-r from-gray-600 to-gray-800 bg-clip-text text-transparent hover:from-gray-500 hover:to-gray-700 transition-all duration-200 cursor-default">Viewer</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Loading State */}
            {presentationsLoading ? (
              <div className="px-8 py-16 text-center">
                <div className="relative mx-auto w-16 h-16">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
                  <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-transparent border-r-purple-400 animate-spin animation-delay-150"></div>
                </div>
                <p className="mt-4 text-gray-600 font-medium">Loading presentations...</p>
              </div>
            ) : presentations.length === 0 ? (
              /* Empty State */
              <div className="px-8 py-20 text-center">
                <div className="relative mx-auto w-24 h-24 mb-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full"></div>
                  <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
                    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  <span className="bg-gradient-to-r from-gray-900 via-purple-700 to-gray-900 bg-clip-text text-transparent hover:from-purple-600 hover:via-blue-600 hover:to-purple-600 transition-all duration-300 tracking-wide cursor-default">
                    Ready to create something amazing?
                  </span>
                </h3>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  Start your collaborative journey by creating your first presentation. 
                  Invite team members and work together in real-time.
                </p>
                <Button 
                  onClick={() => setIsModalOpen(true)}
                  size="lg"
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="font-bold tracking-wide">Create Your First Presentation</span>
                </Button>
              </div>
            ) : (
              /* Presentations Grid */
              <div className="p-8">
                <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {presentations.map((presentation, index) => (
                    <Card 
                      key={presentation.id} 
                      className="group relative overflow-hidden hover:shadow-2xl hover:scale-[1.02] transition-all duration-500 bg-gradient-to-br from-white/90 via-white/80 to-white/70 backdrop-blur-md border border-white/40 hover:border-blue-300/50 cursor-pointer"
                      style={{
                        animationDelay: `${index * 100}ms`,
                        animation: 'fadeInUp 0.6s ease-out forwards'
                      }}
                    >
                      {/* Gradient overlay that appears on hover */}
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      
                      {/* Animated border effect */}
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 opacity-0 group-hover:opacity-20 blur-sm transition-opacity duration-500"></div>
                      
                      <CardHeader className="pb-4 relative z-10">
                        {/* Title and Role Badge */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1 mr-3">
                            <CardTitle className="text-xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent group-hover:from-blue-600 group-hover:via-purple-600 group-hover:to-indigo-600 transition-all duration-300 line-clamp-2 leading-tight">
                              {presentation.name}
                            </CardTitle>
                            
                          </div>
                          {presentation.user_role ? (
                            <Badge 
                              variant={
                                presentation.user_role === 'creator' ? 'default' :
                                presentation.user_role === 'editor' ? 'secondary' : 'outline'
                              }
                              className={`shrink-0 shadow-lg transform hover:scale-105 transition-transform duration-200 ${
                                presentation.user_role === 'creator' 
                                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 shadow-blue-200' 
                                  : presentation.user_role === 'editor'
                                  ? 'bg-gradient-to-r from-green-500 to-green-600 text-white border-0 shadow-green-200'
                                  : 'bg-gradient-to-r from-gray-500 to-gray-600 text-white border-0 shadow-gray-200'
                              }`}
                            >
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {presentation.user_role === 'creator' ? (
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                ) : presentation.user_role === 'editor' ? (
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                ) : (
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                )}
                              </svg>
                              {presentation.user_role}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="shrink-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-lg shadow-orange-200 transform hover:scale-105 transition-transform duration-200">
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                              <span className="font-bold tracking-wide">not joined</span>
                            </Badge>
                          )}
                        </div>
                        
                        {/* Enhanced Slides count indicator */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="relative">
                              <div className="flex items-center space-x-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-2 rounded-xl shadow-lg shadow-indigo-200 transform hover:scale-105 transition-all duration-200">
                                <div className="relative">
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                  </svg>
                                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full animate-ping"></div>
                                </div>
                                <span className="font-extrabold text-sm bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent hover:from-yellow-200 hover:via-white hover:to-yellow-200 transition-all duration-300 tracking-wide transform hover:scale-105 cursor-default">
                                   {presentation.slides_count || 0} slide{(presentation.slides_count || 0) !== 1 ? 's' : ''}
                                 </span>
                              </div>
                            </div>
                            {presentation.slides_count > 5 && (
                              <div className="flex items-center space-x-1 px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold rounded-lg shadow-md shadow-emerald-200 transform hover:scale-105 transition-all duration-200">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="font-extrabold bg-gradient-to-r from-white via-emerald-100 to-white bg-clip-text text-transparent hover:from-yellow-200 hover:via-white hover:to-yellow-200 transition-all duration-300 tracking-widest transform hover:scale-110 cursor-default">Rich</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Activity indicator */}
                          
                        </div>
                      </CardHeader>
                      
                      <CardContent className="pb-6 relative z-10">
                        {/* Description with enhanced styling */}
                        {presentation.description && (
                          <div className="mb-6">
                            <div className="relative">
                              <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-blue-400 to-purple-400 rounded-full"></div>
                              <CardDescription className="text-gray-700 line-clamp-3 leading-relaxed pl-4 font-medium">
                                {presentation.description}
                              </CardDescription>
                            </div>
                          </div>
                        )}
                        
                        {/* Enhanced metadata section */}
                        <div className="space-y-4">
                          {/* Creator info with fancy styling */}
                          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50/80 to-blue-50/80 rounded-xl border border-gray-100/50 backdrop-blur-sm">
                            <div className="flex items-center space-x-3">
                              <div className="relative">
                                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
                              </div>
                              <div>
                                <p className="font-bold text-gray-900 text-sm">
                                  <span className="bg-gradient-to-r from-gray-900 via-blue-800 to-gray-900 bg-clip-text text-transparent hover:from-blue-600 hover:via-purple-600 hover:to-indigo-600 transition-all duration-300 tracking-wide cursor-default">
                                    {presentation.creator_nickname}
                                  </span>
                                </p>
                                <p className="text-xs text-gray-500 font-medium">
                                  <span className="bg-gradient-to-r from-gray-600 via-blue-500 to-gray-600 bg-clip-text text-transparent hover:from-blue-500 hover:via-purple-500 hover:to-blue-500 transition-all duration-300 tracking-wider cursor-default">
                                    Creator
                                  </span>
                                </p>
                              </div>
                            </div>
                            
                          </div>
                          
                          
                        </div>
                      </CardContent>
                      
                      <CardFooter className="pt-0">
                        <Button 
                          onClick={() => handleJoinPresentation(presentation.id)}
                          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all duration-200 group-hover:scale-105"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                          </svg>
                          <span className="font-bold tracking-wide">Join Presentation</span>
                        </Button>
                      </CardFooter>
                      
                      {/* Decorative corner accent */}
                      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-blue-400/10 via-purple-400/5 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    </Card>
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
        <div className="fixed bottom-6 right-6 bg-red-500/90 backdrop-blur-sm text-white px-6 py-4 rounded-xl shadow-2xl border border-red-400/20 z-50 max-w-md animate-in slide-in-from-right-full">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-red-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-medium">{error}</p>
            </div>
            <button
              onClick={clearError}
              className="flex-shrink-0 text-red-200 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}