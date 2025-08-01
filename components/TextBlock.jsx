'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { Resizable } from 'react-resizable'
import dynamic from 'next/dynamic'

// Dynamically import MDXEditor to avoid SSR issues
const MDXEditor = dynamic(
  () => import('@mdxeditor/editor').then((mod) => mod.MDXEditor),
  { 
    ssr: false,
    loading: () => <div className="animate-pulse bg-gray-200 h-full rounded"></div>
  }
)

// Import plugins function to avoid key prop issues
const loadEditorPlugins = async () => {
  const mod = await import('@mdxeditor/editor')
  return {
    headingsPlugin: mod.headingsPlugin,
    listsPlugin: mod.listsPlugin,
    quotePlugin: mod.quotePlugin,
    thematicBreakPlugin: mod.thematicBreakPlugin,
    markdownShortcutPlugin: mod.markdownShortcutPlugin,
    linkPlugin: mod.linkPlugin,
    linkDialogPlugin: mod.linkDialogPlugin,
    imagePlugin: mod.imagePlugin,
    tablePlugin: mod.tablePlugin,
    codeBlockPlugin: mod.codeBlockPlugin,
    toolbarPlugin: mod.toolbarPlugin,
    UndoRedo: mod.UndoRedo,
    BoldItalicUnderlineToggles: mod.BoldItalicUnderlineToggles,
    CreateLink: mod.CreateLink,
    InsertImage: mod.InsertImage,
    InsertTable: mod.InsertTable,
    InsertThematicBreak: mod.InsertThematicBreak,
    ListsToggle: mod.ListsToggle,
    Separator: mod.Separator
  }
}

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
  onResize,
  onContentChange,
  onStopEditing,
  onDelete,
  zIndex
}) => {
  const [isResizing, setIsResizing] = useState(false)
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 })
  const [editorPlugins, setEditorPlugins] = useState(null)
  const [isDragDisabled, setIsDragDisabled] = useState(false)
  const nodeRef = useRef(null)
  const editorRef = useRef(null)
  const dragStartPosition = useRef(null)

  // Load editor plugins
  useEffect(() => {
    const loadPlugins = async () => {
      try {
        const plugins = await loadEditorPlugins()
        setEditorPlugins(plugins)
      } catch (error) {
        console.error('Failed to load editor plugins:', error)
      }
    }
    loadPlugins()
  }, [])

  // Use dnd-kit for dragging with better control
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging
  } = useDraggable({
    id: `textblock-${id}`,
    disabled: !canEdit || isEditing || isResizing || isDragDisabled
  })

  // Improved drag handling with debouncing
  const handleDragEnd = useCallback(() => {
    if (transform && dragStartPosition.current) {
      const newPosition = {
        x: Math.max(0, dragStartPosition.current.x + transform.x),
        y: Math.max(0, dragStartPosition.current.y + transform.y)
      }
      onMove(id, newPosition)
      dragStartPosition.current = null
    }
  }, [transform, id, onMove])

  useEffect(() => {
    if (isDragging && !dragStartPosition.current) {
      dragStartPosition.current = { ...position }
    } else if (!isDragging && dragStartPosition.current) {
      handleDragEnd()
    }
  }, [isDragging, position, handleDragEnd])

  // Handle resize events
  const handleResizeStart = () => {
    if (!canEdit) return false
    setIsResizing(true)
    onSelect(id)
  }

  const handleResizeStop = (e, { size: newSize }) => {
    setIsResizing(false)
    onResize(id, { width: newSize.width, height: newSize.height })
  }

  // Handle click events
  const handleClick = (e) => {
    e.stopPropagation()
    setShowContextMenu(false)
    onSelect(id)
  }

  const handleDoubleClick = (e) => {
    e.stopPropagation()
    setShowContextMenu(false)
    if (canEdit) {
      onEdit(id)
    }
  }

  // Handle right click for context menu
  const handleContextMenu = (e) => {
    if (!canEdit) return
    e.preventDefault()
    e.stopPropagation()
    setContextMenuPosition({ x: e.clientX, y: e.clientY })
    setShowContextMenu(true)
    onSelect(id)
  }

  // Handle markdown content change with debouncing
  const handleContentChange = useCallback((value) => {
    onContentChange(id, value || '')
  }, [id, onContentChange])

  // Handle delete
  const handleDelete = useCallback(() => {
    if (canEdit && onDelete) {
      onDelete(id)
    }
    setShowContextMenu(false)
  }, [canEdit, onDelete, id])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isEditing) {
        if (e.key === 'Escape') {
          onStopEditing()
        }
        // Don't handle other shortcuts while editing
        return
      }

      if (isSelected && canEdit) {
        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault()
          handleDelete()
        } else if (e.key === 'Enter' || e.key === 'F2') {
          e.preventDefault()
          onEdit(id)
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isEditing, isSelected, canEdit, id, onStopEditing, onEdit, handleDelete])

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = () => {
      setShowContextMenu(false)
    }

    if (showContextMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showContextMenu])

  const textBlockContent = (
    <div className="w-full h-full">
      <div
        ref={nodeRef}
        className={`absolute transition-all duration-200 ${
          isSelected ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
        } ${isDragging ? 'opacity-80 scale-105' : ''} ${isResizing ? 'opacity-80' : ''} ${
          canEdit ? 'cursor-pointer' : 'cursor-default'
        }`}
        style={{ 
          zIndex: isSelected ? 1000 : zIndex,
          left: position.x,
          top: position.y,
          width: size.width,
          height: size.height
        }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
      >
        {isEditing ? (
          <div className="w-full h-full relative">
            <div className="absolute -top-8 left-0 right-0 bg-blue-500 text-white text-xs px-2 py-1 rounded-t flex items-center justify-between z-10">
              <span>✏️ Editing - Markdown supported</span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onStopEditing()
                  }}
                  className="text-white hover:text-gray-200 text-xs"
                  title="Save and close (ESC)"
                >
                  ✓ Save
                </button>
              </div>
            </div>
            {editorPlugins ? (
              <MDXEditor
                ref={editorRef}
                markdown={content || ''}
                onChange={handleContentChange}
                plugins={[
                  editorPlugins.headingsPlugin(),
                  editorPlugins.listsPlugin(),
                  editorPlugins.quotePlugin(),
                  editorPlugins.thematicBreakPlugin(),
                  editorPlugins.markdownShortcutPlugin(),
                  editorPlugins.linkPlugin(),
                  editorPlugins.linkDialogPlugin(),
                  editorPlugins.imagePlugin(),
                  editorPlugins.tablePlugin(),
                  editorPlugins.codeBlockPlugin({ defaultCodeBlockLanguage: 'txt' }),
                  editorPlugins.toolbarPlugin({
                    toolbarContents: () => (
                      <div className="flex items-center">
                        <editorPlugins.UndoRedo />
                        <editorPlugins.Separator />
                        <editorPlugins.BoldItalicUnderlineToggles />
                        <editorPlugins.Separator />
                        <editorPlugins.ListsToggle />
                        <editorPlugins.Separator />
                        <editorPlugins.CreateLink />
                        <editorPlugins.InsertImage />
                        <editorPlugins.Separator />
                        <editorPlugins.InsertTable />
                        <editorPlugins.InsertThematicBreak />
                      </div>
                    )
                  })
                ]}
                contentEditableClassName="prose prose-sm max-w-none focus:outline-none"
                className="mdx-editor-custom border-0 focus:ring-0"
                style={{ 
                  height: Math.max(size.height - 40, 200),
                  minHeight: '150px'
                }}
                onFocus={() => setIsDragDisabled(true)}
                onBlur={() => setIsDragDisabled(false)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            )}
          </div>
        ) : (
          <div className={`w-full h-full p-4 bg-white border-2 rounded-lg shadow-sm transition-all duration-200 ${
            isSelected ? 'border-blue-500 shadow-lg' : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
          }`}>
            {content ? (
              <div className="w-full h-full overflow-auto prose prose-sm max-w-none">
                {editorPlugins ? (
                  <MDXEditor
                    markdown={content}
                    readOnly={true}
                    plugins={[
                      editorPlugins.headingsPlugin(),
                      editorPlugins.listsPlugin(),
                      editorPlugins.quotePlugin(),
                      editorPlugins.thematicBreakPlugin(),
                      editorPlugins.linkPlugin(),
                      editorPlugins.imagePlugin(),
                      editorPlugins.tablePlugin(),
                      editorPlugins.codeBlockPlugin({ defaultCodeBlockLanguage: 'txt' })
                    ]}
                    contentEditableClassName="prose prose-sm max-w-none"
                    className="mdx-editor-readonly border-0"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="animate-pulse bg-gray-200 h-4 w-3/4 rounded"></div>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 italic text-center">
                <div>
                  <div className="text-2xl mb-2">📝</div>
                  <div className="text-sm">
                    {canEdit ? 'Double-click to add content' : 'Empty text block'}
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

        {/* Enhanced Selection indicators */}
        {isSelected && !isEditing && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Selection border with animation */}
            <div className="absolute inset-0 border-2 border-blue-500 rounded-lg pointer-events-none animate-pulse" />
            
            {/* Corner indicators with better visibility */}
            <div className="absolute -top-2 -left-2 w-4 h-4 bg-blue-500 border-2 border-white rounded-full shadow-md" />
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-blue-500 border-2 border-white rounded-full shadow-md" />
            <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-blue-500 border-2 border-white rounded-full shadow-md" />
            <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-blue-500 border-2 border-white rounded-full shadow-md" />

            {/* Action toolbar */}
            {canEdit && (
              <div className="absolute -top-10 left-0 bg-gray-800 text-white text-xs px-2 py-1 rounded flex items-center space-x-2 shadow-lg pointer-events-auto">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit(id)
                  }}
                  className="hover:text-blue-300 flex items-center"
                  title="Edit (Enter or F2)"
                >
                  ✏️ Edit
                </button>
                <span className="text-gray-400">|</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete()
                  }}
                  className="hover:text-red-300 flex items-center"
                  title="Delete (Del or Backspace)"
                >
                  🗑️ Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Context Menu */}
      {showContextMenu && canEdit && (
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
            <span className="text-gray-400 text-xs ml-auto">Enter</span>
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
            <span className="text-gray-400 text-xs ml-auto">Del</span>
          </button>
        </div>
      )}
    </div>
  )

  // Calculate the current position with transform
  const currentPosition = transform ? {
    x: position.x + transform.x,
    y: position.y + transform.y
  } : position

  // Apply styles for dragging
  const dragStyle = {
    zIndex: isDragging ? 1000 : zIndex,
    opacity: isDragging ? 0.8 : 1,
    transform: isDragging ? 'scale(1.02)' : 'scale(1)',
    transition: isDragging ? 'none' : 'all 0.2s ease'
  }

  if (canEdit && !isEditing) {
    return (
      <div
        ref={setNodeRef}
        style={{
          position: 'absolute',
          left: currentPosition.x,
          top: currentPosition.y,
          ...dragStyle
        }}
        {...(canEdit && !isEditing && !isResizing && !isDragDisabled ? { ...attributes, ...listeners } : {})}
      >
        <Resizable
          width={size.width}
          height={size.height}
          onResizeStart={handleResizeStart}
          onResizeStop={handleResizeStop}
          minConstraints={[100, 50]}
          maxConstraints={[800, 600]}
          resizeHandles={isSelected ? ['se', 'sw', 'ne', 'nw', 'n', 's', 'e', 'w'] : []}
          handle={(handleAxis) => (
            <div
              className={`react-resizable-handle react-resizable-handle-${handleAxis}`}
              style={{
                position: 'absolute',
                backgroundColor: '#3b82f6',
                border: '1px solid #1d4ed8',
                borderRadius: '2px',
                opacity: isSelected ? 1 : 0,
                transition: 'opacity 0.2s ease',
                ...(handleAxis.includes('e') && { right: '-4px', width: '8px', height: '20px', top: '50%', transform: 'translateY(-50%)', cursor: 'ew-resize' }),
                ...(handleAxis.includes('w') && { left: '-4px', width: '8px', height: '20px', top: '50%', transform: 'translateY(-50%)', cursor: 'ew-resize' }),
                ...(handleAxis.includes('n') && { top: '-4px', height: '8px', width: '20px', left: '50%', transform: 'translateX(-50%)', cursor: 'ns-resize' }),
                ...(handleAxis.includes('s') && { bottom: '-4px', height: '8px', width: '20px', left: '50%', transform: 'translateX(-50%)', cursor: 'ns-resize' }),
                ...(handleAxis === 'se' && { bottom: '-4px', right: '-4px', width: '8px', height: '8px', cursor: 'se-resize' }),
                ...(handleAxis === 'sw' && { bottom: '-4px', left: '-4px', width: '8px', height: '8px', cursor: 'sw-resize' }),
                ...(handleAxis === 'ne' && { top: '-4px', right: '-4px', width: '8px', height: '8px', cursor: 'ne-resize' }),
                ...(handleAxis === 'nw' && { top: '-4px', left: '-4px', width: '8px', height: '8px', cursor: 'nw-resize' })
              }}
            />
          )}
        >
          {textBlockContent}
        </Resizable>
      </div>
    )
  }

  // For non-editable or editing mode, just return the content
  return (
    <div
      ref={setNodeRef}
      style={{
        position: 'absolute',
        left: currentPosition.x,
        top: currentPosition.y,
        width: size.width,
        height: size.height,
        ...dragStyle
      }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      className="group"
    >
      {textBlockContent}
    </div>
  )
}

export default TextBlock