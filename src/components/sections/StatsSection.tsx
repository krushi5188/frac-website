'use client'

import { motion } from 'framer-motion'
import { fadeInUp } from '@/lib/animations'

const stats = [
  {
    value: 'Coming Soon',
    description: 'Pre-launch phase',
    label: 'Total Assets',
  },
  {
    value: 'Coming Soon',
    description: 'Join the waitlist',
    label: 'Community Members',
  },
  {
    value: 'Coming Soon',
    description: 'Launching Q1 2026',
    label: 'Total Value Locked',
  },
]

export default function StatsSection() {
  return (
    <section className="py-section md:py-section px-5 md:px-10 bg-bg-navy-light/30 backdrop-blur-card">
      <div className="max-w-container mx-auto">
        <motion.h2
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={fadeInUp}
          className="text-section md:text-section font-bold text-gradient text-center mb-12"
        >
          Key Metrics
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-100px' }}
              variants={fadeInUp}
              transition={{ delay: index * 0.2 }}
              className="text-center"
            >
              <div className="text-4xl md:text-5xl font-bold text-text-gold mb-2">
                {stat.value}
              </div>
              <div className="text-xl md:text-2xl font-semibold text-text-secondary mb-1">
                {stat.label}
              </div>
              <div className="text-base text-text-secondary">
                {stat.description}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
