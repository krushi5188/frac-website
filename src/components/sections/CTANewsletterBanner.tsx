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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setStatus('error')
      setErrorMessage('Please enter a valid email address')
      return
    }

    setStatus('success')
    setEmail('')

    setTimeout(() => {
      setStatus('idle')
    }, 5000)
  }

  return (
    <section className="py-32 md:py-48 px-5 md:px-10 bg-bg-dark">
      <div className="max-w-3xl mx-auto text-center space-y-12">
        <motion.h2
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={fadeInUp}
          className="text-5xl md:text-6xl font-bold text-white"
        >
          Join the waitlist
        </motion.h2>

        <motion.form
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={fadeInUp}
          transition={{ delay: 0.2 }}
          onSubmit={handleSubmit}
          className="max-w-md mx-auto"
        >
          {status === 'success' ? (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-text-secondary text-lg"
            >
              Thanks! We'll be in touch soon.
            </motion.div>
          ) : (
            <div className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setStatus('idle')
                  setErrorMessage('')
                }}
                placeholder="your@email.com"
                className="w-full bg-white/[0.02] border border-white/10 text-white placeholder:text-text-muted rounded-2xl px-6 py-4 text-lg focus:outline-none focus:border-white/20 transition-colors"
              />
              <button
                type="submit"
                className="w-full bg-white text-black font-semibold px-6 py-4 rounded-2xl text-lg hover:bg-white/90 transition-colors"
              >
                Join Waitlist
              </button>
            </div>
          )}

          {status === 'error' && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-2 text-sm text-text-muted"
            >
              {errorMessage}
            </motion.p>
          )}
        </motion.form>
      </div>
    </section>
  )
}
