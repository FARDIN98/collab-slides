'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { 
  ArrowLeft, 
  Plus, 
  X, 
  Play, 
  Menu, 
  Users, 
  User,
  Eye,
  Save,
  MousePointer2,
  Grip
} from 'lucide-react'
import useAuthStore from '../../stores/authStore'
import usePresentationStore from '../../stores/presentationStore'
import TextBlock from '../../components/TextBlock'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'

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
      ...currentSlide.content_json,
      textBlocks: updatedTextBlocks
    }
    
    updateSlideContent(currentSlide.id, updatedContent, nickname, presentationId)
    setSelectedTextBlockId(newTextBlock.id)
    setEditingTextBlockId(newTextBlock.id)
  }, [canEditSlides, editingTextBlockId, presentationId, currentSlideIndex, slides])

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
    // Only allow deselection for editors/creators
    if (!editingTextBlockId && canEditSlides(presentationId, nickname)) {
      setSelectedTextBlockId(null)
    }
  }, [editingTextBlockId, canEditSlides, presentationId, nickname])

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
      <Card
        ref={setNodeRef}
        style={style}
        className={`relative cursor-pointer transition-all group ${
          currentSlideIndex === index
            ? 'ring-2 ring-primary bg-primary/5'
            : 'hover:ring-1 hover:ring-border'
        } ${isDragging ? 'z-50' : ''}`}
        {...attributes}
        {...listeners}
      >
        <CardContent className="p-3">
          <div 
            onClick={() => setCurrentSlideIndex(index)}
            className="aspect-video bg-background rounded border border-border flex items-center justify-center relative overflow-hidden"
          >
            <span className="text-xs text-muted-foreground">Slide {slide.slide_number}</span>
            {isCreator && (
              <Grip className="absolute top-1 left-1 w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </div>
          {isCreator && slides.length > 1 && (
              <Button
                onClick={(e) => {
                  e.stopPropagation()
                  handleRemoveSlide(slide.id)
                }}
                disabled={slideActionLoading}
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity bg-red-600 hover:bg-red-600 text-white font-bold rounded-full border-2 border-red-500"
              >
                {slideActionLoading ? (
                  <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <X className="w-3 h-3 font-bold" />
                )}
              </Button>
            )}
        </CardContent>
      </Card>
    )
  }

  // Handle drag start
  const handleDragStart = useCallback((event) => {
    // Disable drag for viewers
    if (!canEditSlides(presentationId, nickname)) return
    
    const { active } = event
    
    if (active.id.toString().startsWith('slide-')) {
      setActiveSlideId(active.id)
    } else if (active.id.toString().startsWith('textblock-')) {
      // Handle text block drag start
      setSelectedTextBlockId(active.data.current?.textBlockId || null)
    }
  }, [canEditSlides, presentationId, nickname])

  // Handle drag end for both slides and text blocks
  const handleDragEnd = useCallback((event) => {
    const { active, over, delta } = event
    
    setActiveSlideId(null)
    
    // Disable drag for viewers
    if (!canEditSlides(presentationId, nickname) || !active) return
    
    const activeId = active.id.toString()
    
    // Handle slide reordering
    if (activeId.startsWith('slide-') && over) {
      const overId = over.id.toString()
      if (overId.startsWith('slide-') && activeId !== overId && isCreator) {
        const activeIndex = slides.findIndex(slide => `slide-${slide.id}` === activeId)
        const overIndex = slides.findIndex(slide => `slide-${slide.id}` === overId)
        
        if (activeIndex !== -1 && overIndex !== -1) {
          // Reorder slides logic would go here
          // For now, we'll just log the reorder action
          console.log(`Reordering slide from ${activeIndex} to ${overIndex}`)
        }
      }
    }
    
    // Handle text block movement
    if (activeId.startsWith('textblock-') && delta) {
      const textBlockId = active.data.current?.textBlockId
      
      if (textBlockId) {
        // Find the current text block to get its current position
        const currentTextBlock = getTextBlocks().find(tb => tb.id === textBlockId)
        
        if (currentTextBlock) {
          // Get the slide container to calculate relative position
          const slideContainer = document.querySelector('.bg-background.rounded-lg.shadow-lg.w-full.max-w-4xl.aspect-video')
          
          if (slideContainer) {
            const slideRect = slideContainer.getBoundingClientRect()
            
            // Calculate the actual drop position relative to the slide
            // We need to get the final position where the element was dropped
            const finalX = currentTextBlock.position.x + delta.x
            const finalY = currentTextBlock.position.y + delta.y
            
            // Apply boundary constraints using actual text block size
            const maxX = slideRect.width - currentTextBlock.size.width
            const maxY = slideRect.height - currentTextBlock.size.height
            
            const newPosition = {
              x: Math.max(0, Math.min(finalX, maxX)),
              y: Math.max(0, Math.min(finalY, maxY))
            }
            
            // Call the existing handleTextBlockMove function
            handleTextBlockMove(textBlockId, newPosition)
          }
        }
      }
    }
  }, [slides, isCreator, handleTextBlockMove, canEditSlides, presentationId, nickname])

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
      <div className="h-14 bg-background border-b border-border flex items-center px-6 justify-between">
        <div className="flex items-center space-x-4">
          <Button
            onClick={() => router.push('/presentations')}
            variant="ghost"
            size="icon"
            className="h-8 w-8"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-lg font-semibold text-foreground">Slide Editor</h1>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Present Button */}
          {slides.length > 0 && (
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
          )}
          
          {/* Mobile toggle buttons */}
          <Button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            variant="ghost"
            size="icon"
            className="md:hidden h-8 w-8"
          >
            <Menu className="w-4 h-4" />
          </Button>
          <Button
            onClick={() => setIsUsersOpen(!isUsersOpen)}
            variant="ghost"
            size="icon"
            className="md:hidden h-8 w-8"
          >
            <Users className="w-4 h-4" />
          </Button>
          <Badge variant="outline" className="text-xs bg-slate-100 border-slate-300 text-slate-700 font-medium px-3 py-1">
            <User className="w-3 h-3 mr-1" />
            {nickname}
          </Badge>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Slides Thumbnails Panel */}
        <div className={`${isSidebarOpen ? 'w-64' : 'w-0'} md:w-64 bg-background border-r border-border flex flex-col transition-all duration-300 overflow-hidden`}>
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground">Slides</h2>
            {isCreator && (
               <Button
                 onClick={handleAddSlide}
                 disabled={slideActionLoading}
                 size="sm"
                 className="h-8 bg-blue-600 hover:bg-blue-700 text-white font-bold"
               >
                 {slideActionLoading ? (
                   <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin"></div>
                 ) : (
                   <>
                     <Plus className="w-4 h-4 mr-1" />
                     Add
                   </>
                 )}
               </Button>
             )}
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : slides.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground mb-3">No slides yet</p>
                {isCreator && (
                   <Button 
                     onClick={handleAddSlide}
                     disabled={slideActionLoading}
                     size="sm"
                     className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                   >
                     {slideActionLoading ? 'Adding...' : 'Add First Slide'}
                   </Button>
                 )}
              </div>
            ) : isCreator ? (
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
                    <Card className="relative cursor-pointer ring-2 ring-primary bg-primary/5 opacity-90">
                      <CardContent className="p-3">
                        <div className="aspect-video bg-background rounded border border-border flex items-center justify-center">
                          <span className="text-xs text-muted-foreground">Dragging...</span>
                        </div>
                      </CardContent>
                    </Card>
                  ) : null}
                </DragOverlay>
              </DndContext>
            ) : (
              // Non-draggable slides for viewers and editors
              slides.map((slide, index) => (
                <Card
                  key={slide.id}
                  className={`relative cursor-pointer transition-all ${
                    currentSlideIndex === index
                      ? 'ring-2 ring-primary bg-primary/5'
                      : 'hover:ring-1 hover:ring-border'
                  }`}
                  onClick={() => setCurrentSlideIndex(index)}
                >
                  <CardContent className="p-3">
                    <div className="aspect-video bg-background rounded border border-border flex items-center justify-center">
                      <span className="text-xs text-muted-foreground">Slide {slide.slide_number}</span>
                    </div>
                    <Badge 
                      variant="secondary" 
                      className="absolute -top-2 -left-2 text-xs px-1.5 py-0.5"
                    >
                      {slide.slide_number}
                    </Badge>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Center Main Slide Canvas */}
        <div className="flex-1 bg-muted/30 flex items-center justify-center p-6" onClick={handleOutsideClick}>
          <Card className="w-full max-w-4xl aspect-video relative overflow-hidden shadow-xl">
            <CardContent className="p-0 h-full">
              {currentSlide ? (
                canEditSlides(presentationId, nickname) ? (
                  <DndContext
                    sensors={sensors}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                  >
                    <div 
                      className="w-full h-full relative cursor-pointer bg-background"
                      onClick={handleSlideClick}
                      style={{ minHeight: '400px' }}
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
                          onResize={handleTextBlockResize}
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
                    </div>
                  </DndContext>
                ) : (
                  <div 
                    className="w-full h-full relative cursor-default bg-background"
                    style={{ minHeight: '400px' }}
                  >
                    {/* Slide Number Indicator */}
                    <Badge className="absolute top-4 left-4 z-10">
                      Slide {currentSlide.slide_number}
                    </Badge>

                    {/* Viewer Mode Indicator */}
                    <Badge variant="secondary" className="absolute top-4 right-4 z-10 flex items-center gap-2">
                      <Eye className="w-3 h-3" />
                      View Only
                    </Badge>

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
                        onResize={() => {}}
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
        <div className={`${isUsersOpen ? 'w-72' : 'w-0'} md:w-72 bg-background border-l border-border flex flex-col transition-all duration-300 overflow-hidden`}>
          <div className="relative p-5 border-b border-slate-200/60 bg-gradient-to-r from-slate-50 via-blue-50/30 to-slate-50 backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5"></div>
            <div className="relative flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-3">
                <div className="relative">
                  <Users className="w-6 h-6 text-blue-600 drop-shadow-sm" />
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                </div>
                <span className="bg-gradient-to-r from-slate-800 to-slate-700 bg-clip-text text-transparent tracking-wide">
                  Collaborators
                </span>
              </h2>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border-blue-300/60 shadow-lg shadow-blue-200/30 font-semibold px-3 py-1">
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    {users.length} online
                  </span>
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {users.length === 0 ? (
              <div className="text-center py-12">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 rounded-full blur-xl opacity-60"></div>
                  <Users className="relative w-12 h-12 mx-auto mb-4 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-600 mb-1">No collaborators online</p>
                <p className="text-xs text-slate-400">Share the link to invite others</p>
              </div>
            ) : (
              users.map((user) => (
                <div key={user.id} className="group relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"></div>
                  <Card className="relative p-4 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-slate-200/60 hover:border-slate-300/80 bg-gradient-to-br from-white via-slate-50/30 to-white backdrop-blur-sm">
                    <div className="flex items-center space-x-4">
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
                          <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-slate-900 transition-colors">{user.nickname}</p>
                          {user.nickname === nickname && (
                            <Badge variant="outline" className="text-xs bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border-blue-200/60 shadow-sm">
                              You
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          {isCreator && user.role !== 'creator' && user.nickname !== nickname ? (
                            <div className="flex items-center gap-3">
                              <div className="relative flex bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl p-1.5 border border-slate-200/60 shadow-lg backdrop-blur-sm">
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-50/30 to-purple-50/30 rounded-xl"></div>
                                <button
                                  onClick={() => handleRoleChange(user.nickname, 'viewer')}
                                  disabled={roleChangeLoading === user.nickname}
                                  className={`relative px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-300 flex items-center gap-1.5 transform hover:scale-105 ${
                                    user.role === 'viewer' 
                                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 border border-blue-400/50' 
                                      : 'text-slate-600 hover:text-slate-800 hover:bg-white/60 hover:shadow-md'
                                  }`}
                                >
                                  <Eye className={`w-3.5 h-3.5 ${user.role === 'viewer' ? 'drop-shadow-sm' : ''}`} />
                                  <span className="tracking-wide">Viewer</span>
                                </button>
                                <button
                                  onClick={() => handleRoleChange(user.nickname, 'editor')}
                                  disabled={roleChangeLoading === user.nickname}
                                  className={`relative px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-300 flex items-center gap-1.5 transform hover:scale-105 ${
                                    user.role === 'editor' 
                                      ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/25 border border-emerald-400/50' 
                                      : 'text-slate-600 hover:text-slate-800 hover:bg-white/60 hover:shadow-md'
                                  }`}
                                >
                                  <Grip className={`w-3.5 h-3.5 ${user.role === 'editor' ? 'drop-shadow-sm' : ''}`} />
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
                              className={`text-xs font-semibold shadow-sm backdrop-blur-sm ${
                                user.role === 'creator' ? 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-800 border-blue-300/60 shadow-blue-200/50' :
                                user.role === 'editor' ? 'bg-gradient-to-r from-emerald-50 to-green-100 text-emerald-800 border-emerald-300/60 shadow-emerald-200/50' :
                                'bg-gradient-to-r from-slate-50 to-slate-100 text-slate-700 border-slate-300/60 shadow-slate-200/50'
                              }`}
                            >
                              <span className="flex items-center gap-1">
                                {user.role === 'creator' ? (
                                  <>
                                    <span className="text-yellow-500">👑</span>
                                    <span className="tracking-wide">Creator</span>
                                  </>
                                ) : user.role === 'editor' ? (
                                  <>
                                    <span className="text-emerald-600">✏️</span>
                                    <span className="tracking-wide">Editor</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="text-blue-600">👁️</span>
                                    <span className="tracking-wide">Viewer</span>
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