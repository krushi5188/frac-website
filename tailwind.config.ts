import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary colors - Psychology-based premium palette
        primary: {
          purple: '#5b21b6',        // Deep Purple - Luxury, Royalty
          'purple-light': '#7c3aed', // Light Purple
          'purple-dark': '#4c1d95',  // Dark Purple
          gold: '#d4af37',           // Gold - Wealth, Prestige
          'gold-light': '#f4d03f',   // Light Gold
          'gold-dark': '#b8941f',    // Dark Gold
        },
        // Background colors - Navy and Charcoal for trust & authority
        bg: {
          navy: '#0f172a',              // Navy Blue - Trust, Stability
          'navy-light': '#1e293b',      // Charcoal - Authority
          'navy-lighter': '#334155',    // Lighter Navy
          'card': 'rgba(30, 41, 59, 0.6)', // Charcoal with transparency
          'footer': '#0a0e1a',          // Deep Navy for footer
        },
        // Text colors - White and Silver for sophistication
        text: {
          primary: '#ffffff',           // Pure White
          secondary: '#cbd5e1',         // Silver/Light Gray
          muted: '#94a3b8',             // Muted Silver
          gold: '#d4af37',              // Gold for highlights
        },
        // Semantic colors
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6',
      },
      fontFamily: {
        sans: ['var(--font-inter)', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      fontSize: {
        'hero': ['56px', { lineHeight: '1.1' }],
        'hero-mobile': ['36px', { lineHeight: '1.2' }],
        'section': ['40px', { lineHeight: '1.2' }],
        'section-mobile': ['28px', { lineHeight: '1.3' }],
        'subsection': ['28px', { lineHeight: '1.4' }],
        'subsection-mobile': ['22px', { lineHeight: '1.4' }],
      },
      spacing: {
        'section': '80px',
        'section-mobile': '48px',
      },
      maxWidth: {
        'container': '1280px',
        'content': '800px',
      },
      borderRadius: {
        'button': '12px',
        'card': '16px',
        'large': '24px',
        'icon': '8px',
      },
      backdropBlur: {
        'card': '10px',
      },
    },
  },
  plugins: [],
}

export default config
