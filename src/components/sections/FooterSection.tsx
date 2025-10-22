'use client'

import { motion } from 'framer-motion'
import FracIcon from '@/components/icons/FracIcon'
import { Twitter, MessageCircle, Send, Github } from 'lucide-react'

export default function FooterSection() {
  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' })
  }

  const navigationLinks = [
    { label: 'Core Utilities', sectionId: 'utilities' },
    { label: 'Use Cases', sectionId: 'use-cases' },
    { label: 'Roadmap', sectionId: 'ecosystem' },
    { label: 'Ecosystem', sectionId: 'ecosystem' },
    { label: 'Whitepaper', sectionId: 'ecosystem' },
  ]

  const socialLinks = [
    { icon: Twitter, label: 'Twitter', href: '#' },
    { icon: MessageCircle, label: 'Discord', href: '#' },
    { icon: Send, label: 'Telegram', href: '#' },
    { icon: Github, label: 'GitHub', href: '#' },
  ]

  return (
    <footer id="footer" className="bg-bg-footer px-5 md:px-10 pt-16 pb-10">
      <div className="max-w-container mx-auto">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-10">
          {/* Column 1: Branding */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <FracIcon size={60} />
              <div>
                <h3 className="text-xl font-semibold text-white">FractionalBase</h3>
                <p className="text-sm text-text-secondary">Democratizing Asset Ownership</p>
              </div>
            </div>
            <p className="text-sm text-text-muted leading-relaxed max-w-[300px]">
              Fractional ownership of digital assets, NFTs, and tokenized commodities powered by blockchain
              technology.
            </p>
          </div>

          {/* Column 2: Navigation Links */}
          <div>
            <h4 className="text-base font-semibold text-white mb-4">Explore</h4>
            <ul className="space-y-3">
              {navigationLinks.map((link) => (
                <li key={link.label}>
                  <button
                    onClick={() => scrollToSection(link.sectionId)}
                    className="text-sm text-text-secondary hover:text-primary-purple transition-colors duration-200 text-left"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Community */}
          <div>
            <h4 className="text-base font-semibold text-white mb-4">Community</h4>
            <div className="grid grid-cols-2 gap-3">
              {socialLinks.map((social) => {
                const Icon = social.icon
                return (
                  <motion.a
                    key={social.label}
                    href={social.href}
                    onClick={(e) => e.preventDefault()}
                    aria-label={social.label}
                    whileHover={{ scale: 1.1 }}
                    className="flex items-center justify-center w-12 h-12 rounded-lg bg-transparent hover:bg-primary-purple/10 text-text-secondary hover:text-primary-purple transition-all duration-200 focus-visible:outline-2 focus-visible:outline-primary-purple"
                  >
                    <Icon className="w-6 h-6" />
                  </motion.a>
                )
              })}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-primary-purple/20 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-text-muted">
              © 2025 FractionalBase. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className="text-sm text-text-muted hover:text-text-secondary transition-colors duration-200"
              >
                Privacy Policy
              </a>
              <span className="text-text-muted">|</span>
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className="text-sm text-text-muted hover:text-text-secondary transition-colors duration-200"
              >
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
