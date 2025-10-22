'use client'

import { motion } from 'framer-motion'
import { fadeInUp } from '@/lib/animations'
import {
  PieChart,
  ArrowRightLeft,
  Lock,
  Vote,
  Key,
  Gift,
  Handshake,
  Network,
} from 'lucide-react'

const utilities = [
  {
    id: 1,
    title: 'Fractional Ownership',
    description: 'Own portions of high-value digital assets',
    icon: PieChart,
  },
  {
    id: 2,
    title: 'Transaction Medium',
    description: 'Native currency for all platform activity',
    icon: ArrowRightLeft,
  },
  {
    id: 3,
    title: 'Staking & Yield',
    description: 'Earn rewards through network participation',
    icon: Lock,
  },
  {
    id: 4,
    title: 'Governance',
    description: 'Vote on platform decisions and upgrades',
    icon: Vote,
  },
  {
    id: 5,
    title: 'Access Control',
    description: 'Unlock exclusive features and portfolios',
    icon: Key,
  },
  {
    id: 6,
    title: 'Rewards',
    description: 'Get tokens for community contributions',
    icon: Gift,
  },
  {
    id: 7,
    title: 'Enterprise',
    description: 'Collateral for institutional partners',
    icon: Handshake,
  },
  {
    id: 8,
    title: 'Cross-Chain',
    description: 'Bridge assets across blockchains',
    icon: Network,
  },
]

export default function CoreUtilitiesSection() {
  return (
    <section id="utilities" className="py-32 md:py-48 px-5 bg-bg-dark">
      <div className="max-w-7xl mx-auto space-y-20">
        {/* Section header */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
          className="text-center space-y-6"
        >
          <h2 className="text-5xl md:text-6xl font-bold text-white">
            Eight core utilities
          </h2>
          <p className="text-xl text-text-secondary font-light max-w-2xl mx-auto">
            Everything you need in a single token
          </p>
        </motion.div>

        {/* Bento box grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {utilities.map((utility, index) => {
            const Icon = utility.icon
            return (
              <motion.div
                key={utility.id}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-100px' }}
                variants={fadeInUp}
                transition={{ delay: index * 0.05 }}
                className="group relative"
              >
                <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-8 hover:bg-white/[0.04] hover:border-accent-blue/20 transition-all duration-500 h-full flex flex-col min-h-[220px]">
                  {/* Icon */}
                  <div className="mb-6">
                    <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center group-hover:bg-accent-blue/10 transition-colors duration-500">
                      <Icon className="w-6 h-6 text-white/70 group-hover:text-accent-blue transition-colors duration-500" strokeWidth={1.5} />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 space-y-3">
                    <h3 className="text-2xl font-semibold text-white">
                      {utility.title}
                    </h3>
                    <p className="text-base text-text-muted font-light leading-relaxed">
                      {utility.description}
                    </p>
                  </div>

                  {/* Subtle corner gradient with blue tint */}
                  <div className="absolute bottom-0 right-0 w-20 h-20 bg-gradient-to-tl from-accent-blue/[0.05] to-transparent rounded-3xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
