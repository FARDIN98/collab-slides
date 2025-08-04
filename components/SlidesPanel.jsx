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
    <div className="flex flex-col h-full relative">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-gradient-to-tr from-indigo-400/10 to-cyan-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Header */}
      <div className="relative p-4 border-b border-slate-200/60 flex items-center justify-between bg-gradient-to-r from-slate-50/80 via-blue-50/40 to-slate-50/80 backdrop-blur-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-indigo-500/5"></div>
        <h2 className="relative text-lg font-bold bg-gradient-to-r from-slate-800 via-blue-700 to-slate-800 bg-clip-text text-transparent tracking-wide drop-shadow-sm">Slides</h2>
        {isCreator && (
          <Button
            type="button"
            onClick={onAddSlide}
            size="sm"
            className="relative h-9 bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 hover:from-blue-600 hover:via-blue-700 hover:to-indigo-700 text-white font-bold shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/40 transform hover:scale-105 transition-all duration-300 border border-blue-400/20 backdrop-blur-sm group overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-transparent to-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
            <Plus className="w-4 h-4 mr-1 relative z-10 drop-shadow-sm group-hover:scale-110 transition-transform duration-300" />
            <span className="relative z-10 tracking-wide drop-shadow-sm">Add</span>
          </Button>
        )}
      </div>

      {/* Slides List */}
      <div className="relative flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="relative">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-slate-200"></div>
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent absolute inset-0"></div>
            </div>
          </div>
        ) : slides.length === 0 ? (
          <div className="text-center py-12 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-100/30 to-purple-100/30 rounded-2xl blur-3xl scale-150 opacity-50"></div>
            <div className="relative">
              <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center shadow-lg">
                <Plus className="w-8 h-8 text-slate-500 drop-shadow-sm" />
              </div>
              <p className="text-sm font-bold bg-gradient-to-r from-slate-700 via-blue-600 to-slate-700 bg-clip-text text-transparent mb-4 tracking-wide">No slides yet</p>
              {isCreator && (
                <Button 
                  type="button"
                  onClick={onAddSlide}
                  size="sm"
                  className="relative bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 hover:from-blue-600 hover:via-blue-700 hover:to-indigo-700 text-white font-bold shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/40 transform hover:scale-105 transition-all duration-300 border border-blue-400/20 backdrop-blur-sm group overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-transparent to-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                  <span className="relative z-10 tracking-wide drop-shadow-sm">Add First Slide</span>
                </Button>
              )}
            </div>
          </div>
        ) : (
          slides.map((slide, index) => (
            <Card 
              key={slide.id}
              className={`group relative cursor-pointer transition-all duration-300 rounded-xl overflow-hidden ${
                index === currentSlideIndex 
                  ? 'ring-2 ring-blue-500 bg-gradient-to-br from-blue-50/80 via-white to-blue-50/80 shadow-lg shadow-blue-500/20 scale-105' 
                  : 'hover:bg-gradient-to-br hover:from-slate-50/80 hover:via-white hover:to-slate-50/80 hover:shadow-lg hover:shadow-slate-300/30 hover:scale-102'
              }`}
              onClick={() => onSlideSelect(index)}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-transparent to-white/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardContent className="relative p-3">
                <div className="aspect-video bg-gradient-to-br from-white via-slate-50/30 to-blue-50/20 rounded-lg border border-slate-200/60 flex items-center justify-center relative shadow-inner">
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/20 to-transparent rounded-lg"></div>
                  <span className={`relative text-sm font-bold tracking-wide drop-shadow-sm ${
                    index === currentSlideIndex 
                      ? 'bg-gradient-to-r from-blue-700 via-blue-600 to-blue-700 bg-clip-text text-transparent' 
                      : 'bg-gradient-to-r from-slate-600 via-slate-500 to-slate-600 bg-clip-text text-transparent'
                  }`}>
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
                      className="absolute top-2 right-2 h-7 w-7 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white border border-red-400/20 rounded-lg shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/40 transform hover:scale-110 transition-all duration-300 group/delete"
                    >
                      <X className="w-3.5 h-3.5 drop-shadow-sm group-hover/delete:scale-110 transition-transform duration-300" />
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