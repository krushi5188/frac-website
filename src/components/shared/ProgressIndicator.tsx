'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

const sections = [
  { id: 'hero', label: 'Home' },
  { id: 'overview', label: 'Overview' },
  { id: 'utilities', label: 'Core Utilities' },
  { id: 'use-cases', label: 'Use Cases' },
  { id: 'ecosystem', label: 'Ecosystem' },
]

export default function ProgressIndicator() {
  const [activeSection, setActiveSection] = useState('hero')

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + window.innerHeight / 2

      for (const section of sections) {
        const element = document.getElementById(section.id)
        if (element) {
          const { offsetTop, offsetHeight } = element
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section.id)
            break
          }
        }
      }
    }

    window.addEventListener('scroll', handleScroll)
    handleScroll() // Initial check

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    })
  }

  return (
    <>
      {/* Desktop: Right side vertical */}
      <nav
        aria-label="Page navigation"
        className="hidden lg:fixed lg:flex lg:flex-col lg:gap-4 lg:right-8 lg:top-1/2 lg:-translate-y-1/2 z-50"
      >
        {sections.map((section) => {
          const isActive = activeSection === section.id
          return (
            <div key={section.id} className="group relative flex items-center justify-end">
              <motion.span
                className="absolute right-full mr-4 px-3 py-1 bg-bg-dark-secondary/90 backdrop-blur-card rounded-lg text-sm text-text-secondary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 1 }}
              >
                {section.label}
              </motion.span>
              <button
                onClick={() => scrollToSection(section.id)}
                aria-label={`Go to ${section.label}`}
                aria-current={isActive ? 'true' : undefined}
                className={`transition-all duration-200 rounded-full focus-visible:outline-2 focus-visible:outline-primary-teal ${
                  isActive
                    ? 'w-4 h-4 bg-primary-teal'
                    : 'w-3 h-3 bg-transparent border-2 border-primary-teal hover:bg-primary-teal/30'
                }`}
              />
            </div>
          )
        })}
      </nav>

      {/* Mobile: Bottom horizontal */}
      <nav
        aria-label="Page navigation"
        className="lg:hidden fixed bottom-8 left-1/2 -translate-x-1/2 flex gap-3 bg-bg-dark-secondary/90 backdrop-blur-card px-6 py-3 rounded-full z-50"
      >
        {sections.map((section) => {
          const isActive = activeSection === section.id
          return (
            <button
              key={section.id}
              onClick={() => scrollToSection(section.id)}
              aria-label={`Go to ${section.label}`}
              aria-current={isActive ? 'true' : undefined}
              className={`transition-all duration-200 rounded-full focus-visible:outline-2 focus-visible:outline-primary-teal ${
                isActive
                  ? 'w-4 h-4 bg-primary-teal'
                  : 'w-3 h-3 bg-transparent border-2 border-primary-teal'
              }`}
            />
          )
        })}
      </nav>
    </>
  )
}
