'use client'

import { useState, useEffect, useRef, ReactNode } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface CarouselProps {
  children: ReactNode[]
  autoScroll?: boolean
  autoScrollInterval?: number
}

export default function Carousel({
  children,
  autoScroll = true,
  autoScrollInterval = 5000,
}: CarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [touchStart, setTouchStart] = useState(0)
  const [visibleCards, setVisibleCards] = useState(1)
  const carouselRef = useRef<HTMLDivElement>(null)

  // Determine visible cards based on viewport width
  useEffect(() => {
    const updateVisibleCards = () => {
      if (window.innerWidth >= 1280) {
        setVisibleCards(3)
      } else if (window.innerWidth >= 768) {
        setVisibleCards(2)
      } else {
        setVisibleCards(1)
      }
    }

    updateVisibleCards()
    window.addEventListener('resize', updateVisibleCards)
    return () => window.removeEventListener('resize', updateVisibleCards)
  }, [])

  const maxIndex = Math.max(0, children.length - visibleCards)

  // Auto-scroll functionality
  useEffect(() => {
    if (autoScroll && !isPaused) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1))
      }, autoScrollInterval)

      return () => clearInterval(interval)
    }
  }, [autoScroll, isPaused, maxIndex, autoScrollInterval])

  const handlePrevious = () => {
    setCurrentIndex(Math.max(0, currentIndex - 1))
  }

  const handleNext = () => {
    setCurrentIndex(Math.min(maxIndex, currentIndex + 1))
  }

  const handleDotClick = (index: number) => {
    setCurrentIndex(Math.min(index, maxIndex))
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEnd = e.changedTouches[0].clientX
    const diff = touchStart - touchEnd

    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        handleNext()
      } else {
        handlePrevious()
      }
    }
  }

  return (
    <div
      ref={carouselRef}
      className="relative group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      {/* Carousel Container */}
      <div className="overflow-hidden">
        <motion.div
          className="flex gap-6"
          animate={{ x: `calc(-${currentIndex * (100 / visibleCards)}% - ${currentIndex * 24}px)` }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {children.map((child, index) => (
            <div
              key={index}
              className="flex-shrink-0"
              style={{ width: `calc(${100 / visibleCards}% - ${(24 * (visibleCards - 1)) / visibleCards}px)` }}
            >
              {child}
            </div>
          ))}
        </motion.div>
      </div>

      {/* Navigation Arrows - Desktop */}
      {currentIndex > 0 && (
        <button
          onClick={handlePrevious}
          aria-label="Previous card"
          className="hidden lg:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 items-center justify-center w-12 h-12 rounded-full bg-bg-dark-secondary/90 backdrop-blur-card border border-primary-teal/20 text-primary-teal hover:bg-primary-teal hover:text-white transition-all duration-200 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-primary-teal"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {currentIndex < maxIndex && (
        <button
          onClick={handleNext}
          aria-label="Next card"
          className="hidden lg:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 items-center justify-center w-12 h-12 rounded-full bg-bg-dark-secondary/90 backdrop-blur-card border border-primary-teal/20 text-primary-teal hover:bg-primary-teal hover:text-white transition-all duration-200 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-primary-teal"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* Dot Indicators */}
      <div className="flex justify-center gap-2 mt-8">
        {Array.from({ length: maxIndex + 1 }).map((_, index) => (
          <button
            key={index}
            onClick={() => handleDotClick(index)}
            aria-label={`Go to slide ${index + 1}`}
            className={`w-2 h-2 rounded-full transition-all duration-200 focus-visible:outline-2 focus-visible:outline-primary-teal ${
              currentIndex === index
                ? 'bg-primary-teal w-8'
                : 'bg-primary-teal/30 hover:bg-primary-teal/50'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
