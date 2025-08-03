'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { useDraggable } from '@dnd-kit/core'

const TextBlock = ({
  id,
  content,
  position,
  size,
  isSelected,
  isEditing,
  canEdit,
  onSelect,
  onEdit,
  onMove,
  onContentChange,
  onStopEditing,
  onDelete,
  zIndex = 1
}) => {
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 })
  const [localContent, setLocalContent] = useState(content || '')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const textareaRef = useRef(null)

  // Set up draggable functionality - only when not editing
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: id,
    disabled: isEditing || !canEdit,
    data: {
      type: 'textblock',
      textBlockId: id,
    },
  })

  // Handle click events
  const handleClick = useCallback((e) => {
    if (isEditing) return
    e.stopPropagation()
    setShowContextMenu(false)
    onSelect(id)
  }, [id, isEditing, onSelect])

  const handleDoubleClick = useCallback((e) => {
    if (!canEdit || isEditing) return
    e.stopPropagation()
    onEdit(id)
  }, [id, canEdit, isEditing, onEdit])

  // Handle context menu
  const handleContextMenu = useCallback((e) => {
    if (!canEdit || isEditing) return
    e.preventDefault()
    e.stopPropagation()
    setContextMenuPosition({ x: e.clientX, y: e.clientY })
    setShowContextMenu(true)
    onSelect(id)
  }, [canEdit, isEditing, id, onSelect])

  // Handle content change (only update local state, don't save to database)
  const handleContentChange = useCallback((e) => {
    const value = e.target.value
    setLocalContent(value)
    setHasUnsavedChanges(value !== content)
    // Don't call onContentChange here - we'll save when editing stops
  }, [content])

  // Handle delete
  const handleDelete = useCallback(() => {
    if (canEdit && onDelete) {
      onDelete(id)
    }
    setShowContextMenu(false)
  }, [canEdit, onDelete, id])

  // Handle save (exit editing) - now saves the content to database
  const handleSave = useCallback(() => {
    // Save the current content to database before stopping edit
    if (hasUnsavedChanges && onContentChange) {
      onContentChange(id, localContent)
    }
    setHasUnsavedChanges(false)
    onEdit(null) // Stop editing
  }, [onEdit, onContentChange, id, localContent, hasUnsavedChanges])

  // Effect to save content when editing stops (e.g., when isEditing becomes false)
  useEffect(() => {
    if (!isEditing && hasUnsavedChanges && onContentChange) {
      onContentChange(id, localContent)
      setHasUnsavedChanges(false)
    }
  }, [isEditing, hasUnsavedChanges, onContentChange, id, localContent])

  // Update local content when prop content changes (for external updates)
  useEffect(() => {
    if (!isEditing) {
      setLocalContent(content || '')
      setHasUnsavedChanges(false)
    }
  }, [content, isEditing])


  // Close context menu on outside click
  const handleOutsideClick = useCallback(() => {
    setShowContextMenu(false)
  }, [])

  const finalStyle = {
    position: 'absolute',
    left: position.x,
    top: position.y,
    width: size.width,
    height: size.height,
    zIndex: isDragging ? 1000 : zIndex,
    transform: isDragging && transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : 'none',
    opacity: isDragging ? 0.8 : 1,
    border: isSelected ? '2px solid #3b82f6' : '1px solid #e5e7eb',
    borderRadius: '8px',
    backgroundColor: 'white',
    boxShadow: isSelected ? '0 4px 12px rgba(59, 130, 246, 0.15)' : '0 1px 3px rgba(0, 0, 0, 0.1)',
    transition: isDragging ? 'none' : 'all 0.2s ease',
    willChange: isDragging ? 'transform' : 'auto'
  }

  return (
    <>
      <div
        ref={(node) => {
          setNodeRef(node)
        }}
        className={`group focus:outline-none ${isDragging ? 'cursor-grabbing' : canEdit && !isEditing ? 'cursor-grab' : 'cursor-pointer'}`}
        style={finalStyle}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        tabIndex={0}
        {...(!isEditing && canEdit ? { ...attributes, ...listeners } : {})}
      >
        {isEditing ? (
          <div className="w-full h-full relative">
            {/* Editing toolbar */}
            <div className="absolute top-0 left-0 right-0 bg-gray-800 text-white text-xs px-2 py-1 rounded-t flex items-center justify-between z-10">
              <span className="flex items-center space-x-2">
                <span>Editing Text</span>
                {hasUnsavedChanges && (
                  <span className="text-yellow-300 text-xs">●</span>
                )}
              </span>
              <button
                onClick={handleSave}
                className={`text-xs transition-colors ${
                  hasUnsavedChanges 
                    ? 'text-yellow-300 hover:text-yellow-100' 
                    : 'text-white hover:text-gray-200'
                }`}
                title={hasUnsavedChanges ? "Save changes and exit (Esc)" : "Exit editing (Esc)"}
              >
                ✓ Done
              </button>
            </div>
            
            {/* Simple textarea editor */}
            <textarea
              value={localContent}
              onChange={handleContentChange}
              className="w-full h-full pt-8 p-4 border-0 focus:outline-none rounded-b-lg"
              placeholder="Enter your text here..."
              autoFocus
            />
          </div>
        ) : (
          <div className="w-full h-full p-4 overflow-auto">
            {localContent ? (
              <div className="whitespace-pre-wrap text-sm text-gray-800">
                {localContent}
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 italic text-center">
                <div>
                  <div className="text-2xl mb-2">📝</div>
                  <div className="text-sm">
                    {canEdit ? 'Right click to add text' : 'Empty text block'}
                  </div>
                  {canEdit && (
                    <div className="text-xs mt-1 text-gray-500">
                      Right-click for options
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Selection indicators */}
        {isSelected && !isEditing && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Corner indicators */}
            <div className="absolute -top-2 -left-2 w-4 h-4 bg-blue-500 border-2 border-white rounded-full shadow-md" />
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-blue-500 border-2 border-white rounded-full shadow-md" />
            <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-blue-500 border-2 border-white rounded-full shadow-md" />
            <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-blue-500 border-2 border-white rounded-full shadow-md" />

            
          </div>
        )}
      </div>

      {/* Context Menu */}
      {showContextMenu && canEdit && (
        <>
          <div
            className="fixed inset-0 z-[9998]"
            onClick={handleOutsideClick}
          />
          <div
            className="fixed bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-[9999]"
            style={{
              left: contextMenuPosition.x,
              top: contextMenuPosition.y
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEdit(id)
                setShowContextMenu(false)
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>Edit Text</span>
              
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleDelete()
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-red-50 text-red-600 flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Delete</span>
              
            </button>
          </div>
        </>
      )}
    </>
  )
}

export default TextBlock