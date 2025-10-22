'use client'

import { motion } from 'framer-motion'
import { fadeInUp, staggerContainer } from '@/lib/animations'

export default function OverviewSection() {
  return (
    <section
      id="overview"
      className="py-section md:py-section px-5 bg-bg-navy"
    >
      <div className="max-w-container mx-auto text-center">
        <motion.h2
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={fadeInUp}
          className="text-section md:text-section font-bold text-gradient mb-8"
        >
          The Future of Asset Ownership
        </motion.h2>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={staggerContainer}
          className="max-w-content mx-auto space-y-5"
        >
          <motion.p variants={fadeInUp} className="text-lg text-text-secondary leading-relaxed">
            High-value assets have traditionally been accessible only to wealthy investors, creating
            barriers to entry for everyday individuals. Premium digital assets, fine art NFTs, and
            tokenized commodities often require significant capital investment, leaving millions unable to
            participate in wealth-building opportunities. FractionalBase breaks down these barriers
            by enabling true fractional ownership—allowing anyone to own a piece of valuable assets
            through blockchain technology.
          </motion.p>

          <motion.p variants={fadeInUp} className="text-lg text-text-secondary leading-relaxed">
            At the heart of the FractionalBase ecosystem is the $FRAC token. More than just a
            cryptocurrency, $FRAC represents your stake in a new paradigm of asset ownership. It
            functions simultaneously as a medium of exchange for all platform transactions, a
            governance tool giving holders voting power over ecosystem decisions, and a utility
            token unlocking exclusive access to premium features and high-yield staking
            opportunities.
          </motion.p>

          <motion.p variants={fadeInUp} className="text-lg text-text-secondary leading-relaxed">
            Whether you're interested in tokenized art, NFT ownership, metaverse assets, or digital
            collectibles, $FRAC provides a unified gateway to diverse investment opportunities.
            With built-in staking rewards, community governance, cross-chain compatibility, and
            enterprise-grade security, the FractionalBase ecosystem is designed for sustainable
            growth—prioritizing utility and real value over speculative hype.
          </motion.p>
        </motion.div>
      </div>
    </section>
  )
}
