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
    primary: 'bg-gradient-to-br from-primary-teal to-primary-teal-dark text-white hover:from-primary-teal-dark hover:to-primary-teal-dark',
    secondary: 'bg-transparent border-2 border-primary-teal text-text-secondary hover:bg-primary-teal/10',
  }

  return (
    <motion.button
      type={type}
      onClick={onClick}
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.button>
  )
}
