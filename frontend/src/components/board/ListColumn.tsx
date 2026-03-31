'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { List, Card } from '@/types';
import { CardItem } from './CardItem';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { MoreHorizontal, Plus } from 'lucide-react';

interface Props {
  list: List;
  boardId: string;
  activeCardId?: string;
}

export function ListColumn({ list, boardId, activeCardId }: Props) {
  const [addingCard, setAddingCard] = useState(false);
  const [cardTitle, setCardTitle] = useState('');
  const queryClient = useQueryClient();

  const { setNodeRef, isOver } = useDroppable({
    id: list.id,
    data: { type: 'list', list },
  });

  const addCardMutation = useMutation({
    mutationFn: async (title: string) => {
      const res = await api.post(`/cards/list/${list.id}`, { title });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
      setCardTitle('');
      setAddingCard(false);
    },
  });

  const cards = list.cards ?? [];
  const cardIds = cards.map((c) => c.id);
  const cardCount = cards.length;

  return (
    <div
      className={cn(
        'flex-shrink-0 w-72 flex flex-col max-h-full rounded-xl border transition-colors',
        isOver ? 'border-brand/40 bg-brand/5' : 'border-border bg-bg-subtle'
      )}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-text-primary">{list.name}</h3>
          <span className="text-xs text-text-muted bg-bg-overlay px-1.5 py-0.5 rounded">
            {cardCount}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setAddingCard(true)}
            className="w-6 h-6 flex items-center justify-center rounded text-text-muted
                       hover:text-text-primary hover:bg-bg-overlay transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            className="w-6 h-6 flex items-center justify-center rounded text-text-muted
                       hover:text-text-primary hover:bg-bg-overlay transition-colors"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Cards */}
      <div
        ref={setNodeRef}
        className="flex-1 overflow-y-auto px-2 pb-2 space-y-2 min-h-[2rem]"
      >
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <CardItem
              key={card.id}
              card={card}
              isDragging={card.id === activeCardId}
            />
          ))}
        </SortableContext>

        {cards.length === 0 && !addingCard && (
          <div className="h-16 flex items-center justify-center rounded-lg border border-dashed border-border/50">
            <span className="text-xs text-text-muted">Drop cards here</span>
          </div>
        )}
      </div>

      {/* Add card */}
      {addingCard ? (
        <div className="px-2 pb-2">
          <textarea
            autoFocus
            value={cardTitle}
            onChange={(e) => setCardTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && cardTitle.trim()) {
                e.preventDefault();
                addCardMutation.mutate(cardTitle.trim());
              }
              if (e.key === 'Escape') setAddingCard(false);
            }}
            className="input resize-none text-sm w-full h-16 mb-2"
            placeholder="Card title... (Enter to add)"
          />
          <div className="flex gap-2">
            <button
              onClick={() => cardTitle.trim() && addCardMutation.mutate(cardTitle.trim())}
              disabled={addCardMutation.isPending}
              className="btn-primary text-xs py-1.5 px-3"
            >
              Add card
            </button>
            <button onClick={() => setAddingCard(false)} className="btn-ghost text-xs py-1.5 px-3">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAddingCard(true)}
          className="mx-2 mb-2 flex items-center gap-2 px-3 py-2 rounded-lg text-xs
                     text-text-muted hover:text-text-secondary hover:bg-bg-overlay transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add a card
        </button>
      )}
    </div>
  );
}
