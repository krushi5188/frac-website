'use client'

import { motion } from 'framer-motion'
import { fadeInUp } from '@/lib/animations'
import { Boxes, Building2, Droplet, Cpu, Globe } from 'lucide-react'

const useCases = [
  {
    id: 1,
    icon: Boxes,
    title: 'Fractional NFTs',
    description: 'Tokenize high-value digital collectibles',
  },
  {
    id: 2,
    icon: Building2,
    title: 'Real-World Assets',
    description: 'Art, commodities, and tokenized goods',
  },
  {
    id: 3,
    icon: Droplet,
    title: 'Liquidity Pools',
    description: 'Decentralized trading and staking',
  },
  {
    id: 4,
    icon: Cpu,
    title: 'DeFi Integration',
    description: 'Auto-yield and dynamic pricing',
  },
  {
    id: 5,
    icon: Globe,
    title: 'Metaverse Assets',
    description: 'Virtual land and in-game items',
  },
]

export default function ExtendedUseCasesSection() {
  return (
    <section
      id="use-cases"
      className="py-32 md:py-48 px-5 bg-bg-dark"
    >
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
            Future modules
          </h2>
        </motion.div>

        {/* Simple grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {useCases.map((useCase, index) => {
            const Icon = useCase.icon
            return (
              <motion.div
                key={useCase.id}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-100px' }}
                variants={fadeInUp}
                transition={{ delay: index * 0.05 }}
                className="group"
              >
                <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-8 hover:bg-white/[0.04] transition-all duration-500 h-full flex flex-col min-h-[200px]">
                  {/* Icon */}
                  <div className="mb-auto">
                    <Icon className="w-8 h-8 text-white/50 mb-6" strokeWidth={1.5} />
                    <h3 className="text-xl font-semibold text-white mb-2">
                      {useCase.title}
                    </h3>
                    <p className="text-sm text-text-muted font-light">
                      {useCase.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
