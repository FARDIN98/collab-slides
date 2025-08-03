'use client'

import React from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'

const SlidesPanel = ({ 
  slides = [], 
  currentSlideIndex = 0, 
  onSlideSelect, 
  onAddSlide, 
  onRemoveSlide, 
  isCreator = false, 
  isLoading = false 
}) => {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="text-sm font-medium text-foreground">Slides</h2>
        {isCreator && (
          <Button
            type="button"
            onClick={onAddSlide}
            size="sm"
            className="h-8 bg-blue-600 hover:bg-blue-700 text-white font-bold"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        )}
      </div>

      {/* Slides List */}
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
                type="button"
                onClick={onAddSlide}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                Add First Slide
              </Button>
            )}
          </div>
        ) : (
          slides.map((slide, index) => (
            <Card 
              key={slide.id}
              className={`group relative cursor-pointer transition-all duration-200 rounded ${
                index === currentSlideIndex 
                  ? 'ring-2 ring-blue-500 bg-blue-50' 
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => onSlideSelect(index)}
            >
              <CardContent className="p-3">
                <div className="aspect-video bg-white rounded border border-border flex items-center justify-center relative">
                  <span className="text-xs text-muted-foreground">
                    Slide {slide.slide_number || index + 1}
                  </span>
                  
                  {/* Remove button for creators */}
                  {isCreator && slides.length > 1 && (
                    <Button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onRemoveSlide(slide.id)
                      }}
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6 bg-red-500 hover:bg-red-600 text-white border border-red-600 rounded-md shadow-sm"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

export default SlidesPanel