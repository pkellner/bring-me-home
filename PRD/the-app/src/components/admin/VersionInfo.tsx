'use client';

import { useReleaseInfo } from '@/contexts/EnvironmentContext';

export default function VersionInfo() {
  const { version, date } = useReleaseInfo();

  if (!version || version === '0') {
    return null;
  }

  return (
    <div className="text-xs text-gray-500">
      <div>Version: {version}</div>
      {date && <div>Released: {date}</div>}
    </div>
  );
}

export function VersionBadge() {
  const { version } = useReleaseInfo();

  if (!version || version === '0') {
    return null;
  }

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
      v{version}
    </span>
  );
}
