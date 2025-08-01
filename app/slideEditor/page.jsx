'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import useAuthStore from '../../stores/authStore'
import usePresentationStore from '../../stores/presentationStore'
import TextBlock from '../../components/TextBlock'

function SlideEditorContent() {
  const { nickname, hasNickname } = useAuthStore()
  const { 
    slides, 
    users, 
    isLoading, 
    joinPresentation, 
    fetchSlides, 
    addSlide, 
    removeSlide, 
    updateSlideContent,
    updateUserRole,
    canEditSlides,
    subscribeToSlideUpdates,
    unsubscribeFromUserUpdates,
    isCurrentUserCreator,
    fetchPresentationUsers
  } = usePresentationStore()
  const router = useRouter()
  const searchParams = useSearchParams()
  const presentationId = searchParams.get('id')
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isUsersOpen, setIsUsersOpen] = useState(true)
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [roleChangeLoading, setRoleChangeLoading] = useState(null)
  const [slideActionLoading, setSlideActionLoading] = useState(false)
  const [selectedTextBlockId, setSelectedTextBlockId] = useState(null)
  const [editingTextBlockId, setEditingTextBlockId] = useState(null)
  const [isUpdatingContent, setIsUpdatingContent] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [activeSlideId, setActiveSlideId] = useState(null)

  // Setup drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

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

  const currentSlide = slides[currentSlideIndex] || null
  const isCreator = isCurrentUserCreator(presentationId, nickname)

  const handleRoleChange = async (targetNickname, newRole) => {
    if (!isCreator) return
    
    setRoleChangeLoading(targetNickname)
    try {
      await updateUserRole(presentationId, targetNickname, newRole, nickname)
    } catch (error) {
      console.error('Failed to update role:', error)
    } finally {
      setRoleChangeLoading(null)
    }
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
      if (currentSlideIndex >= slides.length - 1) {
        setCurrentSlideIndex(Math.max(0, slides.length - 2))
      }
    } catch (error) {
      console.error('Failed to remove slide:', error)
    } finally {
      setSlideActionLoading(false)
    }
  }

  // Text Block Management Functions
  const getCurrentSlide = () => slides[currentSlideIndex]
  
  const getTextBlocks = () => {
    const currentSlide = getCurrentSlide()
    if (!currentSlide?.content_json?.textBlocks) return []
    return currentSlide.content_json.textBlocks
  }

  const generateTextBlockId = () => `textblock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  const handleSlideClick = useCallback((e) => {
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
      ...currentSlide.content_json,
      textBlocks: updatedTextBlocks
    }
    
    updateSlideContent(currentSlide.id, updatedContent, nickname, presentationId)
    setSelectedTextBlockId(newTextBlock.id)
    setEditingTextBlockId(newTextBlock.id)
  }, [canEditSlides, editingTextBlockId, presentationId, currentSlideIndex, slides])

  const handleTextBlockSelect = useCallback((textBlockId) => {
    setSelectedTextBlockId(textBlockId)
    setEditingTextBlockId(null)
  }, [])

  const handleTextBlockEdit = useCallback((textBlockId) => {
    setEditingTextBlockId(textBlockId)
    setSelectedTextBlockId(textBlockId)
  }, [])

  const handleTextBlockMove = useCallback(async (textBlockId, newPosition) => {
    if (!canEditSlides(presentationId, nickname)) return
    
    const currentSlide = getCurrentSlide()
    const currentTextBlocks = getTextBlocks()
    const updatedTextBlocks = currentTextBlocks.map(block =>
      block.id === textBlockId ? { ...block, position: newPosition } : block
    )
    
    const updatedContent = {
      ...currentSlide.content_json,
      textBlocks: updatedTextBlocks
    }
    
    try {
      await updateSlideContent(currentSlide.id, updatedContent, nickname, presentationId)
    } catch (error) {
      console.error('Error updating text block position:', error)
    }
  }, [canEditSlides, presentationId, currentSlideIndex, slides])

  const handleTextBlockResize = useCallback(async (textBlockId, newSize) => {
    if (!canEditSlides(presentationId, nickname)) return
    
    const currentSlide = getCurrentSlide()
    const currentTextBlocks = getTextBlocks()
    const updatedTextBlocks = currentTextBlocks.map(block =>
      block.id === textBlockId ? { ...block, size: newSize } : block
    )
    
    const updatedContent = {
      ...currentSlide.content_json,
      textBlocks: updatedTextBlocks
    }
    
    try {
      await updateSlideContent(currentSlide.id, updatedContent, nickname, presentationId)
    } catch (error) {
      console.error('Error updating text block size:', error)
    }
  }, [canEditSlides, presentationId, currentSlideIndex, slides])

  const handleTextBlockContentChange = useCallback(async (textBlockId, newContent) => {
    if (!canEditSlides(presentationId, nickname)) return
    
    setIsUpdatingContent(true)
    const currentSlide = getCurrentSlide()
    const currentTextBlocks = getTextBlocks()
    const updatedTextBlocks = currentTextBlocks.map(block =>
      block.id === textBlockId ? { ...block, content: newContent } : block
    )
    
    const updatedContent = {
      ...currentSlide.content_json,
      textBlocks: updatedTextBlocks
    }
    
    try {
      await updateSlideContent(currentSlide.id, updatedContent, nickname, presentationId)
    } catch (error) {
      console.error('Error updating text block content:', error)
    } finally {
      setIsUpdatingContent(false)
    }
  }, [canEditSlides, presentationId, currentSlideIndex, slides])

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
      ...currentSlide.content_json,
      textBlocks: updatedTextBlocks
    }
    
    try {
      await updateSlideContent(currentSlide.id, updatedContent, nickname, presentationId)
      // Clear selection if the deleted block was selected
      if (selectedTextBlockId === textBlockId) {
        setSelectedTextBlockId(null)
      }
      if (editingTextBlockId === textBlockId) {
        setEditingTextBlockId(null)
      }
    } catch (error) {
      console.error('Error deleting text block:', error)
    }
  }, [canEditSlides, presentationId, nickname, currentSlideIndex, slides, selectedTextBlockId, editingTextBlockId])

  // Handle clicks outside text blocks
  const handleOutsideClick = useCallback(() => {
    if (!editingTextBlockId) {
      setSelectedTextBlockId(null)
    }
  }, [editingTextBlockId])

  // SortableSlide component
  const SortableSlide = ({ slide, index, isActive }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ 
       id: `slide-${slide.id}`,
       disabled: !isCreator
     })

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    }

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`relative cursor-pointer border-2 rounded-lg p-2 transition-all group ${
          currentSlideIndex === index
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-200 hover:border-gray-300'
        } ${isDragging ? 'z-50' : ''}`}
        {...attributes}
        {...listeners}
      >
        <div 
          onClick={() => setCurrentSlideIndex(index)}
          className="aspect-video bg-white rounded border border-gray-100 flex items-center justify-center"
        >
          <span className="text-xs text-gray-400">Slide {slide.slide_number}</span>
        </div>
        <div className="absolute top-1 left-1 bg-gray-800 text-white text-xs px-1 rounded">
          {slide.slide_number}
        </div>
        {isCreator && slides.length > 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleRemoveSlide(slide.id)
            }}
            disabled={slideActionLoading}
            className="absolute top-1 right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 disabled:opacity-50"
            title="Remove slide"
          >
            {slideActionLoading ? (
              <div className="w-2 h-2 border border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </button>
        )}
      </div>
    )
  }

  // Handle drag start
  const handleDragStart = useCallback((event) => {
    const { active } = event
    
    if (active.id.toString().startsWith('slide-')) {
      setActiveSlideId(active.id)
    }
  }, [])

  // Handle drag end for slides only (text blocks handle their own movement)
  const handleDragEnd = useCallback((event) => {
    const { active, over } = event
    
    setActiveSlideId(null)
    
    if (!active || !over) return
    
    const activeId = active.id.toString()
    const overId = over.id.toString()
    
    // Handle slide reordering
    if (activeId.startsWith('slide-') && overId.startsWith('slide-')) {
      if (activeId !== overId && isCreator) {
        const activeIndex = slides.findIndex(slide => `slide-${slide.id}` === activeId)
        const overIndex = slides.findIndex(slide => `slide-${slide.id}` === overId)
        
        if (activeIndex !== -1 && overIndex !== -1) {
          // Reorder slides logic would go here
          // For now, we'll just log the reorder action
          console.log(`Reordering slide from ${activeIndex} to ${overIndex}`)
        }
      }
    }
  }, [slides, isCreator])

  if (!isMounted || !hasNickname() || !presentationId) {
    return (
      <div className="h-screen bg-gray-100 flex flex-col">
        <div className="h-10 bg-white border-b border-gray-200 flex items-center px-4 justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-5 h-5 bg-gray-200 animate-pulse rounded"></div>
            <div className="w-20 h-4 bg-gray-200 animate-pulse rounded"></div>
          </div>
          <div className="w-16 h-4 bg-gray-200 animate-pulse rounded"></div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gray-100 flex flex-col">
      {/* Top Toolbar */}
      <div className="h-10 bg-white border-b border-gray-200 flex items-center px-4 justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push('/presentations')}
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 className="text-sm font-medium text-gray-900">Slide Editor</h1>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Mobile toggle buttons */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="md:hidden p-1 text-gray-600 hover:text-gray-900"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <button
            onClick={() => setIsUsersOpen(!isUsersOpen)}
            className="md:hidden p-1 text-gray-600 hover:text-gray-900"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          </button>
          <span className="text-xs text-gray-600">{nickname}</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Slides Thumbnails Panel */}
        <div className={`${isSidebarOpen ? 'w-48' : 'w-0'} md:w-48 bg-white border-r border-gray-200 flex flex-col transition-all duration-300 overflow-hidden`}>
          <div className="p-3 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-900">Slides</h2>
            {isCreator && (
              <button
                onClick={handleAddSlide}
                disabled={slideActionLoading}
                className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {slideActionLoading ? (
                  <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <div className="flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add
                  </div>
                )}
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : slides.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-xs text-gray-500">No slides yet</p>
                {isCreator && (
                  <button 
                    onClick={handleAddSlide}
                    disabled={slideActionLoading}
                    className="mt-2 text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {slideActionLoading ? 'Adding...' : 'Add First Slide'}
                  </button>
                )}
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <SortableContext 
                  items={slides.map(slide => `slide-${slide.id}`)}
                  strategy={verticalListSortingStrategy}
                >
                  {slides.map((slide, index) => (
                    <SortableSlide
                      key={slide.id}
                      slide={slide}
                      index={index}
                      isActive={activeSlideId === `slide-${slide.id}`}
                    />
                  ))}
                </SortableContext>
                <DragOverlay>
                  {activeSlideId ? (
                    <div className="relative cursor-pointer border-2 rounded-lg p-2 border-blue-500 bg-blue-50 opacity-90">
                      <div className="aspect-video bg-white rounded border border-gray-100 flex items-center justify-center">
                        <span className="text-xs text-gray-400">Dragging...</span>
                      </div>
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            )}
          </div>
        </div>

        {/* Center Main Slide Canvas */}
        <div className="flex-1 bg-gray-100 flex items-center justify-center p-4" onClick={handleOutsideClick}>
          <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl aspect-video relative overflow-hidden">
            {currentSlide ? (
              <div 
                className="w-full h-full relative cursor-pointer"
                onClick={handleSlideClick}
                style={{ minHeight: '400px' }}
              >
                {/* Slide Number Indicator */}
                <div className="absolute top-4 left-4 bg-gray-800 text-white text-sm px-2 py-1 rounded z-10">
                  Slide {currentSlide.slide_number}
                </div>

                {/* Loading Indicator */}
                {isUpdatingContent && (
                  <div className="absolute top-4 right-4 bg-blue-500 text-white text-xs px-2 py-1 rounded z-10 flex items-center">
                    <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin mr-1"></div>
                    Saving...
                  </div>
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
                    onResize={handleTextBlockResize}
                    onContentChange={handleTextBlockContentChange}
                    onStopEditing={handleStopEditing}
                    onDelete={handleTextBlockDelete}
                    zIndex={100 + index}
                  />
                ))}

                {/* Empty State */}
                {getTextBlocks().length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <p className="text-lg mb-2">
                        {canEditSlides(presentationId, nickname) ? 'Click anywhere to add text' : 'No content yet'}
                      </p>
                      {canEditSlides(presentationId, nickname) && (
                        <p className="text-sm">
                          Click to create • Drag to move • Double-click to edit • Right-click to delete
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p>No slide selected</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Users Panel */}
        <div className={`${isUsersOpen ? 'w-64' : 'w-0'} md:w-64 bg-white border-l border-gray-200 flex flex-col transition-all duration-300 overflow-hidden`}>
          <div className="p-3 border-b border-gray-200">
            <h2 className="text-sm font-medium text-gray-900">Collaborators</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {users.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-xs text-gray-500">No users online</p>
              </div>
            ) : (
              users.map((user) => (
                <div key={user.id} className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50">
                  <div className={`w-2 h-2 rounded-full ${
                    user.role === 'creator' ? 'bg-blue-500' :
                    user.role === 'editor' ? 'bg-green-500' : 'bg-gray-500'
                  }`}></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{user.nickname}</p>
                    <div className="flex items-center justify-between">
                      {isCreator && user.role !== 'creator' && user.nickname !== nickname ? (
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.nickname, e.target.value)}
                          disabled={roleChangeLoading === user.nickname}
                          className="text-xs bg-transparent border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:border-blue-500"
                        >
                          <option value="viewer">Viewer</option>
                          <option value="editor">Editor</option>
                        </select>
                      ) : (
                        <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                      )}
                      {roleChangeLoading === user.nickname && (
                        <div className="w-3 h-3 border border-gray-300 border-t-blue-500 rounded-full animate-spin ml-1"></div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SlideEditor() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading slide editor...</p>
        </div>
      </div>
    }>
      <SlideEditorContent />
    </Suspense>
  )
}