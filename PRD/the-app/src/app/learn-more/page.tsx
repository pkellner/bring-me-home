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
              <Link href="/" className="group flex items-center">
                <h1 className="text-3xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                  {config.site_title || 'Bring Me Home'}
                </h1>
              </Link>
            </div>
            <HeaderNavigation user={session?.user || null} />
          </div>
        </div>
      </header>

      {/* Navigation Bar */}
      <div className="bg-indigo-600">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center space-x-8 py-3">
            <Link 
              href="/" 
              className="text-white hover:text-indigo-200 transition-colors flex items-center group"
            >
              <svg className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Home
            </Link>
            <span className="text-indigo-300">•</span>
            <Link 
              href="/show-your-support" 
              className="text-white hover:text-indigo-200 transition-colors"
            >
              Show Your Support
            </Link>
            <span className="text-indigo-300">•</span>
            <span className="text-indigo-200 font-medium">
              Learn More
            </span>
          </div>
        </div>
      </div>

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
              The platform works to humanize and support individuals in detention by creating profiles that share their stories, maintaining connections with their communities, and building networks of support that can make a real difference in their cases and their families&apos; lives.
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
                  Stories and information can be presented in multiple languages, ensuring that language barriers don&apos;t prevent families and supporters from accessing important information or sharing their messages of support.
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
              <li><strong>Photo Galleries:</strong> Share multiple photos to help tell each person&apos;s story</li>
              <li><strong>Family Updates:</strong> Families can share updates about their loved one&apos;s situation</li>
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

            {/* How Families Can Participate Section */}
            <div className="mt-16 pt-16 border-t-2 border-gray-200">
              <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">How Families Can Participate</h2>
              
              <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-8 mb-12 shadow-inner">
                <p className="text-lg text-gray-800 leading-relaxed">
                  Bring Me Home empowers families to actively manage their loved one&apos;s presence on the platform through a comprehensive administrative system. Families receive special access that allows them to moderate community support, view private messages, and ensure their loved one&apos;s story is told with dignity and accuracy.
                </p>
              </div>

              {/* Family Admin Dashboard */}
              <div className="mb-16">
                <div className="flex flex-col lg:flex-row gap-8 items-center">
                  <div className="lg:w-1/2">
                    <h4 className="text-2xl font-bold text-gray-900 mb-4">Family Admin Dashboard</h4>
                    <p className="text-gray-700 mb-4">
                      Each family receives a personalized admin dashboard that serves as their command center. Here, families can see at a glance how many people have expressed support for their loved one and quickly access all pending comments that need review. The dashboard is designed to be intuitive and easy to navigate, even for those who aren&apos;t tech-savvy.
                    </p>
                    <p className="text-gray-700">
                      The dashboard shows your role as &quot;person-admin&quot; which gives you full control over your loved one&apos;s profile, including the ability to approve or reject comments, update information, and communicate privately with supporters.
                    </p>
                  </div>
                  <div className="lg:w-1/2">
                    <div className="rounded-xl shadow-2xl overflow-hidden border-2 border-gray-200">
                      <img 
                        src="/images/learn-more/2025-07-19_06-01-06.png" 
                        alt="Family Admin Dashboard showing person-admin role and quick access to comments"
                        className="w-full h-auto"
                      />
                    </div>
                    <p className="text-sm text-gray-600 mt-3 text-center italic">
                      Family Admin Dashboard - Your central hub for managing support
                    </p>
                  </div>
                </div>
              </div>

              {/* Comment Management */}
              <div className="mb-16">
                <div className="flex flex-col lg:flex-row-reverse gap-8 items-center">
                  <div className="lg:w-1/2">
                    <h4 className="text-2xl font-bold text-gray-900 mb-4">Managing Community Comments</h4>
                    <p className="text-gray-700 mb-4">
                      The comments management interface gives families complete oversight of all messages left by supporters. You can view all comments in one organized list, see who left each message, and quickly identify which ones are awaiting your approval. Comments marked &quot;Wants to help&quot; indicate supporters who are willing to provide letters of support or other assistance.
                    </p>
                    <p className="text-gray-700">
                      This system ensures that only appropriate, supportive messages appear publicly on your loved one&apos;s profile. You maintain full control over what the community sees, protecting your family&apos;s privacy while building a network of support.
                    </p>
                  </div>
                  <div className="lg:w-1/2">
                    <div className="rounded-xl shadow-2xl overflow-hidden border-2 border-gray-200">
                      <img 
                        src="/images/learn-more/2025-07-19_06-01-35.png" 
                        alt="Comment management interface showing list of pending and approved comments"
                        className="w-full h-auto"
                      />
                    </div>
                    <p className="text-sm text-gray-600 mt-3 text-center italic">
                      Review and approve community messages with full transparency
                    </p>
                  </div>
                </div>
              </div>

              {/* Comment Moderation Modal */}
              <div className="mb-16">
                <div className="flex flex-col lg:flex-row gap-8 items-center">
                  <div className="lg:w-1/2">
                    <h4 className="text-2xl font-bold text-gray-900 mb-4">Detailed Comment Moderation</h4>
                    <p className="text-gray-700 mb-4">
                      When reviewing individual comments, families access a comprehensive moderation interface. Here you can see complete commenter information, read their full message, and control exactly what information is displayed publicly. The yellow-highlighted &quot;Requires family approval&quot; indicator shows that you have the final say on what appears on the profile.
                    </p>
                    <p className="text-gray-700 mb-4">
                      <strong>Private Notes Feature:</strong> One of the most powerful features is the ability for supporters to send private notes directly to the family. These messages never appear publicly but provide a channel for more personal communications, legal support offers, or sensitive information that families need to see.
                    </p>
                    <p className="text-gray-700">
                      The moderation panel also allows you to control privacy settings, add internal notes for your records, and make informed decisions about each message with full context.
                    </p>
                  </div>
                  <div className="lg:w-1/2">
                    <div className="rounded-xl shadow-2xl overflow-hidden border-2 border-gray-200">
                      <img 
                        src="/images/learn-more/2025-07-19_06-04-36.png" 
                        alt="Comment moderation modal showing detailed commenter information and privacy controls"
                        className="w-full h-auto"
                      />
                    </div>
                    <p className="text-sm text-gray-600 mt-3 text-center italic">
                      Complete control over comment visibility and privacy settings
                    </p>
                  </div>
                </div>
              </div>

              {/* Public View */}
              <div className="mb-16">
                <div className="flex flex-col lg:flex-row-reverse gap-8 items-center">
                  <div className="lg:w-1/2">
                    <h4 className="text-2xl font-bold text-gray-900 mb-4">Building Community Support</h4>
                    <p className="text-gray-700 mb-4">
                      Once approved, messages of support appear on your loved one&apos;s public profile, creating a powerful visual representation of community backing. The support map shows geographic distribution of supporters, while the comment section displays heartfelt messages from community members.
                    </p>
                    <p className="text-gray-700 mb-4">
                      This public display serves multiple purposes: it boosts morale for detained individuals who can see community support, it demonstrates to legal authorities the strong community ties, and it encourages more people to add their voices to the chorus of support.
                    </p>
                    <p className="text-gray-700">
                      The platform tracks both public messages and anonymous support, giving you a complete picture of how many people stand with your family during this difficult time.
                    </p>
                  </div>
                  <div className="lg:w-1/2">
                    <div className="rounded-xl shadow-2xl overflow-hidden border-2 border-gray-200">
                      <img 
                        src="/images/learn-more/2025-07-19_06-06-07.png" 
                        alt="Public view showing community support map and messages"
                        className="w-full h-auto"
                      />
                    </div>
                    <p className="text-sm text-gray-600 mt-3 text-center italic">
                      Visual representation of nationwide community support
                    </p>
                  </div>
                </div>
              </div>

              {/* Town Admin Section */}
              <div className="bg-gray-50 rounded-xl p-8 mb-12">
                <h4 className="text-2xl font-bold text-gray-900 mb-4">Town Administrator Role</h4>
                <p className="text-gray-700 mb-4">
                  For communities with multiple detained individuals, Town Administrators play a crucial supportive role. These trusted community members can help manage profiles when families need assistance or when coordinating support for multiple people becomes overwhelming.
                </p>
                <div className="grid md:grid-cols-2 gap-6 mt-6">
                  <div className="bg-white rounded-lg p-6 shadow-md">
                    <h5 className="font-semibold text-gray-900 mb-2">Town Admin Capabilities:</h5>
                    <ul className="list-disc pl-5 text-gray-700 space-y-1">
                      <li>Review and approve community comments</li>
                      <li>Update basic profile information</li>
                      <li>Coordinate support across multiple profiles</li>
                      <li>Assist families with technical aspects</li>
                      <li>Generate reports for legal teams</li>
                    </ul>
                  </div>
                  <div className="bg-white rounded-lg p-6 shadow-md">
                    <h5 className="font-semibold text-gray-900 mb-2">Family-Only Privileges:</h5>
                    <ul className="list-disc pl-5 text-gray-700 space-y-1">
                      <li>Access to private family notes</li>
                      <li>Final approval on sensitive content</li>
                      <li>Direct communication with supporters</li>
                      <li>Personal story editing rights</li>
                      <li>Privacy setting controls</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* How to Get Started */}
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white shadow-xl">
                <h4 className="text-2xl font-bold mb-6 text-center">How to Register Your Loved One</h4>
                <div className="max-w-3xl mx-auto">
                  <div className="space-y-6">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-4">
                        <span className="text-xl font-bold">1</span>
                      </div>
                      <div>
                        <h5 className="font-semibold text-lg mb-1">Create Your Account</h5>
                        <p className="text-indigo-100">
                          Start by registering for a free account on Bring Me Home. This will be your family&apos;s administrative account for managing your loved one&apos;s profile.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="flex-shrink-0 w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-4">
                        <span className="text-xl font-bold">2</span>
                      </div>
                      <div>
                        <h5 className="font-semibold text-lg mb-1">Submit Profile Request</h5>
                        <p className="text-indigo-100">
                          Send an email to{' '}
                          <a href="mailto:help-me-list-someone@bring-me-home.com" className="text-white underline hover:text-indigo-200">
                            help-me-list-someone@bring-me-home.com
                          </a>
                          {' '}with your loved one&apos;s information, including their name, detention location, and a brief story.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="flex-shrink-0 w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-4">
                        <span className="text-xl font-bold">3</span>
                      </div>
                      <div>
                        <h5 className="font-semibold text-lg mb-1">Receive Admin Access</h5>
                        <p className="text-indigo-100">
                          Our team will create the profile and grant you family administrator access. You&apos;ll receive instructions on how to access your dashboard and begin managing community support.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-8 text-center">
                    <p className="text-lg font-medium mb-4">
                      Every family deserves support. Every story deserves to be heard.
                    </p>
                    <a
                      href="mailto:help-me-list-someone@bring-me-home.com"
                      className="inline-block bg-white text-indigo-600 px-8 py-3 rounded-full font-semibold hover:bg-indigo-50 transition-colors shadow-lg"
                    >
                      Get Started Today
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-16 p-6 bg-indigo-50 rounded-lg">
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