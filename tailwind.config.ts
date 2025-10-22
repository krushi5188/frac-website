import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Subtle accent color - very minimal blue
        accent: {
          blue: '#60a5fa',           // Subtle blue accent
          'blue-hover': '#93c5fd',   // Lighter on hover
        },
        // Modern minimal premium palette
        primary: {
          blue: '#3b82f6',
          'blue-light': '#60a5fa',
          'blue-dark': '#2563eb',
        },
        // True black/dark backgrounds
        bg: {
          black: '#000000',
          dark: '#0a0a0a',
          'dark-secondary': '#141414',
          'card': 'rgba(20, 20, 20, 0.5)',
          'footer': '#000000',
        },
        // Minimal gray text
        text: {
          primary: '#ffffff',
          secondary: '#a1a1aa',
          muted: '#71717a',
          accent: '#60a5fa',
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
