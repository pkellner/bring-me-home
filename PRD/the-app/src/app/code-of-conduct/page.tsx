import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'
import HeaderNavigation from '@/components/HeaderNavigation'
import FooterWrapper from '@/components/FooterWrapper'
import { getSiteTextConfig } from '@/lib/config'

export const metadata: Metadata = {
  title: 'Code of Conduct | Bring Me Home',
  description: 'Our community guidelines for creating a safe, respectful, and inclusive environment for all participants.',
}

export default async function CodeOfConductPage() {
  const session = await getServerSession(authOptions)
  const config = await getSiteTextConfig()

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

      {/* Code of Conduct Content */}
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

            <h1 className="text-4xl font-bold mb-8 text-center text-gray-900">Code of Conduct</h1>
      
      <div className="prose prose-lg max-w-none">
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Our Commitment</h2>
          <p className="mb-4">
            We are committed to fostering an inclusive, respectful, and collaborative environment where all participants 
            can contribute meaningfully without fear of harassment or discrimination. This Code of Conduct outlines our 
            expectations for all those who participate in our community, as well as the consequences for unacceptable behavior.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Our Values</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold mb-2">Equality and Human Dignity</h3>
              <p>Every person has inherent worth and deserves to be treated with respect, regardless of their background, identity, or beliefs.</p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Justice Through Non-Violence</h3>
              <p>Conflicts and disagreements should be resolved through peaceful dialogue and understanding, never through aggression or retaliation.</p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Unity in Diversity</h3>
              <p>Our strength comes from bringing together people of different backgrounds, experiences, and perspectives in a spirit of collaboration.</p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Service to Community</h3>
              <p>We prioritize the collective good and work together to create positive change that benefits everyone.</p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Truth and Transparency</h3>
              <p>Honest, open communication builds trust and enables genuine progress.</p>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Expected Behaviors</h2>
          <h3 className="text-xl font-semibold mb-3">We Encourage:</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li>Using welcoming and inclusive language</li>
            <li>Being respectful of differing viewpoints and experiences</li>
            <li>Gracefully accepting constructive criticism</li>
            <li>Focusing on what is best for the community</li>
            <li>Showing empathy towards other community members</li>
            <li>Asking questions to understand, not to attack</li>
            <li>Helping newcomers feel welcome and supported</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Unacceptable Behaviors</h2>
          <h3 className="text-xl font-semibold mb-3">Zero Tolerance for:</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Hate Speech:</strong> Any content that attacks, threatens, or demeans people based on race, ethnicity, national origin, 
            religious affiliation, gender identity, sexual orientation, disability, age, or any other protected characteristic</li>
            <li><strong>Personal Attacks:</strong> Direct insults, derogatory comments, doxxing, threats of violence, harassment, or unwelcome advances</li>
            <li><strong>Discrimination:</strong> Exclusion based on identity, creating hostile environments, using slurs, or denying others&apos; lived experiences</li>
            <li><strong>Disruptive Conduct:</strong> Trolling, spamming, derailing conversations, or impersonating others</li>
            <li><strong>Harmful Content:</strong> Sharing malicious code, inappropriate imagery, misinformation, or violating privacy</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Reporting Violations</h2>
          <p className="mb-4">
            If you witness or experience behavior that violates this Code of Conduct, please report it immediately:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Use the report feature available on the platform</li>
            <li>Email us at: conduct@bringmehome.org</li>
            <li>Contact any moderator directly</li>
            <li>Anonymous reporting is available and encouraged</li>
          </ul>
          <p className="mt-4">
            All reports will be reviewed and investigated promptly and fairly. We are committed to protecting the 
            confidentiality and safety of those who report violations.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Enforcement</h2>
          <p className="mb-4">
            Violations of this Code of Conduct may result in the following actions:
          </p>
          <ol className="list-decimal pl-6 space-y-2">
            <li><strong>Warning:</strong> A private message explaining the violation and expected behavior</li>
            <li><strong>Temporary Suspension:</strong> Temporary restriction from community features (24 hours to 7 days)</li>
            <li><strong>Extended Suspension:</strong> Longer suspension with required acknowledgment before return (7-30 days)</li>
            <li><strong>Permanent Ban:</strong> Permanent removal from the community for severe or repeated violations</li>
          </ol>
          <p className="mt-4">
            The severity of the action depends on the nature and pattern of violations. We apply these measures 
            consistently and fairly, with the goal of protecting our community while allowing for growth and learning.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Appeals Process</h2>
          <p className="mb-4">
            If you believe an enforcement action was taken in error, you may appeal:
          </p>
          <ol className="list-decimal pl-6 space-y-2">
            <li>Submit your appeal within 30 days of the action</li>
            <li>A different reviewer will examine your case</li>
            <li>You will receive a decision within 14 days</li>
            <li>One appeal is allowed per enforcement action</li>
          </ol>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Scope</h2>
          <p className="mb-4">
            This Code of Conduct applies to all community spaces, including:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>All platform features (comments, messages, profiles)</li>
            <li>Community events (virtual and in-person)</li>
            <li>Social media and external communications</li>
            <li>Any space where community members interact</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Conclusion</h2>
          <p className="mb-4">
            By participating in our community, you agree to abide by this Code of Conduct. We believe that by working 
            together with mutual respect and understanding, we can create a community that brings out the best in all 
            of us and demonstrates the power of people working together across differences toward shared goals.
          </p>
          <p className="mb-4">
            Thank you for helping us create a welcoming, inclusive, and productive community for everyone.
          </p>
        </section>

        <section className="mb-8 border-t pt-8">
          <p className="text-sm text-gray-600">
            Last updated: {new Date().toLocaleDateString()}
          </p>
          <p className="text-sm text-gray-600 mt-2">
            This Code of Conduct is a living document and may be updated periodically to better serve our community.
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