import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'FractionalBase ($FRAC) - Democratizing Asset Ownership',
  description: 'Trade, stake, and govern fractional assets through blockchain-powered infrastructure. $FRAC enables seamless ownership of real-world and digital assets.',
  keywords: [
    'fractional ownership',
    'blockchain',
    'DeFi',
    'tokenization',
    'FRAC',
    'cryptocurrency',
    'NFT fractionalization',
    'staking',
    'governance token',
    'real-world assets'
  ],
  authors: [{ name: 'FractionalBase' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://fractionalbase.com',
    title: 'FractionalBase ($FRAC) - Democratizing Asset Ownership',
    description: 'Trade, stake, and govern fractional assets through blockchain-powered infrastructure.',
    siteName: 'FractionalBase',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FractionalBase ($FRAC)',
    description: 'Democratizing Asset Ownership',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={inter.className}>{children}</body>
    </html>
  )
}
