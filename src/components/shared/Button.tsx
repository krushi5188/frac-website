'use client'

import { motion } from 'framer-motion'
import { ReactNode, useRef, useState } from 'react'

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
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!buttonRef.current) return
    
    const rect = buttonRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    
    // Calculate distance from center
    const deltaX = (e.clientX - centerX) * 0.15 // Reduced multiplier for subtlety
    const deltaY = (e.clientY - centerY) * 0.15
    
    setPosition({ x: deltaX, y: deltaY })
  }

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 })
  }

  const baseStyles = 'px-10 py-4 rounded-button font-semibold transition-all duration-200'

  const variantStyles = {
    primary: 'bg-white text-black hover:bg-white/90',
    secondary: 'bg-transparent border border-white/20 text-white hover:border-white/40 hover:bg-white/5',
  }

  return (
    <motion.button
      ref={buttonRef}
      type={type}
      onClick={onClick}
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{ 
        x: position.x, 
        y: position.y,
        scale: position.x !== 0 || position.y !== 0 ? 1.02 : 1
      }}
      transition={{ 
        type: "spring", 
        stiffness: 200, 
        damping: 20 
      }}
    >
      {children}
    </motion.button>
  )
}
