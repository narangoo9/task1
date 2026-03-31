'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState } from 'react';
import { Card } from '@/types';
import { cn, isOverdue, isDueSoon, getPriorityConfig, getAvatarUrl, formatRelativeTime } from '@/lib/utils';
import { MessageSquare, Calendar, AlertCircle } from 'lucide-react';
import { CardDetailModal } from './CardDetailModal';
import { format } from 'date-fns';
import Image from 'next/image';

interface Props {
  card: Card;
  isDragging?: boolean;
}

export function CardItem({ card, isDragging }: Props) {
  const [showDetail, setShowDetail] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortableDragging } =
    useSortable({
      id: card.id,
      data: { type: 'card', card },
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const overdue = isOverdue(card.deadline);
  const dueSoon = isDueSoon(card.deadline);
  const priority = getPriorityConfig(card.priority);

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={cn(
          'group bg-bg-muted border border-border rounded-lg p-3 cursor-pointer',
          'hover:border-border-accent hover:shadow-card transition-card select-none',
          (isDragging || isSortableDragging) && 'opacity-40 scale-95',
          'animate-fade-in'
        )}
        onClick={() => setShowDetail(true)}
      >
        {/* Priority bar */}
        <div
          className="w-6 h-0.5 rounded-full mb-2"
          style={{ backgroundColor: priority.color }}
        />

        {/* Labels */}
        {card.labels && card.labels.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {card.labels.map(({ label }) => (
              <span
                key={label.id}
                className="px-2 py-0.5 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: label.color + '25',
                  color: label.color,
                }}
              >
                {label.name}
              </span>
            ))}
          </div>
        )}

        {/* Title */}
        <p className="text-sm text-text-primary leading-snug mb-2 group-hover:text-white transition-colors">
          {card.title}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            {/* Deadline */}
            {card.deadline && (
              <div
                className={cn(
                  'flex items-center gap-1 text-xs px-1.5 py-0.5 rounded',
                  overdue ? 'bg-danger/15 text-danger' : dueSoon ? 'bg-warning/15 text-warning' : 'text-text-muted'
                )}
              >
                {overdue && <AlertCircle className="w-3 h-3" />}
                <Calendar className="w-3 h-3" />
                <span>{format(new Date(card.deadline), 'MMM d')}</span>
              </div>
            )}

            {/* Comment count */}
            {(card._count?.comments ?? 0) > 0 && (
              <div className="flex items-center gap-1 text-xs text-text-muted">
                <MessageSquare className="w-3 h-3" />
                <span>{card._count!.comments}</span>
              </div>
            )}
          </div>

          {/* Assignee avatar */}
          {card.assignee && (
            <div className="w-6 h-6 rounded-full overflow-hidden ring-1 ring-border">
              <Image
                src={getAvatarUrl(card.assignee)}
                alt={card.assignee.name}
                width={24}
                height={24}
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>
      </div>

      {showDetail && (
        <CardDetailModal card={card} onClose={() => setShowDetail(false)} />
      )}
    </>
  );
}
