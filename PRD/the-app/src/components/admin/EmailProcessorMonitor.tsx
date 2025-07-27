'use client';

import { useState, useEffect, useTransition } from 'react';
import { 
  ArrowPathIcon, 
  PlayIcon, 
  PauseIcon, 
  StopIcon,
  TrashIcon,
  FunnelIcon,
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

interface ProcessorLog {
  id: string;
  timestamp: string;
  level: string;
  category: string;
  message: string;
  metadata: Record<string, unknown> | null;
  emailId?: string;
  batchId?: string;
  processId?: string;
}

interface ProcessorControl {
  isPaused: boolean;
  isAborted: boolean;
  pausedBy?: string;
  pausedAt?: string;
  abortedBy?: string;
  abortedAt?: string;
  lastCheckAt?: string;
}

interface Props {
  initialLogs?: ProcessorLog[];
  initialControl?: ProcessorControl;
}

export default function EmailProcessorMonitor({ initialLogs = [], initialControl }: Props) {
  const [isPending, startTransition] = useTransition();
  const [logs, setLogs] = useState<ProcessorLog[]>(initialLogs);
  const [control, setControl] = useState<ProcessorControl | null>(initialControl || null);
  const [isRunning, setIsRunning] = useState(false);
  const [filters, setFilters] = useState({
    level: '',
    category: '',
    processId: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [availableFilters, setAvailableFilters] = useState<{
    levels: string[];
    categories: string[];
    processIds: string[];
  }>({
    levels: [],
    categories: [],
    processIds: [],
  });

  const fetchLogs = async () => {
    startTransition(async () => {
      try {
        const params = new URLSearchParams();
        if (filters.level) params.append('level', filters.level);
        if (filters.category) params.append('category', filters.category);
        if (filters.processId) params.append('processId', filters.processId);
        
        const response = await fetch(`/api/admin/emails/processor-logs?${params}`);
        const data = await response.json();
        
        if (response.ok) {
          setLogs(data.logs);
          setAvailableFilters(data.filters);
        }
      } catch (error) {
        console.error('Failed to fetch logs:', error);
      }
    });
  };

  const fetchControl = async () => {
    try {
      const response = await fetch('/api/admin/emails/processor-control');
      const data = await response.json();
      
      if (response.ok) {
        setControl(data.control);
        setIsRunning(data.isRunning);
      }
    } catch (error) {
      console.error('Failed to fetch control:', error);
    }
  };

  const handleControlAction = async (action: string) => {
    if (!confirm(`Are you sure you want to ${action} the email processor?`)) {
      return;
    }
    
    startTransition(async () => {
      try {
        const response = await fetch('/api/admin/emails/processor-control', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        });
        
        if (response.ok) {
          await fetchControl();
          await fetchLogs();
        }
      } catch (error) {
        console.error('Control action failed:', error);
      }
    });
  };

  const clearOldLogs = async (daysToKeep: number) => {
    if (!confirm(`Clear logs older than ${daysToKeep} days?`)) {
      return;
    }
    
    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/emails/processor-logs?daysToKeep=${daysToKeep}`, {
          method: 'DELETE',
        });
        
        if (response.ok) {
          await fetchLogs();
        }
      } catch (error) {
        console.error('Failed to clear logs:', error);
      }
    });
  };

  useEffect(() => {
    fetchControl();
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <ExclamationCircleIcon className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case 'info':
        return <InformationCircleIcon className="h-5 w-5 text-blue-500" />;
      default:
        return <InformationCircleIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'error':
        return 'text-red-600 bg-red-50';
      case 'batch':
        return 'text-purple-600 bg-purple-50';
      case 'email':
        return 'text-blue-600 bg-blue-50';
      case 'startup':
        return 'text-green-600 bg-green-50';
      case 'shutdown':
        return 'text-orange-600 bg-orange-50';
      case 'control':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6 mt-6">
      {/* Control Panel */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Email Processor Control</h2>
          <button
            onClick={() => {
              fetchControl();
              fetchLogs();
            }}
            disabled={isPending}
            className="flex items-center px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            <ArrowPathIcon className={`h-5 w-5 mr-1 ${isPending ? 'animate-spin' : ''}`} />
            Refresh All
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Status */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Status</h3>
            <div className="space-y-2">
              <div className="flex items-center">
                <span className="text-gray-600 w-24">Running:</span>
                <span className={`ml-2 px-2 py-1 rounded-full text-sm font-medium ${
                  isRunning ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {isRunning ? 'Yes' : 'No'}
                </span>
              </div>
              
              {!control ? (
                <div className="text-gray-500 italic">Loading control status...</div>
              ) : (
                <>
                  <div className="flex items-center">
                    <span className="text-gray-600 w-24">Paused:</span>
                    <span className={`ml-2 px-2 py-1 rounded-full text-sm font-medium ${
                      control.isPaused ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {control.isPaused ? 'Yes' : 'No'}
                    </span>
                    {control.isPaused && control.pausedBy && (
                      <span className="ml-2 text-sm text-gray-500">
                        by {control.pausedBy} at {new Date(control.pausedAt!).toLocaleString()}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center">
                    <span className="text-gray-600 w-24">Aborted:</span>
                    <span className={`ml-2 px-2 py-1 rounded-full text-sm font-medium ${
                      control.isAborted ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {control.isAborted ? 'Yes' : 'No'}
                    </span>
                    {control.isAborted && control.abortedBy && (
                      <span className="ml-2 text-sm text-gray-500">
                        by {control.abortedBy} at {new Date(control.abortedAt!).toLocaleString()}
                      </span>
                    )}
                  </div>
                  
                  {control.lastCheckAt && (
                    <div className="flex items-center">
                      <span className="text-gray-600 w-24">Last Check:</span>
                      <span className="ml-2 text-sm text-gray-700">
                        {new Date(control.lastCheckAt).toLocaleString()}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          
          {/* Controls */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Controls</h3>
            <div className="space-y-2">
              {!control ? (
                <div className="text-gray-500 italic">Loading controls...</div>
              ) : !isRunning && !control.isAborted ? (
                <div className="text-gray-500">
                  <p>Email processor is not running.</p>
                  <p className="text-sm mt-1">Start the processor with: <code className="bg-gray-100 px-1 rounded">npm run wait-for-email-all-accounts</code></p>
                </div>
              ) : null}
              
              {control && !control.isPaused && isRunning && (
                <button
                  onClick={() => handleControlAction('pause')}
                  disabled={isPending}
                  className="w-full flex items-center justify-center px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
                >
                  <PauseIcon className="h-5 w-5 mr-2" />
                  Pause Processing
                </button>
              )}
              
              {control && control.isPaused && !control.isAborted && (
                <button
                  onClick={() => handleControlAction('resume')}
                  disabled={isPending}
                  className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                >
                  <PlayIcon className="h-5 w-5 mr-2" />
                  Resume Processing
                </button>
              )}
              
              {control && !control.isAborted && isRunning && (
                <button
                  onClick={() => handleControlAction('abort')}
                  disabled={isPending}
                  className="w-full flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                >
                  <StopIcon className="h-5 w-5 mr-2" />
                  Abort Processor
                </button>
              )}
              
              {control && control.isAborted && (
                <button
                  onClick={() => handleControlAction('reset')}
                  disabled={isPending}
                  className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  <ArrowPathIcon className="h-5 w-5 mr-2" />
                  Reset Controls
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Logs Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Processor Logs</h2>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-3 py-2 border border-gray-300 rounded hover:bg-gray-50"
            >
              <FunnelIcon className="h-5 w-5 mr-1" />
              Filters
            </button>
            
            <button
              onClick={fetchLogs}
              disabled={isPending}
              className="flex items-center px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
            >
              <ArrowPathIcon className={`h-5 w-5 mr-1 ${isPending ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            
            <button
              onClick={() => clearOldLogs(7)}
              disabled={isPending}
              className="flex items-center px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
            >
              <TrashIcon className="h-5 w-5 mr-1" />
              Clear Old
            </button>
          </div>
        </div>
        
        {/* Filters */}
        {showFilters && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
                <select
                  value={filters.level}
                  onChange={(e) => setFilters({ ...filters, level: e.target.value })}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">All Levels</option>
                  {availableFilters.levels.map(level => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">All Categories</option>
                  {availableFilters.categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Process ID</label>
                <select
                  value={filters.processId}
                  onChange={(e) => setFilters({ ...filters, processId: e.target.value })}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">All Processes</option>
                  {availableFilters.processIds.map(processId => (
                    <option key={processId} value={processId}>{processId}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => {
                  setFilters({ level: '', category: '', processId: '' });
                  fetchLogs();
                }}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}
        
        {/* Logs List */}
        <div className="overflow-x-auto max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
          <table className="min-w-full">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr className="border-b border-gray-200">
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Level
                </th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Message
                </th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-2 py-2 text-sm text-gray-900 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-2 py-2 text-sm whitespace-nowrap">
                    <div className="flex items-center">
                      {getLevelIcon(log.level)}
                      <span className="ml-1">{log.level}</span>
                    </div>
                  </td>
                  <td className="px-2 py-2 text-sm whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(log.category)}`}>
                      {log.category}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-sm text-gray-900">
                    {log.message}
                  </td>
                  <td className="px-2 py-2 text-sm text-gray-500">
                    {log.metadata && (
                      <details className="cursor-pointer">
                        <summary className="text-xs text-blue-600 hover:text-blue-800">
                          View Details
                        </summary>
                        <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </details>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {logs.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No logs found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}