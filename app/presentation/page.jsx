'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import useAuthStore from '../../stores/authStore'
import usePresentationStore from '../../stores/presentationStore'
import FullscreenPresentation from '../../components/FullscreenPresentation'
import { logError } from '../../lib/errorHandler'
import { useClientMount } from '../../hooks/useClientMount'

function PresentationContent() {
  const { nickname, hasNickname } = useAuthStore()
  const { 
    slides, 
    isLoading, 
    joinPresentation, 
    fetchSlides,
    subscribeToSlideUpdates,
    unsubscribeFromUserUpdates
  } = usePresentationStore()
  const router = useRouter()
  const searchParams = useSearchParams()
  const presentationId = searchParams.get('id')
  const slideParam = searchParams.get('slide')
  
  const isMounted = useClientMount()
  const [initialSlideIndex, setInitialSlideIndex] = useState(0)

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


    const initializePresentation = async () => {
      try {
        await joinPresentation(presentationId, nickname)
        await fetchSlides(presentationId)
      } catch (error) {
        logError('Presentation Initialization', error)
        router.push('/presentations')
      }
    }

    initializePresentation()


    subscribeToSlideUpdates(presentationId)

    return () => {
      unsubscribeFromUserUpdates()
    }
  }, [isMounted, hasNickname, presentationId, nickname, router, joinPresentation, fetchSlides, subscribeToSlideUpdates, unsubscribeFromUserUpdates])


  useEffect(() => {
    if (slides.length > 0 && slideParam) {
      const slideNumber = parseInt(slideParam)
      if (!isNaN(slideNumber) && slideNumber > 0) {

        const sortedSlides = [...slides].sort((a, b) => a.slide_number - b.slide_number)
        const slideIndex = sortedSlides.findIndex(slide => slide.slide_number === slideNumber)
        if (slideIndex !== -1) {
          setInitialSlideIndex(slideIndex)
        }
      }
    }
  }, [slides, slideParam])

  const handleExitPresentation = () => {
    router.push(`/slideEditor?id=${presentationId}`)
  }

  if (!isMounted || !hasNickname() || !presentationId) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-lg">Loading presentation...</p>
        </div>
      </div>
    )
  }

  if (isLoading || slides.length === 0) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-lg">Loading slides...</p>
        </div>
      </div>
    )
  }

  return (
    <FullscreenPresentation
      slides={slides}
      initialSlideIndex={initialSlideIndex}
      onExit={handleExitPresentation}
      presentationId={presentationId}
    />
  )
}

export default function Presentation() {
  return (
    <Suspense fallback={
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-lg">Loading presentation...</p>
        </div>
      </div>
    }>
      <PresentationContent />
    </Suspense>
  )
}