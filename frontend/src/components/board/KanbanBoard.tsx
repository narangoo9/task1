'use client';

import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { useState, useCallback, useOptimistic } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Board, Card, CardFilters } from '@/types';
import { ListColumn } from './ListColumn';
import { CardItem } from './CardItem';
import { FilterBar } from './FilterBar';
import { api } from '@/lib/api';
import { calcPosition } from '@/lib/utils';

interface Props {
  board: Board;
}

export function KanbanBoard({ board }: Props) {
  const queryClient = useQueryClient();
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [filters, setFilters] = useState<CardFilters>({});

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const moveCardMutation = useMutation({
    mutationFn: async (data: {
      cardId: string;
      targetListId: string;
      afterCardId?: string;
      beforeCardId?: string;
    }) => {
      const res = await api.patch(`/cards/${data.cardId}/move`, {
        targetListId: data.targetListId,
        afterCardId: data.afterCardId,
        beforeCardId: data.beforeCardId,
      });
      return res.data;
    },
    onError: () => {
      // Revert optimistic update on error
      queryClient.invalidateQueries({ queryKey: ['board', board.id] });
    },
  });

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    if (active.data.current?.type === 'card') {
      setActiveCard(active.data.current.card as Card);
    }
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveCard(null);

      if (!over || active.id === over.id) return;

      const activeType = active.data.current?.type;
      if (activeType !== 'card') return;

      const cardId = String(active.id);
      const overId = String(over.id);
      const overType = over.data.current?.type;

      // Drop onto a list (empty or the list header)
      if (overType === 'list') {
        moveCardMutation.mutate({ cardId, targetListId: overId });
        return;
      }

      // Drop onto another card
      if (overType === 'card') {
        const overCard = over.data.current?.card as Card;
        const targetListId = overCard.listId;

        // Find cards in target list for position calculation
        const targetList = board.lists?.find((l) => l.id === targetListId);
        const cardsInList = targetList?.cards?.filter((c) => !c.isArchived) ?? [];
        const overIndex = cardsInList.findIndex((c) => c.id === overId);

        const afterCard = cardsInList[overIndex - 1];
        const beforeCard = cardsInList[overIndex + 1];

        // Optimistic update
        queryClient.setQueryData(['board', board.id], (old: Board | undefined) => {
          if (!old) return old;
          return {
            ...old,
            lists: old.lists?.map((list) => ({
              ...list,
              cards: list.cards
                ?.filter((c) => c.id !== cardId)
                .concat(
                  list.id === targetListId
                    ? [{ ...active.data.current!.card, listId: targetListId, position: calcPosition(afterCard?.position, beforeCard?.position) }]
                    : []
                )
                .sort((a, b) => a.position - b.position),
            })),
          };
        });

        moveCardMutation.mutate({
          cardId,
          targetListId,
          afterCardId: afterCard?.id,
          beforeCardId: beforeCard?.id,
        });
      }
    },
    [board, moveCardMutation, queryClient]
  );

  // Apply filters
  const filteredLists = board.lists?.map((list) => ({
    ...list,
    cards: list.cards?.filter((card) => {
      if (filters.assigneeId && card.assigneeId !== filters.assigneeId) return false;
      if (filters.priority && card.priority !== filters.priority) return false;
      if (filters.labelId && !card.labels?.some((l) => l.labelId === filters.labelId)) return false;
      if (filters.overdueOnly && (!card.deadline || new Date(card.deadline) > new Date())) return false;
      return true;
    }),
  }));

  const listIds = (filteredLists ?? []).map((l) => l.id);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <FilterBar board={board} filters={filters} onFiltersChange={setFilters} />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={listIds} strategy={horizontalListSortingStrategy}>
          <div className="board-scroll flex gap-4 px-6 pt-4">
            {filteredLists?.map((list) => (
              <ListColumn
                key={list.id}
                list={list}
                boardId={board.id}
                activeCardId={activeCard?.id}
              />
            ))}

            {/* Add list button */}
            <AddListButton boardId={board.id} />

            {/* Spacer */}
            <div className="w-4 flex-shrink-0" />
          </div>
        </SortableContext>

        {/* Drag overlay — shows card being dragged */}
        <DragOverlay>
          {activeCard && (
            <div className="rotate-2 opacity-90 shadow-modal">
              <CardItem card={activeCard} isDragging />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function AddListButton({ boardId }: { boardId: string }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const queryClient = useQueryClient();

  const addListMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await api.post('/lists', { boardId, name });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
      setName('');
      setAdding(false);
    },
  });

  if (!adding) {
    return (
      <button
        onClick={() => setAdding(true)}
        className="flex-shrink-0 w-72 h-10 flex items-center gap-2 px-3 rounded-lg
                   border border-dashed border-border text-text-muted hover:text-text-secondary
                   hover:border-border-accent transition-colors text-sm"
      >
        <span className="text-lg leading-none">+</span>
        Add list
      </button>
    );
  }

  return (
    <div className="flex-shrink-0 w-72 bg-bg-subtle border border-border rounded-xl p-3">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && name.trim()) addListMutation.mutate(name.trim());
          if (e.key === 'Escape') setAdding(false);
        }}
        className="input text-sm mb-2"
        placeholder="List name..."
      />
      <div className="flex gap-2">
        <button
          onClick={() => name.trim() && addListMutation.mutate(name.trim())}
          className="btn-primary text-xs py-1.5 px-3"
        >
          Add
        </button>
        <button onClick={() => setAdding(false)} className="btn-ghost text-xs py-1.5 px-3">
          Cancel
        </button>
      </div>
    </div>
  );
}
