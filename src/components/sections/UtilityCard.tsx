'use client'

import { motion } from 'framer-motion'
import { fadeInLeft, fadeInRight } from '@/lib/animations'
import { LucideIcon } from 'lucide-react'
import { ReactNode } from 'react'

interface UtilityCardProps {
  title: string
  description: string
  icon: LucideIcon
  pattern: 'A' | 'B'
  index: number
  diagram?: ReactNode
}

export default function UtilityCard({
  title,
  description,
  icon: Icon,
  pattern,
  index,
  diagram,
}: UtilityCardProps) {
  const bgClass = pattern === 'A' ? 'bg-bg-dark-secondary/30 backdrop-blur-card' : 'bg-bg-dark'

  return (
    <section className={`py-section md:py-section px-5 md:px-10 ${bgClass}`}>
      <div className="max-w-container mx-auto">
        <div className={`grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-15 items-center`}>
          {/* Text Content */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={pattern === 'A' ? fadeInLeft : fadeInRight}
            transition={{ delay: index * 0.1 }}
            className={pattern === 'B' ? 'lg:order-2' : ''}
          >
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary-teal/20 mb-4">
              <Icon className="w-5 h-5 text-primary-teal" />
            </div>
            <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
              {title}
            </h3>
            <p className="text-lg text-text-secondary leading-relaxed">
              {description}
            </p>
          </motion.div>

          {/* Visual Content */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={pattern === 'A' ? fadeInRight : fadeInLeft}
            transition={{ delay: index * 0.1 + 0.2 }}
            className={`flex items-center justify-center p-10 ${pattern === 'B' ? 'lg:order-1' : ''}`}
          >
            <div className="w-full max-w-md">
              {diagram || (
                <div className="flex items-center justify-center">
                  <Icon className="w-32 h-32 text-primary-teal" strokeWidth={1.5} />
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
