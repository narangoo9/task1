'use client';

import { Activity } from '@/types';
import { formatRelativeTime, getAvatarUrl } from '@/lib/utils';
import Image from 'next/image';

interface Props {
  activities: Activity[];
}

const ACTION_LABELS: Record<string, string> = {
  'card.created': 'created card',
  'card.moved':   'moved card',
  'card.updated': 'updated card',
  'card.deleted': 'archived card',
  'list.created': 'created list',
};

export function ActivityFeed({ activities }: Props) {
  return (
    <div className="bg-bg-subtle border border-border rounded-xl p-5">
      <h2 className="text-sm font-medium text-text-secondary mb-4">Recent Activity</h2>

      {activities.length === 0 ? (
        <p className="text-sm text-text-muted text-center py-6">No recent activity</p>
      ) : (
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 mt-0.5">
                <Image
                  src={getAvatarUrl(activity.user)}
                  alt={activity.user.name}
                  width={28}
                  height={28}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-secondary leading-snug">
                  <span className="font-medium text-text-primary">{activity.user.name}</span>{' '}
                  {ACTION_LABELS[activity.action] ?? activity.action}
                  {activity.card && (
                    <>
                      {' '}
                      <span className="text-text-primary font-medium truncate">
                        &ldquo;{activity.card.title}&rdquo;
                      </span>
                    </>
                  )}
                </p>
                <p className="text-xs text-text-muted mt-0.5">
                  {formatRelativeTime(activity.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
