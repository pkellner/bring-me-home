'use client';

import { useEffect, useState } from 'react';

interface SupportStatsProps {
  personId: string;
}

interface Stats {
  anonymousSupport: {
    total: number;
    last24Hours: number;
  };
  messages: {
    total: number;
    last24Hours: number;
  };
}

export default function SupportStats({ personId }: SupportStatsProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`/api/persons/${personId}/support`);
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error('Error fetching support stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    
    // Listen for support added events
    const handleSupportAdded = () => {
      fetchStats();
    };
    window.addEventListener('supportAdded', handleSupportAdded);
    
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('supportAdded', handleSupportAdded);
    };
  }, [personId]);

  if (loading || !stats) {
    return (
      <div className="mb-6 animate-pulse">
        <div className="bg-gray-100 rounded-lg p-4 h-24"></div>
      </div>
    );
  }

  const totalSupport = stats.anonymousSupport.total + stats.messages.total;
  const recentActivity = stats.anonymousSupport.last24Hours + stats.messages.last24Hours;

  return (
    <div className="mb-6">
      {/* Main Stats Display */}
      <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-700">Community Support</h4>
          {recentActivity > 0 && (
            <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              {recentActivity} new today
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Messages Stats */}
          <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.messages.total}
                </p>
                <p className="text-xs text-gray-600 flex items-center gap-1">
                  <span>✍️</span> Messages
                </p>
              </div>
              {stats.messages.last24Hours > 0 && (
                <div className="text-right">
                  <p className="text-sm font-semibold text-green-600">
                    +{stats.messages.last24Hours}
                  </p>
                  <p className="text-xs text-gray-500">today</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Support Stats */}
          <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.anonymousSupport.total}
                </p>
                <p className="text-xs text-gray-600 flex items-center gap-1">
                  <span>💗</span> Quick Support
                </p>
              </div>
              {stats.anonymousSupport.last24Hours > 0 && (
                <div className="text-right">
                  <p className="text-sm font-semibold text-green-600">
                    +{stats.anonymousSupport.last24Hours}
                  </p>
                  <p className="text-xs text-gray-500">today</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Total Support Bar */}
        <div className="mt-3 pt-3 border-t border-gray-200/50">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-700 font-medium">Total Support</span>
            <span className="font-bold text-gray-900">{totalSupport} people</span>
          </div>
          {totalSupport > 0 && (
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full flex">
                <div 
                  className="bg-blue-500 transition-all duration-500"
                  style={{ width: `${(stats.messages.total / totalSupport) * 100}%` }}
                />
                <div 
                  className="bg-pink-500 transition-all duration-500"
                  style={{ width: `${(stats.anonymousSupport.total / totalSupport) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}