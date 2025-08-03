'use client'

import React, { useEffect, useState, useCallback, Suspense, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
import { DndContext, useDroppable } from '@dnd-kit/core'
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
  const [isMounted, setIsMounted] = useState(false)
  // Optimized current slide content state to prevent unnecessary re-renders
  const [currentSlideContent, setCurrentSlideContent] = useState(null)

  useEffect(() => {
    setIsMounted(true)
  }, [])

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
        console.error('Error initializing presentation:', error)
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
        className="hidden sm:flex bg-green-600 hover:bg-green-700 text-white font-bold"
        size="sm"
      >
        <Play className="w-4 h-4 mr-2" />
        Present
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
      console.error('Failed to update role:', error)
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
      console.error('Failed to add slide:', error)
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
      console.error('Failed to remove slide:', error)
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
    
    // Create new text block
    const newTextBlock = {
      id: generateTextBlockId(),
      content: '',
      position: { x: Math.max(0, x - 100), y: Math.max(0, y - 25) },
      size: { width: 200, height: 100 }
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
      console.error('Error creating text block:', error)
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
      console.error('Error updating text block position:', error)
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
      console.error('Error updating text block content:', error)
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
      console.error('Error deleting text block:', error)
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

  // Handle drag end for text blocks
  const handleDragEnd = useCallback((event) => {
    const { active, delta } = event
    
    if (!active || !delta || !canEditSlides(presentationId, nickname)) {
      return
    }

    const textBlockId = active.id
    const textBlocks = getTextBlocks()
    const textBlock = textBlocks.find(tb => tb.id === textBlockId)
    
    if (!textBlock) {
      return
    }

    // Calculate new position based on delta
    const newPosition = {
      x: Math.max(0, textBlock.position.x + delta.x),
      y: Math.max(0, textBlock.position.y + delta.y)
    }

    // Update the text block position
    handleTextBlockMove(textBlockId, newPosition)
  }, [canEditSlides, presentationId, nickname, getTextBlocks, handleTextBlockMove])

  // Droppable slide canvas component
  const DroppableSlideCanvas = ({ children, ...props }) => {
    const { setNodeRef } = useDroppable({
      id: 'slide-canvas'
    })
    
    return (
      <div ref={setNodeRef} {...props}>
        {children}
      </div>
    )
  }







  if (!isMounted || !hasNickname() || !presentationId) {
    return (
      <div className="h-screen bg-background flex flex-col">
        <div className="h-14 bg-background border-b border-border flex items-center px-6 justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-5 h-5 bg-muted animate-pulse rounded"></div>
            <div className="w-20 h-4 bg-muted animate-pulse rounded"></div>
          </div>
          <div className="w-16 h-4 bg-muted animate-pulse rounded"></div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    )
  }



  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Top Toolbar */}
      <div className="h-14 bg-background border-b border-border flex items-center px-2 md:px-6 justify-between">
        <div className="flex items-center space-x-4">
          <Button
            onClick={() => router.push('/presentations')}
            variant="ghost"
            size="icon"
            className="h-8 w-8"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center min-w-0 flex-1 gap-2">
            {/* Mobile slide toggle icon */}
            <Button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              variant="ghost"
              size="icon"
              className="md:hidden h-6 w-6 flex-shrink-0"
              title={isSidebarOpen ? "Hide Slides" : "Show Slides"}
            >
              <Menu className="w-4 h-4" />
            </Button>
            
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-sm md:text-lg font-semibold text-foreground truncate">
                  {currentPresentation?.name || 'Slide Editor'}
                </h1>
                {/* Only show View Only badge when users are loaded and user is confirmed as viewer */}
                {users.length > 0 && !canEditSlides(presentationId, nickname) && (
                  <Badge variant="secondary" className="flex items-center gap-1 bg-blue-100 text-blue-800 border-blue-200">
                    <Eye className="w-3 h-3" />
                    <span className="text-xs font-medium">View Only</span>
                  </Badge>
                )}
              </div>
              {currentPresentation?.creator_nickname && (
                <p className="text-xs text-muted-foreground truncate hidden sm:block">
                  Created by {currentPresentation.creator_nickname}
                </p>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Present Button - memoized to prevent re-renders */}
          {memoizedPresentButton}
          
          {/* Mobile toggle buttons */}
          <Button
            onClick={() => setIsUsersOpen(!isUsersOpen)}
            variant="ghost"
            size="icon"
            className="md:hidden h-8 w-8"
          >
            <Users className="w-4 h-4" />
          </Button>
          {/* Fancy User Display with Logout */}
          <div className="hidden md:flex items-center space-x-3">
            <div className="flex items-center space-x-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg px-3 py-2 shadow-sm hover:shadow-md transition-all duration-200">
              <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-sm">
                <User className="w-3 h-3 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-700">{nickname}</span>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="h-8 bg-gradient-to-r from-red-50 to-pink-50 border-red-200 text-red-700 hover:from-red-100 hover:to-pink-100 hover:border-red-300 hover:text-red-800 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <LogOut className="w-3 h-3 mr-1" />
              Log Out
            </Button>
          </div>
          
          {/* Mobile User Menu */}
          <div className="md:hidden">
            <Button
              onClick={handleLogout}
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title="Log Out"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Slides Thumbnails Panel */}
        <div className={`${isSidebarOpen ? 'w-64' : 'w-0'} md:${isSidebarOpen ? 'w-64' : 'w-0'} bg-background border-r border-border transition-all duration-300 overflow-hidden`}>
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

        {/* Center Main Slide Canvas */}
        <div className="flex-1 bg-muted/30 flex items-center justify-center p-2 md:p-6" onClick={handleOutsideClick}>
          <Card className="w-full max-w-4xl aspect-video relative overflow-hidden shadow-xl mx-2 md:mx-0">
            <CardContent className="p-0 h-full">
              {currentSlide ? (
                canEditSlides(presentationId, nickname) ? (
                  <DndContext onDragEnd={handleDragEnd}>
                    <DroppableSlideCanvas 
                      className="w-full h-full relative cursor-pointer bg-background text-sm md:text-base"
                      onClick={handleSlideClick}
                      style={{ minHeight: '300px' }}
                      data-slide-container="true"
                    >

                      {/* Loading Indicator */}
                      {isUpdatingContent && (
                        <Badge variant="secondary" className="absolute top-4 right-4 z-10 flex items-center gap-2">
                          <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div>
                          <Save className="w-3 h-3" />
                          Saving...
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
                        />
                      ))}

                      {/* Empty State */}
                      {getTextBlocks().length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                          <div className="text-center">
                            <MousePointer2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                            <p className="text-lg mb-2 font-medium">
                              {canEditSlides(presentationId, nickname) ? 'Click anywhere to add text' : 'No content yet'}
                            </p>
                            {canEditSlides(presentationId, nickname) && (
                              <p className="text-sm text-muted-foreground/70">
                                Click to create • Drag to move • Double-click to edit • Right-click to delete
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </DroppableSlideCanvas>
                  </DndContext>
                ) : (
                  <div 
                    className="w-full h-full relative cursor-default bg-background text-sm md:text-base"
                    style={{ minHeight: '300px' }}
                  >
                    
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
                      />
                    ))}

                    {/* Empty State for Viewers */}
                    {getTextBlocks().length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <Eye className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                          <p className="text-lg mb-2 font-medium">No content yet</p>
                          <p className="text-sm text-muted-foreground/70">You are viewing this presentation in read-only mode</p>
                        </div>
                      </div>
                    )}
                  </div>
                )
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-background">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-muted flex items-center justify-center">
                      <div className="w-8 h-8 border-2 border-muted-foreground/20 rounded"></div>
                    </div>
                    <p className="font-medium">No slide selected</p>
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