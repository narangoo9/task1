'use client';

import { Card, List } from '@/types';
import { cn, isOverdue, isDueSoon, getAvatarUrl } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';
import { Calendar, AlertCircle, Clock } from 'lucide-react';
import Image from 'next/image';

type DeadlineCard = Card & {
  list: List & { board: { name: string; color: string } };
};

interface Props {
  deadlines: DeadlineCard[];
}

export function UpcomingDeadlines({ deadlines }: Props) {
  return (
    <div className="bg-bg-subtle border border-border rounded-xl p-5">
      <h2 className="text-sm font-medium text-text-secondary mb-4">Upcoming Deadlines</h2>

      {deadlines.length === 0 ? (
        <div className="flex flex-col items-center py-6 gap-2">
          <Clock className="w-8 h-8 text-text-muted" />
          <p className="text-sm text-text-muted">No upcoming deadlines</p>
        </div>
      ) : (
        <div className="space-y-2">
          {deadlines.map((card) => {
            const overdue = isOverdue(card.deadline);
            const dueSoon = isDueSoon(card.deadline);
            const daysLeft = card.deadline
              ? differenceInDays(new Date(card.deadline), new Date())
              : null;

            return (
              <div
                key={card.id}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border transition-colors',
                  overdue
                    ? 'border-danger/20 bg-danger/5'
                    : dueSoon
                    ? 'border-warning/20 bg-warning/5'
                    : 'border-border bg-bg-muted'
                )}
              >
                {/* Board color dot */}
                <div
                  className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                  style={{ backgroundColor: card.list.board.color }}
                />

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-text-primary truncate">{card.title}</p>
                  <p className="text-xs text-text-muted mt-0.5 truncate">
                    {card.list.board.name} · {card.list.name}
                  </p>

                  <div
                    className={cn(
                      'flex items-center gap-1 mt-1.5 text-xs',
                      overdue ? 'text-danger' : dueSoon ? 'text-warning' : 'text-text-muted'
                    )}
                  >
                    {overdue ? (
                      <><AlertCircle className="w-3 h-3" /> Overdue</>
                    ) : (
                      <>
                        <Calendar className="w-3 h-3" />
                        {daysLeft === 0
                          ? 'Due today'
                          : daysLeft === 1
                          ? 'Due tomorrow'
                          : format(new Date(card.deadline!), 'MMM d')}
                      </>
                    )}
                  </div>
                </div>

                {card.assignee && (
                  <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                    <Image
                      src={getAvatarUrl(card.assignee)}
                      alt={card.assignee.name}
                      width={24}
                      height={24}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
