'use client'

import { motion } from 'framer-motion'
import Button from '@/components/shared/Button'
import FracIcon from '@/components/icons/FracIcon'

export default function HeroSection() {
  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section
      id="hero"
      className="min-h-screen flex flex-col items-center justify-center px-5 py-20 text-center"
    >
      <motion.div
        initial={{ opacity: 0, y: -60, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0, duration: 0.8 }}
        className="mb-8"
      >
        <FracIcon size={120} />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.8 }}
        className="text-hero md:text-hero font-bold text-gradient mb-6"
      >
        FractionalBase
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.8 }}
        className="text-lg md:text-xl text-text-secondary max-w-[700px] leading-relaxed mb-10"
      >
        Democratizing ownership through blockchain-powered fractional assets. Trade, stake, and
        govern high-value assets with unprecedented accessibility.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.8 }}
        className="flex flex-col sm:flex-row gap-5"
      >
        <Button variant="primary" onClick={() => scrollToSection('utilities')}>
          Explore Ecosystem
        </Button>
        <Button variant="secondary" onClick={() => scrollToSection('ecosystem')}>
          Read Whitepaper
        </Button>
      </motion.div>
    </section>
  )
}
