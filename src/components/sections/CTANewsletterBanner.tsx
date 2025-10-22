'use client'

import { motion } from 'framer-motion'
import { fadeInUp } from '@/lib/animations'
import { useState } from 'react'

export default function CTANewsletterBanner() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setStatus('error')
      setErrorMessage('Please enter a valid email address')
      return
    }

    // Simulate form submission
    setStatus('success')
    setEmail('')

    // Reset after 5 seconds
    setTimeout(() => {
      setStatus('idle')
    }, 5000)
  }

  return (
    <section className="py-16 md:py-20 px-5 md:px-10 bg-bg-dark border-y border-white/10">
      <div className="max-w-container mx-auto text-center">
        <motion.h2
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={fadeInUp}
          className="text-3xl md:text-4xl font-bold text-white mb-3"
        >
          Ready to Join the Future of Asset Ownership?
        </motion.h2>

        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={fadeInUp}
          transition={{ delay: 0.15 }}
          className="text-lg text-text-secondary mb-8"
        >
          Get early access and exclusive updates
        </motion.p>

        <motion.form
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={fadeInUp}
          transition={{ delay: 0.3 }}
          onSubmit={handleSubmit}
          className="max-w-[600px] mx-auto"
        >
          {status === 'success' ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white/10 backdrop-blur-card rounded-button p-4 text-white font-semibold"
            >
              ✓ Thanks! We'll be in touch soon.
            </motion.div>
          ) : (
            <div className="flex flex-col md:flex-row gap-3 bg-white/5 backdrop-blur-card rounded-button p-2 border border-white/10">
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setStatus('idle')
                  setErrorMessage('')
                }}
                placeholder="Enter your email address"
                className="flex-1 bg-transparent text-white placeholder:text-text-muted rounded-lg px-5 py-3.5 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all"
              />
              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                className="bg-white text-black font-semibold px-8 py-3.5 rounded-lg hover:bg-white/90 transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-white/50"
              >
                Join Waitlist
              </motion.button>
            </div>
          )}

          {status === 'error' && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-2 text-sm text-text-secondary"
            >
              {errorMessage}
            </motion.p>
          )}
        </motion.form>
      </div>
    </section>
  )
}
