'use client'

import { motion } from 'framer-motion'
import { fadeInUp } from '@/lib/animations'

export default function ConceptSummarySection() {
  return (
    <section
      id="ecosystem"
      className="py-32 md:py-48 px-5 md:px-10 bg-bg-dark"
    >
      <div className="max-w-5xl mx-auto text-center space-y-12">
        <motion.h2
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={fadeInUp}
          className="text-5xl md:text-7xl font-bold text-white leading-tight"
        >
          One token.
          <br />
          Complete ecosystem.
        </motion.h2>

        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={fadeInUp}
          transition={{ delay: 0.2 }}
          className="text-xl md:text-2xl text-text-secondary font-light leading-relaxed max-w-3xl mx-auto"
        >
          $FRAC functions as the gas, key, and stake of the FractionalBase ecosystem—connecting assets, users, and liquidity.
        </motion.p>
      </div>
    </section>
  )
}
