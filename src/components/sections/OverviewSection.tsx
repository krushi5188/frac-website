'use client'

import { motion } from 'framer-motion'
import { fadeInUp } from '@/lib/animations'

export default function OverviewSection() {
  return (
    <section
      id="overview"
      className="py-32 md:py-48 px-5 bg-bg-dark"
    >
      <div className="max-w-4xl mx-auto text-center space-y-8">
        <motion.h2
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={fadeInUp}
          className="text-5xl md:text-6xl font-bold text-white leading-tight"
        >
          Break down barriers
        </motion.h2>

        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={fadeInUp}
          transition={{ delay: 0.2 }}
          className="text-xl md:text-2xl text-text-secondary leading-relaxed font-light max-w-3xl mx-auto"
        >
          High-value assets have been locked behind wealth barriers. $FRAC enables anyone to own fractions of premium digital assets, NFTs, and tokenized commodities through blockchain infrastructure.
        </motion.p>
      </div>
    </section>
  )
}
