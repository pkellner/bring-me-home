'use client';

interface VisibilitySettingsProps {
  person?: {
    showDetentionInfo?: boolean | null;
    showLastHeardFrom?: boolean | null;
    showDetentionDate?: boolean | null;
    showCommunitySupport?: boolean | null;
  };
}

export default function VisibilitySettings({ person }: VisibilitySettingsProps) {
  return (
    <div className="border-t pt-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        Public Visibility Settings
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Control what information is visible to the public on the person&apos;s profile page.
      </p>

      <div className="space-y-4">
        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              type="checkbox"
              id="showDetentionInfo"
              name="showDetentionInfo"
              defaultChecked={person?.showDetentionInfo ?? true}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
          </div>
          <div className="ml-3">
            <label htmlFor="showDetentionInfo" className="text-sm font-medium text-gray-700">
              Show detention center information
            </label>
            <p className="text-sm text-gray-500">
              When checked, detention center details will be shown on the public profile
            </p>
          </div>
        </div>

        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              type="checkbox"
              id="showLastHeardFrom"
              name="showLastHeardFrom"
              defaultChecked={person?.showLastHeardFrom ?? true}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
          </div>
          <div className="ml-3">
            <label htmlFor="showLastHeardFrom" className="text-sm font-medium text-gray-700">
              Show &quot;Last Heard From&quot; information
            </label>
            <p className="text-sm text-gray-500">
              When checked, the last contact date will be shown publicly
            </p>
          </div>
        </div>

        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              type="checkbox"
              id="showDetentionDate"
              name="showDetentionDate"
              defaultChecked={person?.showDetentionDate ?? true}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
          </div>
          <div className="ml-3">
            <label htmlFor="showDetentionDate" className="text-sm font-medium text-gray-700">
              Show detention date
            </label>
            <p className="text-sm text-gray-500">
              When checked, the detention date will be shown publicly
            </p>
          </div>
        </div>

        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              type="checkbox"
              id="showCommunitySupport"
              name="showCommunitySupport"
              defaultChecked={person?.showCommunitySupport ?? true}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
          </div>
          <div className="ml-3">
            <label htmlFor="showCommunitySupport" className="text-sm font-medium text-gray-700">
              Show &quot;Community Support&quot; section
            </label>
            <p className="text-sm text-gray-500">
              When checked, the community comments section will be shown publicly
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}