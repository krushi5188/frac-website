import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service - FractionalBase',
  description: 'Terms of Service for FractionalBase ($FRAC) platform',
}

export default function TermsOfService() {
  return (
    <main className="min-h-screen bg-bg-black py-20 px-5">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/"
          className="inline-block mb-8 text-text-secondary hover:text-white transition-colors"
        >
          ← Back to Home
        </Link>

        <h1 className="text-4xl md:text-5xl font-bold text-white mb-8">
          Terms of Service
        </h1>

        <div className="space-y-8 text-text-secondary leading-relaxed">
          <p className="text-sm text-text-muted">
            Last Updated: January 2025
          </p>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing and using the FractionalBase website and services ("Services"), you accept and agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use our Services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">2. Description of Services</h2>
            <p>
              FractionalBase provides a platform for fractional ownership of digital and real-world assets through blockchain technology. The $FRAC token serves as the ecosystem's utility token for transactions, governance, staking, and access control.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">3. Eligibility</h2>
            <p className="mb-3">To use our Services, you must:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Be at least 18 years of age</li>
              <li>Have the legal capacity to enter into binding contracts</li>
              <li>Not be prohibited from using our Services under applicable laws</li>
              <li>Comply with all local laws regarding online conduct and cryptocurrency</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">4. User Responsibilities</h2>
            <p className="mb-3">You agree to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Provide accurate, current, and complete information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Notify us immediately of any unauthorized access</li>
              <li>Comply with all applicable laws and regulations</li>
              <li>Not use our Services for any illegal or unauthorized purpose</li>
              <li>Not attempt to interfere with or disrupt our Services</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">5. Cryptocurrency Risks</h2>
            <p className="mb-3">You acknowledge and accept the following risks:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Cryptocurrency markets are highly volatile</li>
              <li>Value of $FRAC tokens may fluctuate significantly</li>
              <li>Transactions are irreversible once confirmed on the blockchain</li>
              <li>Regulatory frameworks for cryptocurrencies are evolving</li>
              <li>You may lose some or all of your investment</li>
            </ul>
            <p className="mt-3 font-semibold text-white">
              You should only invest what you can afford to lose.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">6. No Financial Advice</h2>
            <p>
              Nothing on our website or Services constitutes financial, investment, legal, or tax advice. You should conduct your own research and consult with qualified professionals before making any investment decisions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">7. Intellectual Property</h2>
            <p>
              All content on our website, including text, graphics, logos, and software, is the property of FractionalBase and is protected by intellectual property laws. You may not reproduce, distribute, or create derivative works without our express permission.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">8. Prohibited Activities</h2>
            <p className="mb-3">You may not:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Use our Services for money laundering or terrorist financing</li>
              <li>Manipulate markets or engage in fraudulent activities</li>
              <li>Violate any applicable securities laws</li>
              <li>Infringe on intellectual property rights</li>
              <li>Transmit malware or harmful code</li>
              <li>Impersonate any person or entity</li>
              <li>Scrape or harvest data from our Services</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">9. Disclaimer of Warranties</h2>
            <p>
              OUR SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT OUR SERVICES WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">10. Limitation of Liability</h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, FRACTIONALBASE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, OR OTHER INTANGIBLE LOSSES.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">11. Indemnification</h2>
            <p>
              You agree to indemnify and hold harmless FractionalBase, its affiliates, and their respective officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses arising from your use of our Services or violation of these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">12. Termination</h2>
            <p>
              We reserve the right to suspend or terminate your access to our Services at any time, with or without cause or notice, if we believe you have violated these Terms or engaged in prohibited activities.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">13. Governing Law and Dispute Resolution</h2>
            <p>
              These Terms shall be governed by and construed in accordance with applicable laws. Any disputes arising from these Terms or our Services shall be resolved through binding arbitration, except where prohibited by law.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">14. Changes to Terms</h2>
            <p>
              We reserve the right to modify these Terms at any time. Material changes will be notified through our website or via email. Your continued use of our Services after changes constitutes acceptance of the modified Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">15. Severability</h2>
            <p>
              If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions shall continue in full force and effect.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">16. Contact Information</h2>
            <p className="mb-3">
              For questions about these Terms, please contact us at:
            </p>
            <p>
              Email: legal@fractionalbase.com
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
