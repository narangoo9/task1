'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { DashboardSummary } from '@/types';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { UpcomingDeadlines } from '@/components/dashboard/UpcomingDeadlines';
import { BoardProgressGrid } from '@/components/dashboard/BoardProgressGrid';
import { CheckSquare, AlertTriangle, Clock, TrendingUp } from 'lucide-react';

// Hook to get first workspace
function useFirstWorkspace() {
  return useQuery({
    queryKey: ['workspaces'],
    queryFn: async () => {
      const res = await api.get('/workspaces');
      return res.data;
    },
  });
}

function useDashboard(workspaceId: string) {
  return useQuery<DashboardSummary>({
    queryKey: ['dashboard', workspaceId],
    queryFn: async () => {
      const res = await api.get(`/dashboard/workspace/${workspaceId}/summary`);
      return res.data;
    },
    enabled: !!workspaceId,
    refetchInterval: 60_000, // Refresh every minute
  });
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { data: workspaces } = useFirstWorkspace();
  const firstWorkspace = workspaces?.[0];
  const { data: summary, isLoading } = useDashboard(firstWorkspace?.id ?? '');

  if (isLoading || !summary) {
    return (
      <div className="p-8 space-y-6 animate-fade-in">
        <div className="h-8 w-48 skeleton" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 skeleton rounded-xl" />)}
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 h-64 skeleton rounded-xl" />
          <div className="h-64 skeleton rounded-xl" />
        </div>
      </div>
    );
  }

  const { totals, boards, recentActivity, upcomingDeadlines } = summary;

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-8 space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">
            Good {getGreeting()},{' '}
            <span className="text-brand">{user?.name.split(' ')[0]}</span>
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Here&apos;s what&apos;s happening in {firstWorkspace?.name}
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Completion Rate"
            value={`${totals.completionRate}%`}
            sub={`${totals.completedCards} / ${totals.totalCards} tasks`}
            color="brand"
          />
          <StatsCard
            icon={<CheckSquare className="w-5 h-5" />}
            label="Assigned to Me"
            value={totals.assignedToMe}
            sub="active tasks"
            color="success"
          />
          <StatsCard
            icon={<AlertTriangle className="w-5 h-5" />}
            label="Overdue"
            value={totals.overdueCards}
            sub="need attention"
            color={totals.overdueCards > 0 ? 'danger' : 'muted'}
          />
          <StatsCard
            icon={<Clock className="w-5 h-5" />}
            label="Total Tasks"
            value={totals.totalCards}
            sub={`across ${boards.length} boards`}
            color="info"
          />
        </div>

        {/* Board progress */}
        <BoardProgressGrid boards={boards} />

        {/* Bottom row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ActivityFeed activities={recentActivity} />
          </div>
          <div>
            <UpcomingDeadlines deadlines={upcomingDeadlines} />
          </div>
        </div>
      </div>
    </div>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
