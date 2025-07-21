import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Link from '@/components/OptimizedLink'
import HeaderNavigation from '@/components/HeaderNavigation'
import FooterWrapper from '@/components/FooterWrapper'
import { getSiteTextConfig } from '@/lib/config'
import { getPublicConfig } from '@/app/actions/config'
import { formatDate } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Privacy Policy | Bring Me Home',
  description: 'Our privacy policy explaining how we collect, use, and protect your personal information in compliance with applicable laws.',
}

export default async function PrivacyPolicyPage() {
  const session = await getServerSession(authOptions)
  const config = await getSiteTextConfig()
  const publicConfig = await getPublicConfig()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Link href="/" className="text-3xl font-bold text-gray-900 hover:text-gray-700 transition-colors">
                {config.site_title || 'Bring Me Home'}
              </Link>
            </div>
            <HeaderNavigation user={session?.user || null} />
          </div>
        </div>
      </header>

      {/* Privacy Policy Content */}
      <main className="bg-indigo-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-lg shadow-lg p-8 md:p-12">
            {/* Back to Home Link */}
            <div className="mb-6">
              <Link href="/" className="text-indigo-600 hover:text-indigo-500 font-medium flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Home
              </Link>
            </div>

            <h1 className="text-4xl font-bold mb-8 text-center text-gray-900">Privacy Policy</h1>

      <div className="prose prose-lg max-w-none">
        <section className="mb-8">
          <p className="text-lg mb-6">
            We respect your privacy and are committed to protecting your personal information. This Privacy Policy
            explains how we collect, use, and safeguard your data in compliance with applicable laws.
          </p>
          <p className="text-sm text-gray-600 mb-6">
            Last updated: {formatDate(new Date())}
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Information We Collect</h2>
          <p className="mb-4">
            We collect information you provide directly to us, such as:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Account Information:</strong> Name, email address, username, and password</li>
            <li><strong>Profile Information:</strong> Photos, biographical details, and personal stories</li>
            <li><strong>User Content:</strong> Comments, messages, and support statements you post</li>
            <li><strong>Contact Information:</strong> When you contact us for support or inquiries</li>
          </ul>
          <p className="mt-4">
            We also automatically collect certain information when you use our platform:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Technical Data:</strong> IP address, browser type, device information</li>
            <li><strong>Usage Data:</strong> Pages visited, features used, time spent on the platform</li>
            <li><strong>Cookies:</strong> Small files to remember your preferences and improve your experience</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">How We Use Your Information</h2>
          <p className="mb-4">
            We use the information we collect to:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Provide, maintain, and improve our services</li>
            <li>Create and manage your account</li>
            <li>Communicate with you about updates, features, and support</li>
            <li>Ensure the safety and security of our platform</li>
            <li>Comply with legal obligations and respond to lawful requests</li>
            <li>Analyze usage patterns to improve user experience</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">How We Protect Your Information</h2>
          <p className="mb-4">
            We implement industry-standard security measures to protect your personal information:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Encryption of data in transit and at rest</li>
            <li>Secure servers and data storage facilities</li>
            <li>Limited access to personal information on a need-to-know basis</li>
            <li>Regular security assessments and updates</li>
            <li>Employee training on data protection and privacy</li>
          </ul>
          <p className="mt-4">
            While we strive to protect your personal information, no method of transmission over the internet
            is 100% secure. We cannot guarantee absolute security but we work hard to protect your data.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Information Sharing</h2>
          <p className="mb-4">
            We do not sell, trade, or rent your personal information. We may share your information only in
            the following circumstances:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>With Your Consent:</strong> When you explicitly agree to share information</li>
            <li><strong>Service Providers:</strong> With trusted partners who help us operate our platform</li>
            <li><strong>Legal Requirements:</strong> When required by law or to respond to legal process</li>
            <li><strong>Protection of Rights:</strong> To protect our rights, safety, or property</li>
            <li><strong>Aggregated Data:</strong> Non-identifiable data for research or analysis</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Your Rights and Choices</h2>
          <p className="mb-4">
            You have the following rights regarding your personal information:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Access:</strong> Request a copy of the personal information we have about you</li>
            <li><strong>Correction:</strong> Update or correct inaccurate information</li>
            <li><strong>Deletion:</strong> Request deletion of your account and personal information</li>
            <li><strong>Opt-Out:</strong> Unsubscribe from marketing communications</li>
            <li><strong>Data Portability:</strong> Receive your data in a portable format</li>
          </ul>
          <p className="mt-4">
            To exercise any of these rights, please contact us at {publicConfig.application.privacyEmail}
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Data Retention</h2>
          <p className="mb-4">
            We retain your personal information for as long as necessary to:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Provide our services to you</li>
            <li>Comply with legal obligations</li>
            <li>Resolve disputes and enforce agreements</li>
            <li>Support business operations and improvements</li>
          </ul>
          <p className="mt-4">
            When you delete your account, we will delete or anonymize your personal information, except
            where we are required to retain it by law.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Children&apos;s Privacy</h2>
          <p>
            Our platform is not intended for children under 13 years of age. We do not knowingly collect
            personal information from children under 13. If we learn we have collected information from a
            child under 13, we will delete it promptly.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Legal Compliance</h2>
          <div className="bg-gray-100 p-6 rounded-lg">
            <p className="font-semibold mb-2">Our Commitment to Legal Compliance:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>We comply with applicable data protection laws</li>
              <li>We respond to lawful requests from authorities</li>
              <li>We notify users of data breaches as required by law</li>
              <li>We respect international data protection standards</li>
            </ul>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time to reflect changes in our practices or
            legal requirements. We will notify you of any material changes by posting the new policy on
            this page and updating the &ldquo;Last updated&rdquo; date.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
          <p className="mb-4">
            If you have any questions about this Privacy Policy or our data practices, please contact us:
          </p>
          <div className="bg-gray-100 p-6 rounded-lg">
            <p><strong>Email:</strong> {publicConfig.application.privacyEmail}</p>
            <p><strong>Address:</strong> [To be provided]</p>
            <p><strong>Response Time:</strong> We aim to respond within 30 days</p>
          </div>
        </section>

        <section className="mb-8 border-t pt-8">
          <p className="text-sm text-gray-600">
            By using our platform, you agree to the collection and use of information in accordance with
            this Privacy Policy. Your continued use of our services after any changes to this policy will
            constitute your acknowledgment of the changes and consent to abide by the updated policy.
          </p>
        </section>
      </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <FooterWrapper />
    </div>
  )
}