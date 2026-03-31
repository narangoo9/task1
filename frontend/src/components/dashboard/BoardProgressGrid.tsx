'use client';

import { BoardStats } from '@/types';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Props {
  boards: BoardStats[];
}

export function BoardProgressGrid({ boards }: Props) {
  if (!boards.length) return null;

  return (
    <div>
      <h2 className="text-sm font-medium text-text-secondary mb-3">Board Progress</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {boards.map((board) => (
          <BoardProgressCard key={board.id} board={board} />
        ))}
      </div>
    </div>
  );
}

function BoardProgressCard({ board }: { board: BoardStats }) {
  const { stats } = board;
  const completion = stats.completionRate;

  return (
    <div className="bg-bg-subtle border border-border rounded-xl p-4 hover:border-border-accent transition-colors group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: board.color }} />
          <span className="text-sm font-medium text-text-primary group-hover:text-white transition-colors">
            {board.name}
          </span>
        </div>
        <span className="text-xs font-semibold" style={{ color: board.color }}>
          {completion}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-bg-overlay rounded-full mb-3 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${completion}%`, backgroundColor: board.color }}
        />
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-3 text-xs text-text-muted">
        <span>{stats.totalCards} tasks</span>
        {stats.overdueCards > 0 && (
          <span className="text-danger">{stats.overdueCards} overdue</span>
        )}
        {stats.assignedToMe > 0 && (
          <span className="text-info">{stats.assignedToMe} mine</span>
        )}
      </div>
    </div>
  );
}
