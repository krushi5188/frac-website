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
      {/* Subtle blue glow in background */}
      <div className="absolute inset-0 bg-gradient-radial from-accent-blue/[0.03] via-transparent to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] via-transparent to-transparent pointer-events-none" />
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-5xl mx-auto space-y-12 relative z-10"
      >
        {/* Massive hero text with blur reveal */}
        <h1 className="text-7xl md:text-8xl lg:text-9xl font-bold tracking-tight leading-none">
          <motion.span 
            className="block text-white"
            initial={{ opacity: 0, filter: 'blur(10px)', y: 20 }}
            animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
            transition={{ duration: 1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            Own
          </motion.span>
          <motion.span 
            className="block text-white"
            initial={{ opacity: 0, filter: 'blur(10px)', y: 20 }}
            animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
            transition={{ duration: 1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            Anything
          </motion.span>
        </h1>

        {/* Minimal tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="text-xl md:text-2xl text-text-secondary max-w-2xl mx-auto font-light"
        >
          Fractional ownership of high-value assets through blockchain technology
        </motion.p>

        {/* Single CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.8 }}
        >
          <Button variant="primary" onClick={() => scrollToSection('utilities')}>
            Explore Platform
          </Button>
        </motion.div>

        {/* Launching badge with blue accent */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="pt-12"
        >
          <span className="inline-block px-4 py-2 bg-accent-blue/5 border border-accent-blue/20 rounded-full text-sm text-accent-blue">
            Launching Q1 2026
          </span>
        </motion.div>
      </motion.div>
    </section>
  )
}
