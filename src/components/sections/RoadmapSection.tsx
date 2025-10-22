'use client'

import { motion } from 'framer-motion'
import { fadeInUp } from '@/lib/animations'

const milestones = [
  { quarter: 'Q1 2026', title: 'Platform Foundation', current: true },
  { quarter: 'Q2 2026', title: 'Token Launch' },
  { quarter: 'Q3 2026', title: 'Digital Asset Onboarding' },
  { quarter: 'Q4 2026', title: 'DeFi Integration' },
  { quarter: 'Q1 2027', title: 'Enterprise Expansion' },
  { quarter: 'Q2 2027', title: 'Real-World Assets' },
]

export default function RoadmapSection() {
  return (
    <section className="py-32 md:py-48 px-5 md:px-10 bg-bg-dark">
      <div className="max-w-4xl mx-auto space-y-20">
        {/* Section header */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
          className="text-center"
        >
          <h2 className="text-5xl md:text-6xl font-bold text-white">
            Roadmap
          </h2>
        </motion.div>

        {/* Timeline */}
        <div className="space-y-12">
          {milestones.map((milestone, index) => (
            <motion.div
              key={milestone.quarter}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-100px' }}
              variants={fadeInUp}
              transition={{ delay: index * 0.08 }}
              className="group"
            >
              <div className="flex items-start gap-6 md:gap-12">
                {/* Quarter */}
                <div className="flex-shrink-0 w-24 md:w-32">
                  <div className={`text-sm font-medium ${milestone.current ? 'text-accent-blue' : 'text-text-muted'}`}>
                    {milestone.quarter}
                  </div>
                  {milestone.current && (
                    <div className="mt-2 text-xs text-accent-blue/70">CURRENT</div>
                  )}
                </div>

                {/* Dot with blue accent for current */}
                <div className="flex-shrink-0 mt-1">
                  <div className={`w-3 h-3 rounded-full ${
                    milestone.current ? 'bg-accent-blue shadow-lg shadow-accent-blue/50' : 'bg-white/20'
                  }`} />
                </div>

                {/* Title */}
                <div className="flex-1 pt-0">
                  <h3 className="text-2xl md:text-3xl font-semibold text-white group-hover:text-white/80 transition-colors">
                    {milestone.title}
                  </h3>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
