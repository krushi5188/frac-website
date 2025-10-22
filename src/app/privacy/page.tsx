import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy - FractionalBase',
  description: 'Privacy Policy for FractionalBase ($FRAC) platform',
}

export default function PrivacyPolicy() {
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
          Privacy Policy
        </h1>

        <div className="space-y-8 text-text-secondary leading-relaxed">
          <p className="text-sm text-text-muted">
            Last Updated: January 2025
          </p>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">1. Introduction</h2>
            <p>
              FractionalBase ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">2. Information We Collect</h2>
            <h3 className="text-xl font-semibold text-white mb-3 mt-4">2.1 Information You Provide</h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Email address (when you join our waitlist)</li>
              <li>Communication preferences</li>
              <li>Any information you provide when contacting us</li>
            </ul>

            <h3 className="text-xl font-semibold text-white mb-3 mt-4">2.2 Automatically Collected Information</h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Browser type and version</li>
              <li>Operating system</li>
              <li>IP address</li>
              <li>Pages visited and time spent on pages</li>
              <li>Referring website addresses</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">3. How We Use Your Information</h2>
            <p className="mb-3">We use the collected information to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Send you updates about FractionalBase and $FRAC token</li>
              <li>Notify you of early access opportunities</li>
              <li>Improve our website and services</li>
              <li>Analyze website usage and trends</li>
              <li>Respond to your inquiries and support requests</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">4. Information Sharing and Disclosure</h2>
            <p className="mb-3">We do not sell your personal information. We may share your information with:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Service Providers:</strong> Third-party vendors who assist in operating our website and services (e.g., email service providers, analytics providers)</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
              <li><strong>Business Transfers:</strong> In connection with any merger, sale, or acquisition</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">5. Data Security</h2>
            <p>
              We implement appropriate technical and organizational security measures to protect your personal information. However, no method of transmission over the internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">6. Your Rights</h2>
            <p className="mb-3">Depending on your location, you may have the following rights:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Access to your personal information</li>
              <li>Correction of inaccurate information</li>
              <li>Deletion of your information</li>
              <li>Opt-out of marketing communications</li>
              <li>Data portability</li>
            </ul>
            <p className="mt-3">
              To exercise these rights, please contact us at privacy@fractionalbase.com
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">7. Cookies and Tracking Technologies</h2>
            <p>
              We use cookies and similar tracking technologies to enhance your experience on our website. You can control cookie settings through your browser preferences. Note that disabling cookies may affect website functionality.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">8. Third-Party Links</h2>
            <p>
              Our website may contain links to third-party websites. We are not responsible for the privacy practices of these external sites. We encourage you to review their privacy policies.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">9. Children's Privacy</h2>
            <p>
              Our services are not directed to individuals under the age of 18. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">10. International Data Transfers</h2>
            <p>
              Your information may be transferred to and processed in countries other than your country of residence. We ensure appropriate safeguards are in place for such transfers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">11. Changes to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">12. Contact Us</h2>
            <p className="mb-3">
              If you have questions or concerns about this Privacy Policy, please contact us at:
            </p>
            <p>
              Email: privacy@fractionalbase.com
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
