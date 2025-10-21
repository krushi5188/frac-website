'use client'

import { motion } from 'framer-motion'
import { fadeInUp, pulse } from '@/lib/animations'

const milestones = [
  {
    quarter: 'Q1 2025',
    title: 'Platform Foundation',
    description:
      'Smart contract development and security audits completed. Token architecture finalized with multi-chain compatibility framework.',
    completed: true,
  },
  {
    quarter: 'Q2 2025',
    title: 'Token Launch',
    description:
      '$FRAC token public sale and initial DEX listings. Community governance portal activated.',
    completed: true,
  },
  {
    quarter: 'Q3 2025',
    title: 'Asset Onboarding',
    description:
      'First fractional real-world assets tokenized. Partnership with leading RWA custodians established.',
    completed: true,
  },
  {
    quarter: 'Q4 2025',
    title: 'DeFi Integration',
    description:
      'Liquidity mining pools launched. Cross-chain bridge activation for Ethereum and BSC.',
    completed: false,
    current: true,
  },
  {
    quarter: 'Q1 2026',
    title: 'Enterprise Expansion',
    description:
      'Institutional-grade API and white-label solutions. Strategic partnerships with asset managers.',
    completed: false,
  },
  {
    quarter: 'Q2-Q4 2026',
    title: 'Global Scale',
    description:
      'AI-powered portfolio optimization. Expansion into emerging markets and new asset classes.',
    completed: false,
  },
]

export default function RoadmapSection() {
  return (
    <section className="py-section md:py-section px-5 md:px-10 bg-bg-dark">
      <div className="max-w-[1000px] mx-auto">
        <motion.h2
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={fadeInUp}
          className="text-section md:text-section font-bold text-gradient text-center mb-12"
        >
          Roadmap & Milestones
        </motion.h2>

        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-0.5 bg-primary-teal/30" />

          {/* Milestones */}
          <div className="space-y-16">
            {milestones.map((milestone, index) => (
              <motion.div
                key={milestone.quarter}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-100px' }}
                variants={fadeInUp}
                transition={{ delay: index * 0.15 }}
                className="relative"
              >
                {/* Timeline Node */}
                <motion.div
                  className={`absolute left-6 md:left-1/2 -translate-x-1/2 w-10 h-10 rounded-full border-3 ${
                    milestone.completed
                      ? 'bg-primary-teal border-primary-teal'
                      : 'bg-bg-dark border-primary-teal/30'
                  }`}
                  animate={milestone.completed ? pulse : {}}
                />

                {/* Content */}
                <div className={`ml-20 md:ml-0 ${index % 2 === 0 ? 'md:pr-[calc(50%+40px)]' : 'md:pl-[calc(50%+40px)]'}`}>
                  <div className="bg-bg-dark-secondary/30 backdrop-blur-card border border-primary-teal/20 rounded-card p-6">
                    <div className="text-sm font-semibold text-primary-teal mb-2">
                      {milestone.quarter}
                      {milestone.current && (
                        <span className="ml-2 px-2 py-1 bg-primary-teal/20 rounded text-xs">
                          CURRENT
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                      {milestone.title}
                    </h3>
                    <p className="text-base text-text-secondary leading-relaxed">
                      {milestone.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
