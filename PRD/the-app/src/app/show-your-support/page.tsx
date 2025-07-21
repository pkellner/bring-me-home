import Link from '@/components/OptimizedLink';
import { getSiteTextConfig } from '@/lib/config';
import HeaderNavigation from '@/components/HeaderNavigation';
import FooterWrapper from '@/components/FooterWrapper';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export default async function ShowYourSupportPage() {
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
            <span className="text-indigo-200 font-medium">
              Show Your Support
            </span>
            <span className="text-indigo-300">•</span>
            <Link 
              href="/learn-more" 
              className="text-white hover:text-indigo-200 transition-colors"
            >
              Learn More
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Show Your Support</h2>
          
          <div className="prose prose-lg max-w-none text-gray-700">
            <p className="lead">
              Bring Me Home provides multiple ways for community members to show their support for detained individuals and their families. Every action, no matter how small, can make a meaningful difference.
            </p>

            <h3 className="text-xl font-semibold mt-8 mb-4">Ways to Show Support</h3>
            
            <div className="space-y-6">
              <div className="bg-indigo-50 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-indigo-900 mb-2">Leave a Message of Support</h4>
                <p className="text-gray-700">
                  The platform allows visitors to leave personal messages for detained individuals and their families. These messages provide emotional support and demonstrate community solidarity. Users can include their name, occupation, and location to show the breadth of support, or choose to remain anonymous.
                </p>
              </div>

              <div className="bg-purple-50 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-purple-900 mb-2">Anonymous Support Option</h4>
                <p className="text-gray-700">
                  For those who prefer privacy, the site offers a quick anonymous support feature. With just one click, supporters can register their solidarity without providing any personal information. The platform tracks and displays the total number of supporters, creating a powerful visual representation of community backing.
                </p>
              </div>

              <div className="bg-blue-50 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-blue-900 mb-2">Private Notes to Families</h4>
                <p className="text-gray-700">
                  When leaving a message, supporters can include private notes that are only visible to the detained person&apos;s family and administrators. This feature allows for more personal or sensitive communications while maintaining public support visibility.
                </p>
              </div>

              <div className="bg-green-50 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-green-900 mb-2">Interactive Support Map</h4>
                <p className="text-gray-700">
                  The platform features an interactive map showing where support is coming from across the country. Each message or anonymous support action is represented on the map, creating a powerful visualization of nationwide solidarity. This helps families see that their loved ones are not forgotten.
                </p>
              </div>
            </div>

            <h3 className="text-xl font-semibold mt-8 mb-4">How Your Support Helps</h3>
            
            <ul className="list-disc pl-6 space-y-2">
              <li>Provides emotional comfort to detained individuals and their families</li>
              <li>Demonstrates to authorities the community ties waiting for the person&apos;s return</li>
              <li>Creates documentation of public support that may be helpful in legal proceedings</li>
              <li>Builds a network of caring individuals who can provide additional assistance</li>
              <li>Raises awareness about detention issues in local communities</li>
            </ul>

            <h3 className="text-xl font-semibold mt-8 mb-4">Privacy and Safety</h3>
            
            <p>
              The platform takes privacy seriously. All messages are moderated before appearing publicly, and users have complete control over what information they share. The anonymous support option ensures that everyone can participate regardless of their personal circumstances.
            </p>

            <div className="mt-8 p-6 bg-gray-50 rounded-lg">
              <p className="text-center text-gray-700 mb-4">
                Ready to make a difference? Visit any detained person&apos;s profile to show your support.
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