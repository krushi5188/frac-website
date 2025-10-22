import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Modern minimal premium palette - Stripe/Linear/Vercel style
        primary: {
          blue: '#3b82f6',           // Subtle blue accent
          'blue-light': '#60a5fa',   // Lighter blue
          'blue-dark': '#2563eb',    // Darker blue
        },
        // True black/dark backgrounds - modern premium
        bg: {
          black: '#000000',              // True black
          dark: '#0a0a0a',               // Near black
          'dark-secondary': '#141414',   // Subtle lift
          'card': 'rgba(20, 20, 20, 0.5)', // Dark card with transparency
          'footer': '#000000',           // Pure black footer
        },
        // Minimal gray text - modern and clean
        text: {
          primary: '#ffffff',           // Pure white
          secondary: '#a1a1aa',         // Subtle gray
          muted: '#71717a',             // More muted
          accent: '#3b82f6',            // Blue for highlights
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
