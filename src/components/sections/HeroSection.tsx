'use client'

import { motion } from 'framer-motion'
import Button from '@/components/shared/Button'

export default function HeroSection() {
  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section
      id="hero"
      className="min-h-screen flex flex-col items-center justify-center px-5 py-32 text-center relative overflow-hidden"
    >
      {/* Background gradient glow effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] via-transparent to-transparent pointer-events-none" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-5xl mx-auto space-y-12"
      >
        {/* Massive hero text */}
        <h1 className="text-7xl md:text-8xl lg:text-9xl font-bold tracking-tight leading-none">
          <span className="block text-white">Own</span>
          <span className="block text-white">Anything</span>
        </h1>

        {/* Minimal tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="text-xl md:text-2xl text-text-secondary max-w-2xl mx-auto font-light"
        >
          Fractional ownership of high-value assets through blockchain technology
        </motion.p>

        {/* Single CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
        >
          <Button variant="primary" onClick={() => scrollToSection('utilities')}>
            Explore Platform
          </Button>
        </motion.div>

        {/* Launching badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.8 }}
          className="pt-12"
        >
          <span className="inline-block px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm text-text-muted">
            Launching Q1 2026
          </span>
        </motion.div>
      </motion.div>
    </section>
  )
}
