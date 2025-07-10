'use client';

interface Town {
  id: string;
  name: string;
  state: string;
}

interface CommentBulkActionsProps {
  onApproveAll: () => void;
  onRejectAll: () => void;
  groupByPerson: boolean;
  onGroupByPersonChange: (checked: boolean) => void;
  selectedTownId: string;
  onTownChange: (townId: string) => void;
  towns: Town[];
  disabled?: boolean;
}

export default function CommentBulkActions({
  onApproveAll,
  onRejectAll,
  groupByPerson,
  onGroupByPersonChange,
  selectedTownId,
  onTownChange,
  towns,
  disabled = false,
}: CommentBulkActionsProps) {
  return (
    <div className="mb-4 space-y-4">
      {/* Town Filter */}
      <div className="flex items-center gap-4">
        <label
          htmlFor="town-filter"
          className="text-sm font-medium text-gray-700"
        >
          Filter by Town:
        </label>
        <select
          id="town-filter"
          value={selectedTownId}
          onChange={e => onTownChange(e.target.value)}
          className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        >
          <option value="">All Towns</option>
          {towns.map(town => (
            <option key={town.id} value={town.id}>
              {town.name}, {town.state}
            </option>
          ))}
        </select>
      </div>

      {/* Bulk Actions and Group By */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={onApproveAll}
            disabled={disabled}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Approve All
          </button>
          <button
            onClick={onRejectAll}
            disabled={disabled}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Reject All
          </button>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={groupByPerson}
            onChange={e => onGroupByPersonChange(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-700">
            Group By Person
          </span>
        </label>
      </div>
    </div>
  );
}
