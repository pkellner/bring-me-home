'use client';

import ShareButtons from '@/components/ShareButtons';
import { useAppUrl } from '@/contexts/EnvironmentContext';

interface ShareSectionProps {
  townSlug: string;
  personSlug: string;
  personFirstName: string;
  personLastName: string;
  townName: string;
  townState: string;
}

export default function ShareSection({
  townSlug,
  personSlug,
  personFirstName,
  personLastName,
  townName,
  townState,
}: ShareSectionProps) {
  const appUrl = useAppUrl();

  const fullUrl = `${appUrl}/${townSlug}/${personSlug}`;
  const title = `Help find ${personFirstName} ${personLastName}`;
  const description = `${personFirstName} ${personLastName} from ${townName}, ${townState} needs your help. Share this profile to spread awareness.`;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        Share This Profile
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Help spread the word about {personFirstName} by sharing this profile.
      </p>
      <ShareButtons url={fullUrl} title={title} description={description} />
    </div>
  );
}
