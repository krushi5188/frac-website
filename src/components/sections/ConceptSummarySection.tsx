'use client'

import { motion } from 'framer-motion'
import { fadeInUp, fadeInScale } from '@/lib/animations'

export default function ConceptSummarySection() {
  return (
    <section
      id="ecosystem"
      className="py-section md:py-section px-5 md:px-10 bg-bg-dark-secondary/30 backdrop-blur-card border-y border-white/5"
    >
      <div className="max-w-container mx-auto">
        <motion.h2
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={fadeInUp}
          className="text-section md:text-section font-bold text-white text-center mb-8"
        >
          The Complete Ecosystem
        </motion.h2>

        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={fadeInUp}
          transition={{ delay: 0.2 }}
          className="text-xl text-text-secondary leading-relaxed max-w-[900px] mx-auto text-center mb-10"
        >
          FractionalBase ($FRAC) merges the functionalities of fractional asset tokens, governance
          tokens, and access tokens into a unified ecosystem. It expands access, decentralizes
          ownership, and creates a sustainable token economy driven by utility rather than
          speculation.
        </motion.p>

        {/* Ecosystem Diagram */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={fadeInScale}
          transition={{ delay: 0.6 }}
          className="relative w-full max-w-[600px] h-[400px] mx-auto mb-10"
        >
          <svg viewBox="0 0 600 400" className="w-full h-full">
            {/* Connecting Lines */}
            <line x1="150" y1="120" x2="300" y2="200" stroke="#ffffff" strokeWidth="1" opacity="0.2" />
            <line x1="450" y1="120" x2="300" y2="200" stroke="#ffffff" strokeWidth="1" opacity="0.2" />
            <line x1="300" y1="200" x2="300" y2="320" stroke="#ffffff" strokeWidth="1" opacity="0.2" />

            {/* Assets Circle (Top Left) */}
            <circle
              cx="150"
              cy="120"
              r="60"
              fill="#ffffff"
              opacity="0.05"
              stroke="#ffffff"
              strokeWidth="1"
              strokeOpacity="0.2"
            />
            <text x="150" y="125" textAnchor="middle" fill="white" fontSize="18" fontWeight="600">
              Assets
            </text>

            {/* Users Circle (Top Right) */}
            <circle
              cx="450"
              cy="120"
              r="60"
              fill="#ffffff"
              opacity="0.05"
              stroke="#ffffff"
              strokeWidth="1"
              strokeOpacity="0.2"
            />
            <text x="450" y="125" textAnchor="middle" fill="white" fontSize="18" fontWeight="600">
              Users
            </text>

            {/* $FRAC Circle (Center, Larger) */}
            <circle
              cx="300"
              cy="200"
              r="80"
              fill="#ffffff"
              opacity="0.1"
              stroke="#ffffff"
              strokeWidth="1"
              strokeOpacity="0.3"
            />
            <text x="300" y="210" textAnchor="middle" fill="white" fontSize="24" fontWeight="700">
              $FRAC
            </text>

            {/* Liquidity Circle (Bottom) */}
            <circle
              cx="300"
              cy="320"
              r="60"
              fill="#ffffff"
              opacity="0.05"
              stroke="#ffffff"
              strokeWidth="1"
              strokeOpacity="0.2"
            />
            <text x="300" y="325" textAnchor="middle" fill="white" fontSize="18" fontWeight="600">
              Liquidity
            </text>
          </svg>
        </motion.div>

        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={fadeInUp}
          transition={{ delay: 0.4 }}
          className="text-2xl font-semibold text-white text-center max-w-[800px] mx-auto"
        >
          In essence—your token is built to connect assets, users, and liquidity, functioning
          simultaneously as the gas, key, and stake of the FractionalBase ecosystem.
        </motion.p>
      </div>
    </section>
  )
}
