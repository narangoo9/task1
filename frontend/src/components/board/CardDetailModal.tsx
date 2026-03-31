'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, User } from '@/types';
import { api } from '@/lib/api';
import { cn, getPriorityConfig, getAvatarUrl, formatRelativeTime, isOverdue } from '@/lib/utils';
import { X, Calendar, User as UserIcon, Tag, AlignLeft, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import Image from 'next/image';

interface Props {
  card: Card;
  onClose: () => void;
}

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

export function CardDetailModal({ card: initialCard, onClose }: Props) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(initialCard.title);
  const [description, setDescription] = useState(initialCard.description ?? '');
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);

  // Fetch full card details
  const { data: card = initialCard } = useQuery({
    queryKey: ['card', initialCard.id],
    queryFn: async () => {
      const res = await api.get(`/cards/${initialCard.id}`);
      return res.data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Card>) => {
      const res = await api.patch(`/cards/${card.id}`, data);
      return res.data;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['card', card.id], updated);
      queryClient.invalidateQueries({ queryKey: ['board'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/cards/${card.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board'] });
      onClose();
    },
  });

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const priority = getPriorityConfig(card.priority);
  const overdue = isOverdue(card.deadline);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-2xl bg-bg-subtle border border-border rounded-2xl shadow-modal overflow-hidden animate-slide-up">
        {/* Priority accent bar */}
        <div className="h-0.5 w-full" style={{ backgroundColor: priority.color }} />

        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-0">
          <div className="flex-1 mr-4">
            {editingTitle ? (
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => {
                  setEditingTitle(false);
                  if (title.trim() !== card.title) {
                    updateMutation.mutate({ title: title.trim() });
                  }
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                className="input text-lg font-semibold w-full"
              />
            ) : (
              <h2
                className="text-lg font-semibold text-text-primary cursor-pointer hover:text-white transition-colors"
                onClick={() => setEditingTitle(true)}
              >
                {card.title}
              </h2>
            )}
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-3 gap-6">
          {/* Main content */}
          <div className="col-span-2 space-y-6">
            {/* Description */}
            <div>
              <div className="flex items-center gap-2 mb-2 text-text-secondary">
                <AlignLeft className="w-4 h-4" />
                <span className="text-sm font-medium">Description</span>
              </div>
              {editingDesc ? (
                <textarea
                  autoFocus
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={() => {
                    setEditingDesc(false);
                    if (description !== (card.description ?? '')) {
                      updateMutation.mutate({ description });
                    }
                  }}
                  className="input resize-none w-full h-32 text-sm"
                  placeholder="Add a description..."
                />
              ) : (
                <div
                  onClick={() => setEditingDesc(true)}
                  className={cn(
                    'text-sm rounded-lg px-3 py-2 min-h-[80px] cursor-pointer transition-colors',
                    card.description
                      ? 'text-text-primary hover:bg-bg-overlay'
                      : 'text-text-muted hover:bg-bg-overlay border border-dashed border-border'
                  )}
                >
                  {card.description || 'Click to add description...'}
                </div>
              )}
            </div>

            {/* Activity / Comments */}
            {card.comments && card.comments.length > 0 && (
              <div>
                <p className="text-sm font-medium text-text-secondary mb-3">Comments</p>
                <div className="space-y-3">
                  {card.comments.map((comment: any) => (
                    <div key={comment.id} className="flex gap-3">
                      <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
                        <Image
                          src={getAvatarUrl(comment.user)}
                          alt={comment.user.name}
                          width={28}
                          height={28}
                        />
                      </div>
                      <div>
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-xs font-medium text-text-primary">{comment.user.name}</span>
                          <span className="text-xs text-text-muted">{formatRelativeTime(comment.createdAt)}</span>
                        </div>
                        <p className="text-sm text-text-secondary">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Priority */}
            <div>
              <p className="text-xs text-text-muted mb-2 uppercase tracking-wider">Priority</p>
              <div className="grid grid-cols-2 gap-1">
                {PRIORITIES.map((p) => {
                  const cfg = getPriorityConfig(p);
                  return (
                    <button
                      key={p}
                      onClick={() => updateMutation.mutate({ priority: p })}
                      className={cn(
                        'text-xs px-2 py-1.5 rounded transition-colors font-medium',
                        card.priority === p
                          ? 'ring-1 ring-current'
                          : 'hover:opacity-80'
                      )}
                      style={{ backgroundColor: cfg.color + '20', color: cfg.color }}
                    >
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Assignee */}
            <div>
              <p className="text-xs text-text-muted mb-2 uppercase tracking-wider">Assignee</p>
              {card.assignee ? (
                <div className="flex items-center gap-2 bg-bg-overlay rounded-lg px-3 py-2">
                  <div className="w-6 h-6 rounded-full overflow-hidden">
                    <Image src={getAvatarUrl(card.assignee)} alt={card.assignee.name} width={24} height={24} />
                  </div>
                  <span className="text-sm text-text-primary">{card.assignee.name}</span>
                </div>
              ) : (
                <button className="w-full flex items-center gap-2 bg-bg-overlay rounded-lg px-3 py-2 text-text-muted hover:text-text-secondary transition-colors text-sm">
                  <UserIcon className="w-4 h-4" />
                  Unassigned
                </button>
              )}
            </div>

            {/* Deadline */}
            <div>
              <p className="text-xs text-text-muted mb-2 uppercase tracking-wider">Deadline</p>
              <div className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2',
                overdue ? 'bg-danger/10 text-danger' : 'bg-bg-overlay text-text-secondary'
              )}>
                <Calendar className="w-4 h-4" />
                {card.deadline ? (
                  <span className="text-sm">{format(new Date(card.deadline), 'MMM d, yyyy')}</span>
                ) : (
                  <span className="text-sm text-text-muted">No deadline</span>
                )}
              </div>
              <input
                type="date"
                className="mt-1 input text-sm"
                value={card.deadline ? format(new Date(card.deadline), 'yyyy-MM-dd') : ''}
                onChange={(e) => updateMutation.mutate({ deadline: e.target.value || null as any })}
              />
            </div>

            {/* Labels */}
            {card.labels && card.labels.length > 0 && (
              <div>
                <p className="text-xs text-text-muted mb-2 uppercase tracking-wider">Labels</p>
                <div className="flex flex-wrap gap-1">
                  {card.labels.map(({ label }: any) => (
                    <span
                      key={label.id}
                      className="px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ backgroundColor: label.color + '25', color: label.color }}
                    >
                      {label.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Danger zone */}
            <div className="pt-4 border-t border-border">
              <button
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="btn-danger w-full text-xs"
              >
                {deleteMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                Archive card
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
