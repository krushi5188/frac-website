import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import GoogleAnalytics from '@/components/analytics/GoogleAnalytics'

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
    images: [
      {
        url: 'https://fractionalbase.com/og-image.png',
        width: 1200,
        height: 630,
        alt: 'FractionalBase - Democratizing Asset Ownership',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FractionalBase ($FRAC)',
    description: 'Democratizing Asset Ownership',
    images: ['https://fractionalbase.com/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: '/favicon.ico',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'FractionalBase',
    url: 'https://fractionalbase.com',
    logo: 'https://fractionalbase.com/logo.png',
    description: 'Trade, stake, and govern fractional assets through blockchain-powered infrastructure. $FRAC enables seamless ownership of real-world and digital assets.',
    foundingDate: '2024',
    sameAs: [
      'https://twitter.com/fractionalbase',
      'https://github.com/fractionalbase',
    ],
  }

  return (
    <html lang="en" className={inter.variable}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={inter.className}>
        {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
          <GoogleAnalytics 
            measurementId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} 
          />
        )}
        {children}
      </body>
    </html>
  )
}
