'use client'

import React, { useState, useRef, useEffect } from 'react'
import { ForwardRefEditor } from './ForwardRefEditor'
import { type MDXEditorMethods } from '@mdxeditor/editor'
import '@mdxeditor/editor/style.css'

interface TextBlockProps {
  id: string
  content: string
  position: { x: number; y: number }
  size?: { width: number; height: number }
  isSelected: boolean
  isEditing: boolean
  canEdit: boolean
  onSelect: (id: string) => void
  onEdit: (id: string) => void
  onMove: (id: string, position: { x: number; y: number }) => void
  onContentChange: (id: string, content: string) => void
  onStopEditing: () => void
  onDelete: (id: string) => void
  zIndex: number
  canvasRect?: DOMRect
  allTextBlocks?: Array<{ id: string; position: { x: number; y: number }; size: { width: number; height: number } }>
}

export default function TextBlock({
  id,
  content,
  position,
  size = { width: 300, height: 200 },
  isSelected,
  isEditing,
  canEdit,
  onSelect,
  onEdit,
  onMove,
  onContentChange,
  onStopEditing,
  onDelete,
  zIndex,
  canvasRect,
  allTextBlocks = []
}: TextBlockProps) {
  const [localContent, setLocalContent] = useState(content)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [wouldOverlap, setWouldOverlap] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const blockRef = useRef<HTMLDivElement>(null)
  const mdxEditorRef = useRef<MDXEditorMethods>(null)

  // Check if a position/size would overlap with other text blocks
  const checkOverlap = (newPos: { x: number; y: number }, newSize: { width: number; height: number }) => {
    return allTextBlocks.some(block => {
      if (block.id === id) return false // Don't check against self
      
      const blockRight = block.position.x + block.size.width
      const blockBottom = block.position.y + block.size.height
      const newRight = newPos.x + newSize.width
      const newBottom = newPos.y + newSize.height
      
      // Check if rectangles overlap
      return !(newPos.x >= blockRight || 
               newRight <= block.position.x || 
               newPos.y >= blockBottom || 
               newBottom <= block.position.y)
    })
  }

  // Update local content when prop changes
  useEffect(() => {
    setLocalContent(content)
  }, [content])

  // Focus textarea when editing starts
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select()
    }
  }, [isEditing])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!canEdit || isEditing) return
    
    e.preventDefault()
    e.stopPropagation()
    
    setIsDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
    setDragOffset({ x: 0, y: 0 })
    onSelect(id)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      const deltaX = e.clientX - dragStart.x
      const deltaY = e.clientY - dragStart.y
      
      setDragOffset({ x: deltaX, y: deltaY })
      
      // Check for overlaps in real-time during dragging
      const newX = position.x + deltaX
      const newY = position.y + deltaY
      const overlap = checkOverlap({ x: newX, y: newY }, { width: size.width, height: size.height })
      setWouldOverlap(overlap)
    }
  }

  const handleMouseUp = (e: MouseEvent) => {
    if (isDragging) {
      setIsDragging(false)
      
      const deltaX = e.clientX - dragStart.x
      const deltaY = e.clientY - dragStart.y
      
      // Calculate new position with canvas boundary constraints
      let newX = position.x + deltaX
      let newY = position.y + deltaY
      
      // Allow partial dragging outside canvas boundaries
      // Only prevent completely dragging outside (keep at least 50px visible)
      const minVisibleArea = 50
      if (canvasRect) {
        newX = Math.max(-size.width + minVisibleArea, Math.min(newX, canvasRect.width - minVisibleArea))
        newY = Math.max(-size.height + minVisibleArea, Math.min(newY, canvasRect.height - minVisibleArea))
      } else {
        // Fallback constraints - allow some negative positioning
        newX = Math.max(-size.width + minVisibleArea, newX)
        newY = Math.max(-size.height + minVisibleArea, newY)
      }
      
      // Check for overlaps and prevent if necessary
      const wouldOverlap = checkOverlap({ x: newX, y: newY }, { width: size.width, height: size.height })
      
      // Only update if position actually changed and doesn't cause overlap
      if (!wouldOverlap && (newX !== position.x || newY !== position.y)) {
        onMove(id, { x: newX, y: newY })
      }
      
      setDragOffset({ x: 0, y: 0 })
      setWouldOverlap(false)
    }
  }

  // Add global mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      
      document.body.style.cursor = 'grabbing'
      document.body.style.userSelect = 'none'
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
    }
  }, [isDragging, dragStart, position, size, canvasRect])



  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (canEdit && !isEditing && !isDragging) {
      onSelect(id)
    }
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (canEdit && !isDragging) {
      onEdit(id)
    }
  }

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalContent(e.target.value)
  }

  const handleMDXContentChange = (markdown: string) => {
    setLocalContent(markdown)
  }

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation()
    // Get content from MDX editor if available, otherwise use local content
    const contentToSave = mdxEditorRef.current?.getMarkdown() || localContent
    onContentChange(id, contentToSave)
    onStopEditing()
  }

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation()
    setLocalContent(content) // Reset to original content
    onStopEditing()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault()
      // Get content from MDX editor if available, otherwise use local content
      const contentToSave = mdxEditorRef.current?.getMarkdown() || localContent
      onContentChange(id, contentToSave)
      onStopEditing()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setLocalContent(content) // Reset to original content
      // Reset MDX editor content as well
      if (mdxEditorRef.current) {
        mdxEditorRef.current.setMarkdown(content)
      }
      onStopEditing()
    }
  }

  return (
    <div
      ref={blockRef}
      style={{
        position: 'absolute',
        left: position.x + dragOffset.x,
        top: position.y + dragOffset.y,
        width: size.width,
        height: size.height,
        zIndex: isEditing ? 1000 : zIndex, // Higher z-index when editing for modals
      }}
      className={`
        bg-transparent
        ${wouldOverlap ? 'border-2 border-red-500 border-solid ring-4 ring-red-200 ring-opacity-50 bg-red-50/20' : ''}
        ${isDragging && !wouldOverlap ? 'opacity-70' : ''}
        ${isSelected && !isDragging && !wouldOverlap ? '' : ''}
        ${canEdit && !isEditing ? 'cursor-grab hover:cursor-grab' : 'cursor-default'}
        ${isDragging ? 'cursor-grabbing' : ''}
        transition-all duration-300 ease-out
        relative group
        rounded-lg
      `}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseDown={handleMouseDown}
    >

      {/* Delete Button */}
      {isSelected && !isEditing && canEdit && (
        <button
          className="absolute -top-3 -left-3 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-all duration-200 hover:scale-110 z-10"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(id)
          }}
        >
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path>
          </svg>
        </button>
      )}



      {/* Save/Cancel Buttons - Outside text block at top-right */}
      {isEditing && (
        <div className="absolute -top-12 -right-2 flex gap-2 z-[1002]">
          <button
            onClick={handleSave}
            className="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors duration-200 text-sm font-medium shadow-lg"
          >
            Save
          </button>
          <button
            onClick={handleCancel}
            className="px-3 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors duration-200 text-sm font-medium shadow-lg"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Content Area */}
      {isEditing ? (
        <div className="w-full h-full bg-transparent rounded-lg relative z-[1000]">
          <div className="w-full h-full rounded-lg overflow-visible relative z-[1001] mdx-editor">
            <ForwardRefEditor
              ref={mdxEditorRef}
              markdown={localContent}
              onChange={handleMDXContentChange}
              placeholder="Type your text here..."
              contentEditableClassName="prose prose-sm max-w-none p-3 min-h-full focus:outline-none text-gray-800"
            />
          </div>
        </div>
      ) : (
        <div className="w-full h-full p-3 flex items-start justify-start rounded-lg">
          {content ? (
            <div className="text-gray-800 whitespace-pre-wrap break-words leading-relaxed text-sm prose prose-sm max-w-none w-full">
              {/* Simple markdown rendering for display mode */}
              <div 
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{
                  __html: content
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.*?)\*/g, '<em>$1</em>')
                    .replace(/__(.*?)__/g, '<u>$1</u>')
                    .replace(/`(.*?)`/g, '<code>$1</code>')
                    .replace(/!\[(.*?)\]\((.*?)\)/g, '<img alt="$1" src="$2" style="max-width: 100%; height: auto;" />')
                    .replace(/\n/g, '<br>')
                }}
              />
            </div>
          ) : (
            <div className="text-gray-400 italic text-sm flex items-center justify-center w-full h-full text-center">
              Double-click to add text
            </div>
          )}
        </div>
      )}
    </div>
  )
}