'use client';

import { useRouter } from 'next/navigation';
import {
  UsersIcon,
  BuildingOfficeIcon,
  UserIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';

const iconMap = {
  users: UsersIcon,
  buildings: BuildingOfficeIcon,
  user: UserIcon,
  chat: ChatBubbleLeftRightIcon,
};

interface DashboardCardProps {
  name: string;
  value: number;
  icon: keyof typeof iconMap;
  href: string;
}

export default function DashboardCard({
  name,
  value,
  icon,
  href,
}: DashboardCardProps) {
  const router = useRouter();
  const Icon = iconMap[icon];

  return (
    <div
      className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => router.push(href)}
    >
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Icon className="h-6 w-6 text-gray-400" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                {name}
              </dt>
              <dd className="text-lg font-medium text-gray-900">{value}</dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
