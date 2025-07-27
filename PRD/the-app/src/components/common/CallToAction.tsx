import Link from '@/components/OptimizedLink';

interface CallToActionProps {
  config: {
    town_info_title?: string;
    town_info_text?: string;
    town_info_button?: string;
    view_other_towns_text?: string;
    homepage_cta_title?: string;
    homepage_cta_text?: string;
    homepage_cta_button?: string;
  };
  variant?: 'town' | 'homepage';
  className?: string;
}

export default function CallToAction({
  config,
  variant = 'town',
  className = ''
}: CallToActionProps) {
  const isTown = variant === 'town';

  const title = isTown
    ? (config.town_info_title || 'Want to Help?')
    : (config.homepage_cta_title || 'How You Can Help');

  const text = isTown
    ? (config.town_info_text || 'If you know someone who has been detained or want to show support for those already in the system, please add your voice. Community support can make a real difference in immigration proceedings.')
    : (config.homepage_cta_text || 'Every voice matters. By showing your support for detained individuals, you help demonstrate to authorities the community ties and support system waiting for their return.');

  const buttonText = isTown
    ? (config.town_info_button || 'Add Your Support')
    : (config.homepage_cta_button || 'Show Your Support');

  return (
    <div className={`bg-white rounded-lg shadow p-8 text-center ${className}`}>
      <h3 className="text-2xl font-bold text-gray-900 mb-4">
        {title}
      </h3>
      <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
        {text}
      </p>
      <div className="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
        {isTown ? (
          <>
            {/*<button className="w-full sm:w-auto bg-indigo-600 text-white px-6 py-3 rounded-md font-medium hover:bg-indigo-700">*/}
            {/*  {buttonText}*/}
            {/*</button>*/}
            <Link
              href="/"
              className="w-full sm:w-auto inline-block border border-gray-300 text-gray-700 px-6 py-3 rounded-md font-medium hover:bg-gray-50"
            >
              {config.view_other_towns_text || 'View Other Towns'}
            </Link>
          </>
        ) : (
          <Link
            href="/show-your-support"
            className="block w-full sm:w-auto bg-indigo-600 text-white px-6 py-3 rounded-md font-medium hover:bg-indigo-700 text-center"
          >
            {buttonText}
          </Link>
        )}
        <Link
          href="/learn-more"
          className="block w-full sm:w-auto border border-gray-300 text-gray-700 px-6 py-3 rounded-md font-medium hover:bg-gray-50 text-center"
        >
          Learn More
        </Link>
      </div>
    </div>
  );
}