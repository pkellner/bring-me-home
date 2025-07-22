'use client';

import { useState, useEffect } from 'react';
import { ArrowPathIcon, TrashIcon } from '@heroicons/react/24/outline';

type HitData = {
  url: string;
  lastMinute: number;
  last5Minutes: number;
  last60Minutes: number;
  total: number;
  firstHit: string;
  lastHit: string;
};

type HitStats = {
  stats: HitData[];
  uptime: string;
  generatedAt: string;
};

export default function ImageHitStatsSection() {
  const [stats, setStats] = useState<HitStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/image-hits');
      if (!response.ok) {
        throw new Error('Failed to fetch image hit statistics');
      }
      
      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const resetStats = async () => {
    if (typeof window !== 'undefined' && !confirm('Are you sure you want to reset all image hit statistics? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/image-hits', { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('Failed to reset statistics');
      }
      
      // Refresh stats after reset
      await fetchStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (!stats && !loading && !error) {
    return null;
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const formatUrl = (url: string) => {
    // Truncate long URLs for better display
    if (url.length > 60) {
      return url.substring(0, 57) + '...';
    }
    return url;
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-gray-900">
          Image API Hit Statistics
        </h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={fetchStats}
            disabled={loading}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowPathIcon className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={resetStats}
            disabled={loading}
            className="inline-flex items-center px-3 py-1.5 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <TrashIcon className="h-4 w-4 mr-1.5" />
            Reset
          </button>
        </div>
      </div>
      
      <div className="bg-gray-50 rounded-lg p-4">
        {error ? (
          <div className="text-red-600 text-sm">{error}</div>
        ) : loading && !stats ? (
          <div className="text-gray-500 text-sm">Loading statistics...</div>
        ) : stats ? (
          <div className="space-y-4">
            {/* Summary */}
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Tracking since: {stats.uptime} ago</span>
              <span>Last updated: {formatDate(stats.generatedAt)}</span>
            </div>

            {/* Statistics Table */}
            {stats.stats.length === 0 ? (
              <p className="text-sm text-gray-500">No image hits recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        URL
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        1 Min
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        5 Min
                      </th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        60 Min
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        First Hit
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Hit
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {stats.stats.map((hit, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-sm text-gray-900 font-mono" title={hit.url}>
                          {formatUrl(hit.url)}
                        </td>
                        <td className="px-3 py-2 text-sm text-center font-semibold text-gray-900">
                          {hit.total.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-sm text-center text-gray-600">
                          {hit.lastMinute > 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              {hit.lastMinute}
                            </span>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-sm text-center text-gray-600">
                          {hit.last5Minutes > 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              {hit.last5Minutes}
                            </span>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-sm text-center text-gray-600">
                          {hit.last60Minutes > 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                              {hit.last60Minutes}
                            </span>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-500">
                          {new Date(hit.firstHit).toLocaleTimeString()}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-500">
                          {new Date(hit.lastHit).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Legend */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                <strong>Note:</strong> Hit counts show requests to /api/images/[id] endpoint with query parameters. 
                Statistics reset on server restart. Only visible to site administrators.
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}