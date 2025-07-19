import Link from 'next/link';
import { getSiteTextConfig } from '@/lib/config';
import HeaderNavigation from '@/components/HeaderNavigation';
import FooterWrapper from '@/components/FooterWrapper';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export default async function LearnMorePage() {
  const session = await getServerSession(authOptions);
  const config = await getSiteTextConfig();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold text-gray-900">
                {config.site_title || 'Bring Me Home'}
              </h1>
            </div>
            <HeaderNavigation user={session?.user || null} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Learn More About Bring Me Home</h2>
          
          <div className="prose prose-lg max-w-none text-gray-700">
            <p className="lead">
              Bring Me Home is a community-driven platform dedicated to reuniting detained individuals with their families through advocacy, support, and connection. The platform serves as a bridge between those in detention, their loved ones, and supportive community members.
            </p>

            <h3 className="text-xl font-semibold mt-8 mb-4">Our Mission</h3>
            
            <p>
              The platform works to humanize and support individuals in detention by creating profiles that share their stories, maintaining connections with their communities, and building networks of support that can make a real difference in their cases and their families' lives.
            </p>

            <h3 className="text-xl font-semibold mt-8 mb-4">How the Platform Works</h3>
            
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Community-Based Organization</h4>
                <p>
                  The platform is organized by communities and towns. Each participating community can create profiles for detained individuals from their area, ensuring local connections and support remain strong. This decentralized approach allows communities to take ownership of supporting their neighbors.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Detailed Personal Profiles</h4>
                <p>
                  Each detained person has a comprehensive profile that includes their photo, personal story, family situation, and detention information. These profiles help visitors understand the human impact of detention and create emotional connections that inspire action.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Multi-Language Support</h4>
                <p>
                  Stories and information can be presented in multiple languages, ensuring that language barriers don't prevent families and supporters from accessing important information or sharing their messages of support.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Legal and Detention Information</h4>
                <p>
                  The platform can display important legal information such as case numbers, bond amounts, court dates, and legal representation status. This transparency helps coordinate support efforts and ensures families have access to critical information.
                </p>
              </div>
            </div>

            <h3 className="text-xl font-semibold mt-8 mb-4">Key Features</h3>
            
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Message System:</strong> Leave public messages of support or private notes for families</li>
              <li><strong>Anonymous Support:</strong> Show solidarity without revealing personal information</li>
              <li><strong>Support Mapping:</strong> Visualize nationwide support through interactive maps</li>
              <li><strong>Photo Galleries:</strong> Share multiple photos to help tell each person's story</li>
              <li><strong>Family Updates:</strong> Families can share updates about their loved one's situation</li>
              <li><strong>Community Moderation:</strong> Ensure all content is appropriate and supportive</li>
              <li><strong>Privacy Controls:</strong> Comprehensive options for controlling information visibility</li>
              <li><strong>Mobile Responsive:</strong> Access the platform from any device</li>
            </ul>

            <h3 className="text-xl font-semibold mt-8 mb-4">Who Can Participate</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">Community Members</h4>
                <p className="text-sm">Anyone can visit profiles, leave messages of support, and help raise awareness</p>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">Families</h4>
                <p className="text-sm">Family members can work with administrators to create and update profiles</p>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">Organizations</h4>
                <p className="text-sm">Advocacy groups can help manage town profiles and coordinate support</p>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">Legal Teams</h4>
                <p className="text-sm">Attorneys can use documented community support in legal proceedings</p>
              </div>
            </div>

            <h3 className="text-xl font-semibold mt-8 mb-4">Making a Difference</h3>
            
            <p>
              Every interaction on the platform contributes to a larger movement of support. Whether leaving a message, showing anonymous support, or simply sharing a profile with others, each action helps demonstrate that detained individuals have strong community ties and are valued members of society who deserve to come home.
            </p>

            <div className="mt-8 p-6 bg-indigo-50 rounded-lg">
              <p className="text-center text-gray-700 mb-4">
                Join us in bringing families back together. Every voice matters.
              </p>
              <div className="text-center">
                <Link
                  href="/"
                  className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-md font-medium hover:bg-indigo-700 transition-colors"
                >
                  Return to Home Page
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <FooterWrapper />
    </div>
  );
}