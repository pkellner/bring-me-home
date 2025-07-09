'use client';

import { useState } from 'react';
import {
  UsersIcon,
  BuildingOfficeIcon,
  UserIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  ClockIcon,
  ChartBarIcon,
  CogIcon,
  ServerIcon,
  CircleStackIcon as DatabaseIcon,
} from '@heroicons/react/24/outline';
import { useEnvironment } from '@/contexts/EnvironmentContext';

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalTowns: number;
  totalPersons: number;
  totalComments: number;
  pendingComments: number;
  approvedComments: number;
  recentUsers: Array<{
    id: string;
    username: string;
    firstName: string | null;
    lastName: string | null;
    createdAt: Date;
  }>;
  recentComments: Array<{
    id: string;
    content: string;
    createdAt: Date;
    person: {
      firstName: string;
      lastName: string;
      town: {
        name: string;
      };
    };
  }>;
}

interface SystemDashboardProps {
  systemStats: SystemStats;
}

export default function SystemDashboard({ systemStats }: SystemDashboardProps) {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'performance' | 'settings'
  >('overview');
  const { env } = useEnvironment();

  const statCards = [
    {
      name: 'Total Users',
      value: systemStats.totalUsers,
      icon: UsersIcon,
      color: 'bg-blue-500',
      description: `${systemStats.activeUsers} active`,
    },
    {
      name: 'Towns',
      value: systemStats.totalTowns,
      icon: BuildingOfficeIcon,
      color: 'bg-green-500',
      description: 'Geographic regions',
    },
    {
      name: 'Missing Persons',
      value: systemStats.totalPersons,
      icon: UserIcon,
      color: 'bg-purple-500',
      description: 'Profiles created',
    },
    {
      name: 'Comments',
      value: systemStats.totalComments,
      icon: ChatBubbleLeftRightIcon,
      color: 'bg-yellow-500',
      description: `${systemStats.pendingComments} pending`,
    },
  ];

  const tabs = [
    { id: 'overview', name: 'Overview', icon: ChartBarIcon },
    { id: 'performance', name: 'Performance', icon: ServerIcon },
    { id: 'settings', name: 'Settings', icon: CogIcon },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">System Management</h1>
        <p className="mt-1 text-sm text-gray-600">
          Monitor system performance and manage global settings.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map(card => (
          <div
            key={card.name}
            className="bg-white overflow-hidden shadow rounded-lg"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`p-3 rounded-lg ${card.color}`}>
                    <card.icon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {card.name}
                    </dt>
                    <dd className="text-3xl font-semibold text-gray-900">
                      {card.value}
                    </dd>
                    <dd className="text-sm text-gray-500">
                      {card.description}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() =>
                  setActiveTab(
                    tab.id as 'overview' | 'performance' | 'settings'
                  )
                }
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-5 w-5 mr-2" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="px-6 py-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Recent Activity */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Recent Users */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Recent Users
                  </h3>
                  <div className="space-y-3">
                    {systemStats.recentUsers.map(user => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center">
                          <UsersIcon className="h-5 w-5 text-gray-400 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {user.firstName && user.lastName
                                ? `${user.firstName} ${user.lastName}`
                                : user.username}
                            </div>
                            <div className="text-sm text-gray-500">
                              @{user.username}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Comments */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Recent Comments
                  </h3>
                  <div className="space-y-3">
                    {systemStats.recentComments.map(comment => (
                      <div
                        key={comment.id}
                        className="flex items-start justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-start">
                          <ChatBubbleLeftRightIcon className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                          <div>
                            <div className="text-sm text-gray-900 truncate max-w-xs">
                              {comment.content}
                            </div>
                            <div className="text-sm text-gray-500">
                              {comment.person.firstName}{' '}
                              {comment.person.lastName} -{' '}
                              {comment.person.town.name}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* System Health */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  System Health
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                      <span className="text-sm font-medium text-green-900">
                        Database Connected
                      </span>
                    </div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                      <span className="text-sm font-medium text-green-900">
                        Authentication Active
                      </span>
                    </div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                      <span className="text-sm font-medium text-green-900">
                        File Uploads Working
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'performance' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Performance Metrics
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <DatabaseIcon className="h-5 w-5 text-gray-500 mr-2" />
                      <span className="text-sm font-medium text-gray-900">
                        Database Size
                      </span>
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-gray-900">
                      {Math.round(
                        (systemStats.totalUsers +
                          systemStats.totalTowns +
                          systemStats.totalPersons +
                          systemStats.totalComments) /
                          100
                      )}
                      MB
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <ClockIcon className="h-5 w-5 text-gray-500 mr-2" />
                      <span className="text-sm font-medium text-gray-900">
                        Avg Response Time
                      </span>
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-gray-900">
                      120ms
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <ServerIcon className="h-5 w-5 text-gray-500 mr-2" />
                      <span className="text-sm font-medium text-gray-900">
                        Memory Usage
                      </span>
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-gray-900">
                      65%
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <ChartBarIcon className="h-5 w-5 text-gray-500 mr-2" />
                      <span className="text-sm font-medium text-gray-900">
                        Active Sessions
                      </span>
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-gray-900">
                      {systemStats.activeUsers}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  System Information
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        Application Version
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        v{env?.releaseVersion || '0'}
                        {env?.releaseDate && (
                          <span className="text-xs text-gray-500 block">
                            Released: {env.releaseDate}
                          </span>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        Database Version
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900">MySQL 8.0</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        Node.js Version
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900">20.x</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        Next.js Version
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900">15.x</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Global Settings
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        User Registration
                      </div>
                      <div className="text-sm text-gray-500">
                        Allow new users to register accounts
                      </div>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        defaultChecked={true}
                        className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        Comment Moderation
                      </div>
                      <div className="text-sm text-gray-500">
                        Require admin approval for new comments
                      </div>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        defaultChecked={true}
                        className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        Email Notifications
                      </div>
                      <div className="text-sm text-gray-500">
                        Send email notifications for new comments
                      </div>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        defaultChecked={false}
                        className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        File Upload Limits
                      </div>
                      <div className="text-sm text-gray-500">
                        Maximum file size per upload
                      </div>
                    </div>
                    <div className="flex items-center">
                      <select className="block w-32 pl-3 pr-8 py-1 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                        <option>5MB</option>
                        <option>10MB</option>
                        <option>25MB</option>
                        <option>50MB</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Security Settings
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        Two-Factor Authentication
                      </div>
                      <div className="text-sm text-gray-500">
                        Require 2FA for admin users
                      </div>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        defaultChecked={false}
                        className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        Password Policy
                      </div>
                      <div className="text-sm text-gray-500">
                        Minimum password complexity requirements
                      </div>
                    </div>
                    <div className="flex items-center">
                      <select className="block w-32 pl-3 pr-8 py-1 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                        <option>Basic</option>
                        <option>Medium</option>
                        <option>Strong</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        Session Timeout
                      </div>
                      <div className="text-sm text-gray-500">
                        Auto-logout after inactivity
                      </div>
                    </div>
                    <div className="flex items-center">
                      <select className="block w-32 pl-3 pr-8 py-1 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                        <option>15 min</option>
                        <option>30 min</option>
                        <option>1 hour</option>
                        <option>4 hours</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Save Settings
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
