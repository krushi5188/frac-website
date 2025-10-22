'use client'

import { motion } from 'framer-motion'
import { fadeInUp } from '@/lib/animations'
import Carousel from '@/components/shared/Carousel'
import { Boxes, Building2, Droplet, Cpu, Globe } from 'lucide-react'

const useCases = [
  {
    id: 1,
    icon: Boxes,
    title: 'Fractional NFT Market',
    description: 'Tokenization and partial sale of high-value NFTs',
    role: 'Settlement & fractional ownership token',
  },
  {
    id: 2,
    icon: Building2,
    title: 'Real-World Asset (RWA) Tokenization',
    description: 'Fine art, collectibles, and tokenized commodities',
    role: 'Governance and transactional currency',
  },
  {
    id: 3,
    icon: Droplet,
    title: 'Liquidity Mining Pools',
    description: 'Support decentralized OTC trading',
    role: 'Staking and reward payouts',
  },
  {
    id: 4,
    icon: Cpu,
    title: 'AI & DeFi Integration',
    description: 'Future DeFi extensions (auto-yield, dynamic pricing)',
    role: 'Fuel for cross-application execution',
  },
  {
    id: 5,
    icon: Globe,
    title: 'Metaverse Asset Fractionalization',
    description: 'Virtual land, digital collectibles, and in-game assets',
    role: 'Cross-platform ownership token',
  },
]

export default function ExtendedUseCasesSection() {
  return (
    <section
      id="use-cases"
      className="py-section md:py-section px-5 bg-bg-navy"
    >
      <div className="max-w-container mx-auto">
        <motion.h2
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={fadeInUp}
          className="text-section md:text-section font-bold text-gradient text-center mb-12"
        >
          Extended Use Cases & Future Modules
        </motion.h2>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={fadeInUp}
        >
          <Carousel>
            {useCases.map((useCase) => {
              const Icon = useCase.icon
              return (
                <motion.div
                  key={useCase.id}
                  whileHover={{ scale: 1.03 }}
                  className="h-full bg-bg-card backdrop-blur-card border border-primary-purple/20 rounded-card p-8 transition-transform duration-200"
                >
                  <div className="flex items-center justify-center w-15 h-15 rounded-icon bg-gradient-to-br from-primary-purple to-primary-purple-dark mb-4">
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-semibold text-white mb-3">
                    {useCase.title}
                  </h3>
                  <p className="text-base text-text-secondary leading-relaxed mb-4">
                    {useCase.description}
                  </p>
                  <div className="inline-block bg-primary-purple/20 border border-primary-purple rounded-icon px-3 py-2">
                    <span className="text-sm font-medium text-primary-purple">
                      {useCase.role}
                    </span>
                  </div>
                </motion.div>
              )
            })}
          </Carousel>
        </motion.div>
      </div>
    </section>
  )
}
