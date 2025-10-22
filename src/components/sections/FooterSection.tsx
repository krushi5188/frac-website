'use client'

import { motion } from 'framer-motion'

export default function FooterSection() {
  return (
    <footer id="footer" className="bg-bg-footer px-5 md:px-10 py-20 border-t border-white/5">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          {/* Brand */}
          <div className="text-center md:text-left">
            <h3 className="text-2xl font-bold text-white mb-2">FractionalBase</h3>
            <p className="text-sm text-text-muted">Democratizing Asset Ownership</p>
          </div>

          {/* Copyright */}
          <div className="text-sm text-text-muted text-center md:text-right">
            © 2025 FractionalBase. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  )
}
