'use client'

import type { ForwardedRef } from 'react'
import { useState } from 'react'
import {
  MDXEditor,
  type MDXEditorMethods,
  type MDXEditorProps,
  toolbarPlugin,
  BoldItalicUnderlineToggles,
  CodeToggle,
  markdownShortcutPlugin,
  imagePlugin,
} from '@mdxeditor/editor'
import ImageUploadModal from './ImageUploadModal'

interface InitializedMDXEditorProps extends Omit<MDXEditorProps, 'plugins'> {
  editorRef?: React.ForwardedRef<MDXEditorMethods>
  presentationId?: string
}

// Custom Image Upload Button Component
const CustomImageUpload = ({ presentationId, editorRef }: { presentationId?: string, editorRef?: React.ForwardedRef<MDXEditorMethods> }) => {
    const [isModalOpen, setIsModalOpen] = useState(false)

    const handleImageUpload = (imageUrl: string) => {
      if (editorRef && typeof editorRef === 'object' && editorRef.current) {
        const currentMarkdown = editorRef.current.getMarkdown()
        const imageMarkdown = `![Image](${imageUrl})`
        const newMarkdown = currentMarkdown ? `${currentMarkdown}\n\n${imageMarkdown}` : imageMarkdown
        editorRef.current.setMarkdown(newMarkdown)
      }
      setIsModalOpen(false)
    }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="flex items-center justify-center w-8 h-8 rounded hover:bg-gray-100 transition-colors"
        title="Upload Image"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>
      
      {presentationId && (
        <ImageUploadModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onImageUpload={handleImageUpload}
          presentationId={presentationId}
        />
      )}
    </>
  )
}

// Only import this to the next file
export default function InitializedMDXEditor({
  editorRef,
  presentationId,
  ...props
}: InitializedMDXEditorProps) {
  return (
    <MDXEditor
      plugins={[
        // Image plugin for image support
        imagePlugin({
          // Disable the default image upload dialog
          imageUploadHandler: async () => {
            // Return empty string to prevent default behavior
            return ''
          }
        }),
        // Toolbar plugin with custom image upload
        toolbarPlugin({
          toolbarContents: () => (
            <div className="flex items-center gap-1 p-1">
              <BoldItalicUnderlineToggles />
              <div className="w-px h-6 bg-gray-300 mx-1" />
              <CodeToggle />
              <div className="w-px h-6 bg-gray-300 mx-1" />
              <CustomImageUpload presentationId={presentationId} editorRef={editorRef} />
            </div>
          )
        }),
        markdownShortcutPlugin()
        ]}
        {...props}
        ref={editorRef}
      className="mdx-editor-minimal mdx-editor"
      overlayContainer={typeof document !== 'undefined' ? document.body : null}
    />
  )
}