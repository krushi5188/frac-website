'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface ButtonProps {
  variant?: 'primary' | 'secondary'
  children: ReactNode
  onClick?: () => void
  className?: string
  type?: 'button' | 'submit' | 'reset'
}

export default function Button({
  variant = 'primary',
  children,
  onClick,
  className = '',
  type = 'button',
}: ButtonProps) {
  const baseStyles = 'px-10 py-4 rounded-button font-semibold transition-all duration-200'

  const variantStyles = {
    primary: 'bg-white text-black hover:bg-white/90',
    secondary: 'bg-transparent border border-white/20 text-white hover:border-white/40 hover:bg-white/5',
  }

  return (
    <motion.button
      type={type}
      onClick={onClick}
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.button>
  )
}
