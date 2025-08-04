'use client'

import type { ForwardedRef } from 'react'
import {
  MDXEditor,
  type MDXEditorMethods,
  type MDXEditorProps,
  toolbarPlugin,
  BoldItalicUnderlineToggles,
  CodeToggle,
  InsertImage,
  markdownShortcutPlugin,
  imagePlugin,
} from '@mdxeditor/editor'

// Only import this to the next file
export default function InitializedMDXEditor({
  editorRef,
  ...props
}: { editorRef: ForwardedRef<MDXEditorMethods> | null } & MDXEditorProps) {
  return (
    <MDXEditor
      plugins={[
        // Image plugin for image support
        imagePlugin(),
        // Toolbar plugin with only the 5 requested features
        toolbarPlugin({
          toolbarContents: () => (
            <div className="flex items-center gap-1 p-1">
              <BoldItalicUnderlineToggles />
              <div className="w-px h-6 bg-gray-300 mx-1" />
              <CodeToggle />
              <div className="w-px h-6 bg-gray-300 mx-1" />
              <InsertImage />
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