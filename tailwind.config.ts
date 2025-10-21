import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary colors
        primary: {
          teal: '#14b8a6',
          'teal-dark': '#0d9488',
        },
        // Background colors
        bg: {
          dark: '#0d1b2a',
          'dark-secondary': '#1b3a4b',
          'card': 'rgba(27, 58, 75, 0.6)',
          'footer': '#0a0e1a',
        },
        // Text colors
        text: {
          primary: '#ffffff',
          secondary: '#b0d4e3',
          muted: '#7a8a99',
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
