'use client';

import { Board, CardFilters, Priority } from '@/types';
import { cn } from '@/lib/utils';
import { Filter, X, AlertTriangle } from 'lucide-react';

interface Props {
  board: Board;
  filters: CardFilters;
  onFiltersChange: (f: CardFilters) => void;
}

const PRIORITIES: { value: Priority; label: string; color: string }[] = [
  { value: 'LOW',    label: 'Low',    color: '#5a5a7a' },
  { value: 'MEDIUM', label: 'Medium', color: '#38bdf8' },
  { value: 'HIGH',   label: 'High',   color: '#f59e0b' },
  { value: 'URGENT', label: 'Urgent', color: '#f04f5e' },
];

const hasFilters = (f: CardFilters) =>
  !!(f.assigneeId || f.labelId || f.priority || f.overdueOnly);

export function FilterBar({ board, filters, onFiltersChange }: Props) {
  const update = (partial: Partial<CardFilters>) =>
    onFiltersChange({ ...filters, ...partial });

  const clear = () => onFiltersChange({});

  // Get unique labels from board lists
  const allLabels = board.lists?.flatMap(
    (list) => list.cards?.flatMap((card) => card.labels?.map((cl) => cl.label) ?? []) ?? []
  ) ?? [];
  const uniqueLabels = [...new Map(allLabels.map((l) => [l?.id, l])).values()].filter(Boolean);

  return (
    <div className="flex items-center gap-3 px-6 py-2 border-b border-border bg-bg-base/50 overflow-x-auto">
      <div className="flex items-center gap-1.5 text-text-muted flex-shrink-0">
        <Filter className="w-3.5 h-3.5" />
        <span className="text-xs">Filter</span>
      </div>

      {/* Priority filter */}
      <div className="flex items-center gap-1">
        {PRIORITIES.map(({ value, label, color }) => (
          <button
            key={value}
            onClick={() => update({ priority: filters.priority === value ? undefined : value })}
            className={cn(
              'text-xs px-2 py-1 rounded-full transition-colors flex-shrink-0',
              filters.priority === value
                ? 'ring-1 ring-current font-medium'
                : 'hover:opacity-80'
            )}
            style={{
              backgroundColor: color + '20',
              color,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Overdue toggle */}
      <button
        onClick={() => update({ overdueOnly: !filters.overdueOnly })}
        className={cn(
          'flex items-center gap-1.5 text-xs px-2 py-1 rounded-full transition-colors flex-shrink-0',
          filters.overdueOnly
            ? 'bg-danger/20 text-danger ring-1 ring-danger/40'
            : 'bg-bg-overlay text-text-muted hover:text-text-secondary'
        )}
      >
        <AlertTriangle className="w-3 h-3" />
        Overdue
      </button>

      {/* Label filters */}
      {uniqueLabels.slice(0, 5).map((label) => (
        <button
          key={label.id}
          onClick={() => update({ labelId: filters.labelId === label.id ? undefined : label.id })}
          className={cn(
            'text-xs px-2 py-1 rounded-full transition-colors flex-shrink-0',
            filters.labelId === label.id ? 'ring-1 ring-current' : ''
          )}
          style={{ backgroundColor: label.color + '20', color: label.color }}
        >
          {label.name}
        </button>
      ))}

      {/* Clear filters */}
      {hasFilters(filters) && (
        <button
          onClick={clear}
          className="flex items-center gap-1 text-xs text-text-muted hover:text-danger transition-colors ml-auto flex-shrink-0"
        >
          <X className="w-3.5 h-3.5" />
          Clear
        </button>
      )}
    </div>
  );
}
