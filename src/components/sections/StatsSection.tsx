'use client'

import { motion } from 'framer-motion'
import { fadeInUp } from '@/lib/animations'

const stats = [
  {
    value: 'Coming Soon',
    label: 'Total Assets',
  },
  {
    value: 'Coming Soon',
    label: 'Community',
  },
  {
    value: 'Coming Soon',
    label: 'Total Value',
  },
]

export default function StatsSection() {
  return (
    <section className="py-32 md:py-48 px-5 md:px-10 bg-bg-dark">
      <div className="max-w-7xl mx-auto">
        {/* Bento grid layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-100px' }}
              variants={fadeInUp}
              transition={{ delay: index * 0.1 }}
              className="relative group"
            >
              <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-12 hover:bg-white/[0.04] transition-all duration-500 h-full flex flex-col justify-between min-h-[280px]">
                <div className="space-y-4">
                  <div className="text-sm font-medium text-text-muted uppercase tracking-wider">
                    {stat.label}
                  </div>
                  <div className="text-4xl md:text-5xl font-bold text-white">
                    {stat.value}
                  </div>
                </div>
                
                {/* Subtle corner accent */}
                <div className="absolute bottom-0 right-0 w-24 h-24 bg-gradient-to-tl from-white/[0.02] to-transparent rounded-3xl pointer-events-none" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
