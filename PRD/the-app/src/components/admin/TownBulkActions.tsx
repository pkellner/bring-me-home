'use client';

interface TownBulkActionsProps {
  onSetAllVisible: () => void;
  onSetAllInvisible: () => void;
  groupByState: boolean;
  onGroupByStateChange: (checked: boolean) => void;
  disabled?: boolean;
}

export default function TownBulkActions({
  onSetAllVisible,
  onSetAllInvisible,
  groupByState,
  onGroupByStateChange,
  disabled = false
}: TownBulkActionsProps) {
  return (
    <div className="flex items-center justify-between mb-4 p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-3">
        <button
          onClick={onSetAllVisible}
          disabled={disabled}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Set All Visible
        </button>
        <button
          onClick={onSetAllInvisible}
          disabled={disabled}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Set All Invisible
        </button>
      </div>
      
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={groupByState}
          onChange={(e) => onGroupByStateChange(e.target.checked)}
          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
        />
        <span className="text-sm font-medium text-gray-700">Group By State</span>
      </label>
    </div>
  );
}