'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Fullscreen from 'react-fullscreen-crossbrowser'
import TextBlock from './TextBlock'

const FullscreenPresentation = ({ 
  slides = [], 
  initialSlideIndex = 0, 
  onExit,
  presentationId 
}) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(initialSlideIndex)
  const [isFullscreenEnabled, setIsFullscreenEnabled] = useState(false)
  const router = useRouter()


  const sortedSlides = [...slides].sort((a, b) => a.slide_number - b.slide_number)
  const currentSlide = sortedSlides[currentSlideIndex]


  const goToNextSlide = useCallback(() => {
    if (currentSlideIndex < sortedSlides.length - 1) {
      setCurrentSlideIndex(prev => prev + 1)
    }
  }, [currentSlideIndex, sortedSlides.length])

  const goToPrevSlide = useCallback(() => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(prev => prev - 1)
    }
  }, [currentSlideIndex])

  const exitPresentation = useCallback(() => {
    setIsFullscreenEnabled(false)

    setTimeout(() => {
      if (onExit) {
        onExit()
      }
    }, 100)
  }, [onExit])


  const handleFullscreenChange = useCallback((isFullscreen) => {
    setIsFullscreenEnabled(isFullscreen)
    if (!isFullscreen && onExit) {
      
      setTimeout(() => {
        onExit()
      }, 100)
    }
  }, [onExit])


  useEffect(() => {
    const handleKeyDown = (event) => {

      switch (event.key) {
        case 'ArrowRight':
        case ' ': 
        case 'PageDown':
          event.preventDefault()
          event.stopPropagation()
          goToNextSlide()
          break
        case 'ArrowLeft':
        case 'PageUp':
          event.preventDefault()
          event.stopPropagation()
          goToPrevSlide()
          break
        case 'Escape':
          event.preventDefault()
          event.stopPropagation()
          exitPresentation()
          break
        case 'Home':
          event.preventDefault()
          event.stopPropagation()
          setCurrentSlideIndex(0)
          break
        case 'End':
          event.preventDefault()
          event.stopPropagation()
          setCurrentSlideIndex(sortedSlides.length - 1)
          break
        default:
          // Handle number keys for direct slide navigation
          if (event.key >= '1' && event.key <= '9') {
            event.preventDefault()
            event.stopPropagation()
            const slideNumber = parseInt(event.key) - 1
            if (slideNumber < sortedSlides.length) {
              setCurrentSlideIndex(slideNumber)
            }
          }
          break
      }
    }


    document.addEventListener('keydown', handleKeyDown, true)
    window.addEventListener('keydown', handleKeyDown, true)
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
      window.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [goToNextSlide, goToPrevSlide, exitPresentation, sortedSlides.length])


  useEffect(() => {
    setIsFullscreenEnabled(true)
  }, [])


  useEffect(() => {
    return () => {
      setIsFullscreenEnabled(false)
    }
  }, [])

  const getTextBlocks = () => {
    if (!currentSlide?.content_json?.textBlocks) return []
    return currentSlide.content_json.textBlocks
  }

  const getImages = () => {
    if (!currentSlide?.content_json?.images) return []
    return currentSlide.content_json.images
  }

  return (
    <Fullscreen
      enabled={isFullscreenEnabled}
      onChange={handleFullscreenChange}
    >
      <div className="w-full h-full bg-black flex items-center justify-center relative">

        <button
          onClick={exitPresentation}
          className="absolute top-4 right-4 z-50 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
          title="Exit presentation (ESC)"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Slide counter */}
        <div className="absolute top-4 left-4 z-50 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
          {currentSlideIndex + 1} / {sortedSlides.length}
        </div>

        {/* Main slide content */}
        <div className="w-full h-full max-w-7xl max-h-full aspect-video bg-white relative overflow-hidden mx-4">
          {currentSlide ? (
            <>
              {/* Text blocks - read-only in presentation mode */}
              {getTextBlocks().map((textBlock, index) => (
                <div
                  key={textBlock.id}
                  style={{
                    position: 'absolute',
                    left: textBlock.position?.x || 0,
                    top: textBlock.position?.y || 0,
                    width: textBlock.size?.width || 300,
                    height: textBlock.size?.height || 200,
                    zIndex: 100 + index,
                  }}
                  className="p-2 rounded-lg overflow-hidden"
                >
                  {textBlock.content ? (
                    <div 
                      className="w-full h-full text-gray-800 break-words word-wrap leading-tight overflow-hidden"
                      style={{ 
                        wordWrap: 'break-word',
                        overflowWrap: 'anywhere',
                        hyphens: 'auto',
                        fontSize: `${Math.max(12, Math.min(24, Math.min((textBlock.size?.width || 300) / 15, (textBlock.size?.height || 200) / 4)))}px`,
                        lineHeight: '1.2',
                        display: 'block'
                      }}
                      dangerouslySetInnerHTML={{
                        __html: textBlock.content
                          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                          .replace(/\*(.*?)\*/g, '<em>$1</em>')
                          .replace(/__(.*?)__/g, '<u>$1</u>')
                          .replace(/`(.*?)`/g, '<code style="word-break: break-all; font-size: inherit; background: rgba(0,0,0,0.1); padding: 1px 3px; border-radius: 3px;">$1</code>')
                          .replace(/!\[(.*?)\]\((.*?)\)/g, '<img alt="$1" src="$2" style="max-width: 100%; max-height: 100%; width: auto; height: auto; display: block; object-fit: contain; margin: 2px 0; border-radius: 4px;" />')
                          .replace(/\n/g, '<br>')
                      }}
                    />
                  ) : null}
                </div>
              ))}

              {/* Images - if stored separately */}
              {getImages().map((image, index) => (
                <div
                  key={`image-${index}`}
                  style={{
                    position: 'absolute',
                    left: image.position?.x || 0,
                    top: image.position?.y || 0,
                    width: image.size?.width || 300,
                    height: image.size?.height || 200,
                    zIndex: 200 + index,
                  }}
                  className="rounded-lg overflow-hidden"
                >
                  <img
                    src={image.url}
                    alt={image.alt || 'Slide image'}
                    className="w-full h-full object-contain rounded-lg"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      width: 'auto',
                      height: 'auto'
                    }}
                  />
                </div>
              ))}

              {/* Empty state */}
              {getTextBlocks().length === 0 && getImages().length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <svg className="w-24 h-24 mx-auto mb-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-2xl mb-2">No content on this slide</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <svg className="w-24 h-24 mx-auto mb-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-2xl">No slide available</p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation arrows */}
        {sortedSlides.length > 1 && (
          <>
            {/* Previous button */}
            <button
              onClick={goToPrevSlide}
              disabled={currentSlideIndex === 0}
              className={`absolute left-4 top-1/2 transform -translate-y-1/2 z-50 p-3 rounded-full transition-all ${
                currentSlideIndex === 0
                  ? 'bg-gray-600 bg-opacity-30 text-gray-400 cursor-not-allowed'
                  : 'bg-black bg-opacity-50 text-white hover:bg-opacity-70'
              }`}
              title="Previous slide (←)"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Next button */}
            <button
              onClick={goToNextSlide}
              disabled={currentSlideIndex === sortedSlides.length - 1}
              className={`absolute right-4 top-1/2 transform -translate-y-1/2 z-50 p-3 rounded-full transition-all ${
                currentSlideIndex === sortedSlides.length - 1
                  ? 'bg-gray-600 bg-opacity-30 text-gray-400 cursor-not-allowed'
                  : 'bg-black bg-opacity-50 text-white hover:bg-opacity-70'
              }`}
              title="Next slide (→)"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

        {/* Keyboard shortcuts help */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-50 bg-black bg-opacity-50 text-white px-4 py-2 rounded-full text-sm">
          <span className="hidden sm:inline">
            ← → Space: Navigate • ESC: Exit • 1-9: Jump to slide
          </span>
          <span className="sm:hidden">
            ← → ESC: Navigate & Exit
          </span>
        </div>
      </div>
    </Fullscreen>
  )
}

export default FullscreenPresentation