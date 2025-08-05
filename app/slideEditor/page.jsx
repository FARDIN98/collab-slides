'use client'

import React, { useEffect, useState, useCallback, Suspense, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { logError } from '../../lib/errorHandler'
import { useClientMount } from '../../hooks/useClientMount'
import { 
  ArrowLeft, 
  Play, 
  Menu, 
  Users, 
  User,
  Eye,
  EyeOff,
  Save,
  MousePointer2,
  LogOut,
  Grip
} from 'lucide-react'

import useAuthStore from '../../stores/authStore'
import usePresentationStore from '../../stores/presentationStore'
import TextBlock from '../../components/TextBlock'
import SlidesPanel from '../../components/SlidesPanel'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'

function SlideEditorContent() {
  const { nickname, hasNickname, clearNickname } = useAuthStore()
  const { 
    slides, 
    users, 
    currentPresentation,
    isLoading, 
    joinPresentation, 
    fetchSlides, 
    fetchPresentationDetails,
    addSlide, 
    removeSlide, 
    updateSlideContent,
    updateUserRole,
    canEditSlides,
    subscribeToSlideUpdates,
    unsubscribeFromUserUpdates,
    isCurrentUserCreator,
    fetchPresentationUsers,
    setSlides
  } = usePresentationStore()
  const router = useRouter()
  const searchParams = useSearchParams()
  const presentationId = searchParams.get('id')
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isUsersOpen, setIsUsersOpen] = useState(false) // Initially hidden on mobile
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)

  // Handle responsive initial states
  useEffect(() => {
    const handleResize = () => {
      const isDesktop = window.innerWidth >= 768 // md breakpoint
      if (isDesktop) {
        setIsSidebarOpen(true) // Show left sidebar on desktop
        setIsUsersOpen(true)   // Show collaborator section on desktop
      } else {
        setIsSidebarOpen(false) // Hide left sidebar on mobile
        setIsUsersOpen(false)   // Hide collaborator section on mobile
      }
    }

    // Set initial state
    handleResize()
    
    // Add resize listener
    window.addEventListener('resize', handleResize)
    
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  const [roleChangeLoading, setRoleChangeLoading] = useState(null)
  const [slideActionLoading, setSlideActionLoading] = useState(false)
  const [selectedTextBlockId, setSelectedTextBlockId] = useState(null)
  const [editingTextBlockId, setEditingTextBlockId] = useState(null)
  const [isUpdatingContent, setIsUpdatingContent] = useState(false)
  const isMounted = useClientMount()
  // Optimized current slide content state to prevent unnecessary re-renders
  const [currentSlideContent, setCurrentSlideContent] = useState(null)

  useEffect(() => {
    if (!isMounted) return
    
    if (!hasNickname()) {
      router.push('/')
      return
    }

    if (!presentationId) {
      router.push('/presentations')
      return
    }

    // Join the presentation and fetch initial data
    const initializePresentation = async () => {
      try {
        await joinPresentation(presentationId, nickname)
        await fetchSlides(presentationId)
        await fetchPresentationDetails(presentationId)
      } catch (error) {
        logError('Presentation Initialization', error)
        router.push('/presentations')
      }
    }

    initializePresentation()

    // Subscribe to real-time updates
    subscribeToSlideUpdates(presentationId)

    return () => {
      unsubscribeFromUserUpdates()
    }
  }, [isMounted, hasNickname, presentationId, nickname, router, joinPresentation, fetchSlides, subscribeToSlideUpdates, unsubscribeFromUserUpdates])

  // Memoized slides for rendering - only updates when slide structure changes
  const slidesForRendering = useMemo(() => {
    if (!Array.isArray(slides)) return []
    
    return slides.map(slide => ({
      id: slide.id,
      slide_number: slide.slide_number,
      created_at: slide.created_at
    }))
  }, [slides])

  // Sync current slide content with slides array
  useEffect(() => {
    if (!Array.isArray(slides) || slides.length === 0) {
      setCurrentSlideContent(null)
      return
    }
    const currentSlide = slides[currentSlideIndex] || null
    setCurrentSlideContent(currentSlide?.content_json || null)
  }, [slides, currentSlideIndex])

  // Get current slide safely
  const currentSlide = Array.isArray(slides) && slides.length > 0 ? slides[currentSlideIndex] || null : null
  const isCreator = isCurrentUserCreator(presentationId, nickname)

  // Memoized components to prevent unnecessary re-renders
  const memoizedPresentButton = useMemo(() => {
    if (!Array.isArray(slidesForRendering) || slidesForRendering.length === 0) return null
    return (
      <Button
        onClick={() => {
          const currentSlideNumber = currentSlide?.slide_number || 1
          router.push(`/presentation?id=${presentationId}&slide=${currentSlideNumber}`)
        }}
        className="hidden sm:flex relative overflow-hidden bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 hover:from-emerald-600 hover:via-green-600 hover:to-teal-600 text-white font-bold shadow-lg shadow-green-500/25 hover:shadow-xl hover:shadow-green-500/40 transform hover:scale-105 transition-all duration-300 border border-green-400/20 backdrop-blur-sm group"
        size="sm"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-transparent to-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
        <Play className="w-4 h-4 mr-2 relative z-10 drop-shadow-sm group-hover:scale-110 transition-transform duration-300" />
        <span className="relative z-10 tracking-wide drop-shadow-sm">Present</span>
      </Button>
    )
  }, [slidesForRendering.length, currentSlide?.slide_number, router, presentationId])

  const handleRoleChange = async (targetNickname, newRole) => {
    if (!isCreator) return
    
    setRoleChangeLoading(targetNickname)
    try {
      await updateUserRole(presentationId, targetNickname, newRole, nickname)
      // Only fetch users, don't reload slides
      await fetchPresentationUsers(presentationId)
    } catch (error) {
      logError('Role Update', error)
    } finally {
      setRoleChangeLoading(null)
    }
  }

  const handleLogout = () => {
    clearNickname()
    router.push('/')
  }

  const handleAddSlide = async () => {
    if (!isCreator || slideActionLoading) return
    
    setSlideActionLoading(true)
    try {
      await addSlide(presentationId, nickname)
    } catch (error) {
      logError('Add Slide', error)
    } finally {
      setSlideActionLoading(false)
    }
  }

  const handleRemoveSlide = async (slideId) => {
    if (!isCreator || slideActionLoading) return
    
    setSlideActionLoading(true)
    try {
      await removeSlide(presentationId, slideId, nickname)
      // Adjust current slide index if necessary
      const slidesLength = Array.isArray(slides) ? slides.length : 0
      if (currentSlideIndex >= slidesLength - 1) {
        setCurrentSlideIndex(Math.max(0, slidesLength - 2))
      }
    } catch (error) {
      logError('Remove Slide', error)
    } finally {
      setSlideActionLoading(false)
    }
  }

  const handleSlideSelect = (index) => {
    setCurrentSlideIndex(index)
    setSelectedTextBlockId(null)
    setEditingTextBlockId(null)
  }

  // Text Block Management Functions
  const getCurrentSlide = () => {
    if (!Array.isArray(slides) || slides.length === 0) return null
    return slides[currentSlideIndex]
  }
  
  const getTextBlocks = () => {
    if (!currentSlideContent?.textBlocks) return []
    return currentSlideContent.textBlocks
  }

  const generateTextBlockId = () => `textblock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  const handleSlideClick = useCallback(async (e) => {
    // Completely disable slide click for viewers
    if (!canEditSlides(presentationId, nickname) || editingTextBlockId) return
    
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    // Create new text block with proper positioning for 500x200 size
    // Center the text block around the click point, but ensure it stays within canvas bounds
    const textBlockWidth = 500
    const textBlockHeight = 200
    const canvasWidth = rect.width
    const canvasHeight = rect.height
    
    const newTextBlock = {
      id: generateTextBlockId(),
      content: '',
      position: { 
        x: Math.max(0, Math.min(x - textBlockWidth / 2, canvasWidth - textBlockWidth)), 
        y: Math.max(0, Math.min(y - textBlockHeight / 2, canvasHeight - textBlockHeight))
      },
      size: { width: textBlockWidth, height: textBlockHeight }
    }
    
    const currentSlide = getCurrentSlide()
    const currentTextBlocks = getTextBlocks()
    const updatedTextBlocks = [...currentTextBlocks, newTextBlock]
    
    const updatedContent = {
      ...currentSlideContent,
      textBlocks: updatedTextBlocks
    }
    
    // Optimistic update: immediately update current slide content only
    const previousContent = currentSlideContent
    setCurrentSlideContent(updatedContent)
    setSelectedTextBlockId(newTextBlock.id)
    setEditingTextBlockId(newTextBlock.id)
    
    try {
      await updateSlideContent(currentSlide.id, updatedContent, nickname, presentationId)
      // Note: slides array will be updated automatically via Supabase real-time subscription
    } catch (error) {
      logError('Text Block Creation', error)
      // Revert optimistic update on error
      setCurrentSlideContent(previousContent)
      setSelectedTextBlockId(null)
      setEditingTextBlockId(null)
    }
  }, [canEditSlides, editingTextBlockId, presentationId, nickname, currentSlideContent, currentSlideIndex])

  const handleTextBlockSelect = useCallback((textBlockId) => {
    // Disable text block selection for viewers
    if (!canEditSlides(presentationId, nickname)) return
    setSelectedTextBlockId(textBlockId)
    setEditingTextBlockId(null)
  }, [canEditSlides, presentationId, nickname])

  const handleTextBlockEdit = useCallback((textBlockId) => {
    // Disable text block editing for viewers
    if (!canEditSlides(presentationId, nickname)) return
    setEditingTextBlockId(textBlockId)
    setSelectedTextBlockId(textBlockId)
  }, [canEditSlides, presentationId, nickname])

  const handleTextBlockMove = useCallback(async (textBlockId, newPosition) => {
    if (!canEditSlides(presentationId, nickname)) return
    
    const currentSlide = getCurrentSlide()
    const currentTextBlocks = getTextBlocks()
    const updatedTextBlocks = currentTextBlocks.map(block =>
      block.id === textBlockId ? { ...block, position: newPosition } : block
    )
    
    const updatedContent = {
      ...currentSlideContent,
      textBlocks: updatedTextBlocks
    }
    
    // Optimistic update: immediately update current slide content only
    const previousContent = currentSlideContent
    setCurrentSlideContent(updatedContent)
    
    try {
      await updateSlideContent(currentSlide.id, updatedContent, nickname, presentationId)
      // Note: slides array will be updated automatically via Supabase real-time subscription
    } catch (error) {
      logError('Text Block Position Update', error)
      // Revert optimistic update on error
      setCurrentSlideContent(previousContent)
    }
  }, [canEditSlides, presentationId, nickname, currentSlideContent, currentSlideIndex])





  const handleTextBlockContentChange = useCallback(async (textBlockId, newContent) => {
    if (!canEditSlides(presentationId, nickname)) return
    
    setIsUpdatingContent(true)
    const currentSlide = getCurrentSlide()
    const currentTextBlocks = getTextBlocks()
    const updatedTextBlocks = currentTextBlocks.map(block =>
      block.id === textBlockId ? { ...block, content: newContent } : block
    )
    
    const updatedContent = {
      ...currentSlideContent,
      textBlocks: updatedTextBlocks
    }
    
    // Optimistic update: immediately update current slide content only
    const previousContent = currentSlideContent
    setCurrentSlideContent(updatedContent)
    
    try {
      await updateSlideContent(currentSlide.id, updatedContent, nickname, presentationId)
      // Note: slides array will be updated automatically via Supabase real-time subscription
    } catch (error) {
      logError('Text Block Content Update', error)
      // Revert optimistic update on error
      setCurrentSlideContent(previousContent)
    } finally {
      setIsUpdatingContent(false)
    }
  }, [canEditSlides, presentationId, nickname, currentSlideContent, currentSlideIndex])

  const handleStopEditing = useCallback(() => {
    setEditingTextBlockId(null)
  }, [])

  // Handle text block deletion
  const handleTextBlockDelete = useCallback(async (textBlockId) => {
    if (!canEditSlides(presentationId, nickname)) return
    
    const currentSlide = getCurrentSlide()
    const currentTextBlocks = getTextBlocks()
    const updatedTextBlocks = currentTextBlocks.filter(block => block.id !== textBlockId)
    
    const updatedContent = {
      ...currentSlideContent,
      textBlocks: updatedTextBlocks
    }
    
    // Clear selection immediately for better UX
    if (selectedTextBlockId === textBlockId) {
      setSelectedTextBlockId(null)
    }
    if (editingTextBlockId === textBlockId) {
      setEditingTextBlockId(null)
    }
    
    // Optimistic update: immediately update current slide content only
    const previousContent = currentSlideContent
    setCurrentSlideContent(updatedContent)
    
    try {
      await updateSlideContent(currentSlide.id, updatedContent, nickname, presentationId)
      // Note: slides array will be updated automatically via Supabase real-time subscription
    } catch (error) {
      logError('Text Block Deletion', error)
      // Revert optimistic update on error
      setCurrentSlideContent(previousContent)
    }
  }, [canEditSlides, presentationId, nickname, currentSlideContent, currentSlideIndex, selectedTextBlockId, editingTextBlockId])

  // Handle clicks outside text blocks
  const handleOutsideClick = useCallback(() => {
    // Only allow deselection for editors/creators
    if (!editingTextBlockId && canEditSlides(presentationId, nickname)) {
      setSelectedTextBlockId(null)
    }
  }, [editingTextBlockId, canEditSlides, presentationId, nickname])

  // Get canvas rect for boundary constraints
  const [canvasRect, setCanvasRect] = useState(null)
  
  useEffect(() => {
    const updateCanvasRect = () => {
      const canvasElement = document.querySelector('[data-slide-container="true"]')
      if (canvasElement) {
        setCanvasRect(canvasElement.getBoundingClientRect())
      }
    }
    
    updateCanvasRect()
    window.addEventListener('resize', updateCanvasRect)
    
    return () => window.removeEventListener('resize', updateCanvasRect)
  }, [currentSlideIndex])







  if (!isMounted || !hasNickname() || !presentationId) {
    return (
      <div className="h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 flex flex-col relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-400/20 to-cyan-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>
        
        <div className="relative h-16 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 flex items-center px-6 justify-between shadow-lg shadow-slate-200/50">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-indigo-500/5"></div>
          <div className="relative flex items-center space-x-4">
            <div className="w-6 h-6 bg-gradient-to-br from-slate-200 to-slate-300 animate-pulse rounded-lg shadow-sm"></div>
            <div className="w-24 h-5 bg-gradient-to-r from-slate-200 to-slate-300 animate-pulse rounded-lg shadow-sm"></div>
          </div>
          <div className="relative w-20 h-5 bg-gradient-to-r from-slate-200 to-slate-300 animate-pulse rounded-lg shadow-sm"></div>
        </div>
        <div className="relative flex-1 flex items-center justify-center">
          <div className="text-center relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-100/50 to-purple-100/50 rounded-full blur-3xl scale-150 opacity-60"></div>
            <div className="relative">
              <div className="relative mx-auto mb-6">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200"></div>
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent absolute inset-0"></div>
              </div>
              <p className="text-lg font-bold bg-gradient-to-r from-slate-700 via-blue-600 to-slate-700 bg-clip-text text-transparent tracking-wide">Loading slide editor...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }



  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 flex flex-col relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-400/20 to-cyan-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>
      
      {/* Top Toolbar */}
      <div className="relative h-16 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 flex items-center px-2 md:px-6 justify-between shadow-lg shadow-slate-200/50">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-indigo-500/5"></div>
        <div className="relative flex items-center space-x-4">
          <Button
            onClick={() => router.push('/presentations')}
            variant="ghost"
            size="icon"
            className="h-10 w-10 bg-gradient-to-br from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 border border-slate-300/60 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          >
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </Button>
          <div className="flex items-center min-w-0 flex-1 gap-2">
            {/* Mobile slide toggle icon */}
            <Button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              variant="ghost"
              size="icon"
              className="md:hidden h-8 w-8 flex-shrink-0 bg-gradient-to-br from-blue-100 to-blue-200 hover:from-blue-200 hover:to-blue-300 border border-blue-300/60 shadow-md hover:shadow-lg transition-all duration-300"
              title={isSidebarOpen ? "Hide Slides" : "Show Slides"}
            >
              <Menu className="w-4 h-4 text-blue-700" />
            </Button>
            
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-sm md:text-xl font-bold bg-gradient-to-r from-slate-800 via-blue-800 to-slate-800 bg-clip-text text-transparent truncate tracking-wide">
                  <span className="hover:from-blue-600 hover:via-purple-600 hover:to-indigo-600 transition-all duration-300 cursor-default">
                    {currentPresentation?.name || 'Slide Editor'}
                  </span>
                </h1>
                {/* Only show View Only badge when users are loaded and user is confirmed as viewer */}
                {users.length > 0 && !canEditSlides(presentationId, nickname) && (
                  <Badge variant="secondary" className="flex items-center gap-1 bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border-blue-300/60 shadow-lg shadow-blue-200/30 font-semibold">
                    <Eye className="w-3 h-3 drop-shadow-sm" />
                    <span className="text-xs font-bold tracking-wide">View Only</span>
                  </Badge>
                )}
              </div>
              {currentPresentation?.creator_nickname && (
                <p className="text-xs bg-gradient-to-r from-slate-600 to-slate-500 bg-clip-text text-transparent truncate hidden sm:block font-medium tracking-wide">
                  <span className="hover:from-blue-600 hover:to-purple-600 transition-all duration-300 cursor-default">
                    Created by {currentPresentation.creator_nickname}
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>
        
        <div className="relative flex items-center space-x-2">
          {/* Present Button - memoized to prevent re-renders */}
          {memoizedPresentButton}
          
          {/* Mobile toggle buttons */}
          <Button
            onClick={() => setIsUsersOpen(!isUsersOpen)}
            variant="ghost"
            size="icon"
            className="md:hidden h-10 w-10 bg-gradient-to-br from-purple-100 to-purple-200 hover:from-purple-200 hover:to-purple-300 border border-purple-300/60 shadow-md hover:shadow-lg transition-all duration-300"
          >
            <Users className="w-4 h-4 text-purple-700" />
          </Button>
          {/* Enhanced User Display with Logout */}
          <div className="hidden md:flex items-center space-x-3">
            <div className="flex items-center space-x-2 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-blue-200/60 rounded-xl px-4 py-2.5 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 backdrop-blur-sm">
              <div className="w-7 h-7 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30">
                <User className="w-3.5 h-3.5 text-white drop-shadow-sm" />
              </div>
              <span className="text-sm font-bold bg-gradient-to-r from-slate-700 to-slate-600 bg-clip-text text-transparent tracking-wide">{nickname}</span>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="h-10 bg-gradient-to-r from-red-50 via-pink-50 to-red-50 border-red-200/60 text-red-700 hover:from-red-100 hover:via-pink-100 hover:to-red-100 hover:border-red-300/80 hover:text-red-800 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 font-semibold tracking-wide"
            >
              <LogOut className="w-3.5 h-3.5 mr-1.5 drop-shadow-sm" />
              <span className="font-bold tracking-wide">Log Out</span>
            </Button>
          </div>
          
          {/* Mobile User Menu */}
          <div className="md:hidden">
            <Button
              onClick={handleLogout}
              variant="ghost"
              size="icon"
              className="h-10 w-10 bg-gradient-to-br from-red-100 to-red-200 hover:from-red-200 hover:to-red-300 border border-red-300/60 shadow-md hover:shadow-lg transition-all duration-300"
              title="Log Out"
            >
              <LogOut className="w-4 h-4 text-red-700" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative flex-1 flex overflow-hidden">
        {/* Left Slides Thumbnails Panel */}
        <div className={`${isSidebarOpen ? 'w-64' : 'w-0'} md:${isSidebarOpen ? 'w-64' : 'w-0'} bg-white/60 backdrop-blur-xl border-r border-slate-200/60 transition-all duration-300 overflow-hidden shadow-lg`}>
          <div className="absolute inset-0 bg-gradient-to-b from-blue-50/30 via-transparent to-purple-50/30"></div>
          <div className="relative h-full">
            <SlidesPanel
              slides={slidesForRendering}
              currentSlideIndex={currentSlideIndex}
              onSlideSelect={handleSlideSelect}
              onAddSlide={handleAddSlide}
              onRemoveSlide={handleRemoveSlide}
              isCreator={isCreator}
              isLoading={isLoading}
            />
          </div>
        </div>

        {/* Center Main Slide Canvas */}
        <div className="relative flex-1 bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/60 flex items-center justify-center p-2 md:p-6 overflow-hidden" onClick={handleOutsideClick}>
          {/* Animated background elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-blue-400/15 to-purple-400/15 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-tr from-indigo-400/15 to-cyan-400/15 rounded-full blur-3xl animate-pulse delay-1000"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-r from-emerald-400/10 to-teal-400/10 rounded-full blur-3xl animate-pulse delay-500"></div>
          </div>
          
          
          
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/30 to-transparent"></div>
          <Card className="relative w-full max-w-6xl h-[600px] overflow-hidden shadow-2xl shadow-slate-400/30 mx-2 md:mx-0 border-2 border-gray-400 bg-white/95 backdrop-blur-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-white/20 to-purple-50/30 pointer-events-none"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none"></div>
            <CardContent className="relative p-0 h-full">
              {currentSlide ? (
                canEditSlides(presentationId, nickname) ? (
                  <div 
                    className="w-full h-full relative cursor-pointer bg-gradient-to-br from-white via-slate-50/40 to-blue-50/30 text-sm md:text-base border border-white/80 rounded-xl shadow-inner"
                    onClick={handleSlideClick}
                    style={{ minHeight: '600px' }}
                    data-slide-container="true"
                  >
                    {/* Enhanced grid pattern with depth */}
                    <div className="absolute inset-0 opacity-25 pointer-events-none">
                      <div className="w-full h-full" style={{
                        backgroundImage: `
                          linear-gradient(rgba(59, 130, 246, 0.08) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(59, 130, 246, 0.08) 1px, transparent 1px),
                          linear-gradient(rgba(147, 51, 234, 0.04) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(147, 51, 234, 0.04) 1px, transparent 1px)
                        `,
                        backgroundSize: '20px 20px, 20px 20px, 60px 60px, 60px 60px'
                      }}></div>
                    </div>
                    
                    {/* Subtle corner highlights */}
                    <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-blue-100/40 to-transparent rounded-xl pointer-events-none"></div>
                    <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-purple-100/40 to-transparent rounded-xl pointer-events-none"></div>

                    {/* Loading Indicator */}
                    {isUpdatingContent && (
                      <Badge variant="secondary" className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border-blue-300/60 shadow-lg shadow-blue-200/30 font-semibold">
                        <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <Save className="w-3 h-3 drop-shadow-sm" />
                        <span className="font-bold tracking-wide">Saving...</span>
                      </Badge>
                    )}

                    {/* Text Blocks */}
                    {getTextBlocks().map((textBlock, index) => (
                      <TextBlock
                        key={textBlock.id}
                        id={textBlock.id}
                        content={textBlock.content}
                        position={textBlock.position}
                        size={textBlock.size}
                        isSelected={selectedTextBlockId === textBlock.id}
                        isEditing={editingTextBlockId === textBlock.id}
                        canEdit={canEditSlides(presentationId, nickname)}
                        onSelect={handleTextBlockSelect}
                        onEdit={handleTextBlockEdit}
                        onMove={handleTextBlockMove}
                        onContentChange={handleTextBlockContentChange}
                        onStopEditing={handleStopEditing}
                        onDelete={handleTextBlockDelete}
                        zIndex={100 + index}
                        canvasRect={canvasRect}
                        allTextBlocks={getTextBlocks()}
                      />
                    ))}

                    {/* Enhanced Empty State */}
                    {getTextBlocks().length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center relative">
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-100/50 to-purple-100/50 rounded-full blur-3xl scale-150 opacity-60"></div>
                          <div className="relative">
                            <MousePointer2 className="w-20 h-20 mx-auto mb-6 text-slate-400 drop-shadow-lg animate-pulse" />
                            <p className="text-xl mb-3 font-bold bg-gradient-to-r from-slate-700 via-blue-600 to-slate-700 bg-clip-text text-transparent tracking-wide">
                              {canEditSlides(presentationId, nickname) ? 'Click anywhere to add text' : 'No content yet'}
                            </p>
                            {canEditSlides(presentationId, nickname) && (
                              <p className="text-sm bg-gradient-to-r from-slate-500 to-slate-400 bg-clip-text text-transparent font-medium tracking-wide">
                                Click to create • Drag to move • Double-click to edit
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div 
                    className="w-full h-full relative cursor-default bg-gradient-to-br from-white via-slate-50/40 to-blue-50/30 text-sm md:text-base border border-white/80 rounded-xl shadow-inner"
                    style={{ minHeight: '600px' }}
                  >
                    {/* Enhanced grid pattern for read-only with subtle depth */}
                    <div className="absolute inset-0 opacity-15 pointer-events-none">
                      <div className="w-full h-full" style={{
                        backgroundImage: `
                          linear-gradient(rgba(59, 130, 246, 0.06) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(59, 130, 246, 0.06) 1px, transparent 1px),
                          linear-gradient(rgba(147, 51, 234, 0.03) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(147, 51, 234, 0.03) 1px, transparent 1px)
                        `,
                        backgroundSize: '20px 20px, 20px 20px, 60px 60px, 60px 60px'
                      }}></div>
                    </div>
                    
                    {/* Subtle corner highlights for read-only */}
                    <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-slate-100/30 to-transparent rounded-xl pointer-events-none"></div>
                    <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-slate-100/30 to-transparent rounded-xl pointer-events-none"></div>
                    
                    {/* Text Blocks - Read Only */}
                    {getTextBlocks().map((textBlock, index) => (
                      <TextBlock
                        key={textBlock.id}
                        id={textBlock.id}
                        content={textBlock.content}
                        position={textBlock.position}
                        size={textBlock.size}
                        isSelected={false}
                        isEditing={false}
                        canEdit={false}
                        onSelect={() => {}}
                        onEdit={() => {}}
                        onMove={() => {}}
                        onContentChange={() => {}}
                        onStopEditing={() => {}}
                        onDelete={() => {}}
                        zIndex={100 + index}
                        canvasRect={canvasRect}
                        allTextBlocks={getTextBlocks()}
                      />
                    ))}

                    {/* Enhanced Empty State for Viewers */}
                    {getTextBlocks().length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center relative">
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-100/40 to-purple-100/40 rounded-full blur-3xl scale-150 opacity-50"></div>
                          <div className="relative">
                            <Eye className="w-20 h-20 mx-auto mb-6 text-slate-400 drop-shadow-lg animate-pulse" />
                            <p className="text-xl mb-3 font-bold bg-gradient-to-r from-slate-700 via-blue-600 to-slate-700 bg-clip-text text-transparent tracking-wide">No content yet</p>
                            <p className="text-sm bg-gradient-to-r from-slate-500 to-slate-400 bg-clip-text text-transparent font-medium tracking-wide">You are viewing this presentation in read-only mode</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-white via-slate-50/30 to-blue-50/20 border border-slate-100/50 rounded-lg">
                  <div className="text-center relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-100/40 to-blue-100/40 rounded-full blur-3xl scale-150 opacity-50"></div>
                    <div className="relative">
                      <div className="w-20 h-20 mx-auto mb-6 rounded-xl bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center shadow-lg">
                        <div className="w-10 h-10 border-3 border-slate-400/40 rounded-lg shadow-inner"></div>
                      </div>
                      <p className="text-lg font-bold bg-gradient-to-r from-slate-700 via-blue-600 to-slate-700 bg-clip-text text-transparent tracking-wide">No slide selected</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Users Panel */}
        <div className="flex">
          {/* Toggle Button */}
          <div className="flex">
            <Button
              onClick={() => setIsUsersOpen(!isUsersOpen)}
              variant="ghost"
              size="icon"
              className="h-full w-8 bg-gradient-to-b from-slate-50 to-slate-100 hover:from-slate-100 hover:to-slate-200 border-l border-border rounded-none shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center"
              title={isUsersOpen ? "Hide Users" : "Show Users"}
            >
              {isUsersOpen ? (
                <EyeOff className="w-4 h-4 text-slate-600" />
              ) : (
                <Eye className="w-4 h-4 text-slate-600" />
              )}
            </Button>
          </div>
          <div className={`${isUsersOpen ? 'w-72 md:w-72' : 'w-0'} bg-background ${isUsersOpen ? 'border-l border-border' : ''} flex flex-col transition-all duration-300 overflow-hidden`}>
          <div className="relative p-3 md:p-5 border-b border-slate-200/60 bg-gradient-to-r from-slate-50 via-blue-50/30 to-slate-50 backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5"></div>
            <div className="relative flex items-center justify-between gap-2">
              <h2 className="text-sm md:text-lg font-bold text-slate-800 flex items-center gap-1.5 md:gap-3 min-w-0 flex-1">
                <div className="relative flex-shrink-0">
                  <Users className="w-4 h-4 md:w-6 md:h-6 text-blue-600 drop-shadow-sm" />
                  <div className="absolute -top-1 -right-1 w-1.5 h-1.5 md:w-2 md:h-2 bg-blue-500 rounded-full animate-pulse"></div>
                </div>
                <span className="bg-gradient-to-r from-slate-800 to-slate-700 bg-clip-text text-transparent tracking-wide truncate">
                  Users
                </span>
              </h2>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge variant="secondary" className="bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border-blue-300/60 shadow-lg shadow-blue-200/30 font-semibold px-2.5 md:px-3 py-1.5 md:py-1">
                  <span className="flex items-center gap-1.5 md:gap-1">
                    <div className="w-2 h-2 md:w-2 md:h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-sm md:text-sm font-bold">{users.length} online</span>
                  </span>
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 md:p-4 space-y-2 md:space-y-3">
            {users.length === 0 ? (
              <div className="text-center py-12">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 rounded-full blur-xl opacity-60"></div>
                  <Users className="relative w-12 h-12 mx-auto mb-4 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-600 mb-1">No users online</p>
                <p className="text-xs text-slate-400">Share the link to invite others</p>
              </div>
            ) : (
              users.map((user) => (
                <div key={user.id} className="group relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"></div>
                  <Card className="relative p-2 md:p-4 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-slate-200/60 hover:border-slate-300/80 bg-gradient-to-br from-white via-slate-50/30 to-white backdrop-blur-sm">
                    <div className="flex items-center space-x-2 md:space-x-4">
                      <div className="relative">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shadow-lg ${
                          user.role === 'creator' ? 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-500/30' :
                          user.role === 'editor' ? 'bg-gradient-to-br from-emerald-500 to-green-600 shadow-emerald-500/30' : 
                          'bg-gradient-to-br from-slate-500 to-slate-600 shadow-slate-500/30'
                        }`}>
                          <div className="w-2.5 h-2.5 bg-white rounded-full shadow-inner"></div>
                        </div>
                        <div className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full animate-pulse ${
                          user.role === 'creator' ? 'bg-blue-400' :
                          user.role === 'editor' ? 'bg-emerald-400' : 'bg-slate-400'
                        }`}></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="text-xs md:text-sm font-semibold text-slate-800 truncate group-hover:text-slate-900 transition-colors">{user.nickname}</p>
                          {user.nickname === nickname && (
                            <Badge variant="outline" className="text-xs bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border-blue-200/60 shadow-sm">
                              You
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          {isCreator && user.role !== 'creator' && user.nickname !== nickname ? (
                            <div className="flex items-center gap-1 md:gap-3">
                              <div className="relative flex flex-col md:flex-row bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl p-1 md:p-1.5 border border-slate-200/60 shadow-lg backdrop-blur-sm gap-1 md:gap-0">
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-50/30 to-purple-50/30 rounded-xl"></div>
                                <button
                                  onClick={() => handleRoleChange(user.nickname, 'viewer')}
                                  disabled={roleChangeLoading === user.nickname}
                                  className={`relative px-2 md:px-3 py-1 md:py-1.5 text-xs font-semibold rounded-lg transition-all duration-300 flex items-center justify-center gap-1 md:gap-1.5 transform hover:scale-105 ${
                                    user.role === 'viewer' 
                                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 border border-blue-400/50' 
                                      : 'text-slate-600 hover:text-slate-800 hover:bg-white/60 hover:shadow-md'
                                  }`}
                                >
                                  <Eye className={`w-3 h-3 md:w-3.5 md:h-3.5 ${user.role === 'viewer' ? 'drop-shadow-sm' : ''}`} />
                                  <span className="tracking-wide">Viewer</span>
                                </button>
                                <button
                                  onClick={() => handleRoleChange(user.nickname, 'editor')}
                                  disabled={roleChangeLoading === user.nickname}
                                  className={`relative px-2 md:px-3 py-1 md:py-1.5 text-xs font-semibold rounded-lg transition-all duration-300 flex items-center justify-center gap-1 md:gap-1.5 transform hover:scale-105 ${
                                    user.role === 'editor' 
                                      ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/25 border border-emerald-400/50' 
                                      : 'text-slate-600 hover:text-slate-800 hover:bg-white/60 hover:shadow-md'
                                  }`}
                                >
                                  <Grip className={`w-3 h-3 md:w-3.5 md:h-3.5 ${user.role === 'editor' ? 'drop-shadow-sm' : ''}`} />
                                  <span className="tracking-wide">Editor</span>
                                </button>
                              </div>
                              {roleChangeLoading === user.nickname && (
                                <div className="relative">
                                  <div className="w-4 h-4 border-2 border-gradient-to-r from-blue-500 to-purple-500 border-t-transparent rounded-full animate-spin shadow-lg"></div>
                                  <div className="absolute inset-0 w-4 h-4 border-2 border-blue-400/30 rounded-full animate-pulse"></div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <Badge 
                              variant="outline" 
                              className={`text-xs font-semibold shadow-sm backdrop-blur-sm px-1.5 md:px-2 py-0.5 ${
                                user.role === 'creator' ? 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-800 border-blue-300/60 shadow-blue-200/50' :
                                user.role === 'editor' ? 'bg-gradient-to-r from-emerald-50 to-green-100 text-emerald-800 border-emerald-300/60 shadow-emerald-200/50' :
                                'bg-gradient-to-r from-slate-50 to-slate-100 text-slate-700 border-slate-300/60 shadow-slate-200/50'
                              }`}
                            >
                              <span className="flex items-center gap-0.5 md:gap-1">
                                {user.role === 'creator' ? (
                                  <>
                                    <span className="text-yellow-500 text-xs">👑</span>
                                    <span className="tracking-wide hidden md:inline">Creator</span>
                                  </>
                                ) : user.role === 'editor' ? (
                                  <>
                                    <span className="text-emerald-600 text-xs">✏️</span>
                                    <span className="tracking-wide hidden md:inline">Editor</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="text-blue-600 text-xs">👁️</span>
                                    <span className="tracking-wide hidden md:inline">Viewer</span>
                                  </>
                                )}
                              </span>
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              ))
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}

export default function SlideEditor() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading slide editor...</p>
        </div>
      </div>
    }>
      <SlideEditorContent />
    </Suspense>
  )
}