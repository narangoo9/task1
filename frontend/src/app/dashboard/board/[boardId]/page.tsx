'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Board } from '@/types';
import { KanbanBoard } from '@/components/board/KanbanBoard';
import { BoardHeader } from '@/components/board/BoardHeader';
import { useSocket } from '@/hooks/useSocket';
import { useCallback } from 'react';

export default function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const queryClient = useQueryClient();

  const { data: board, isLoading } = useQuery<Board>({
    queryKey: ['board', boardId],
    queryFn: async () => {
      const res = await api.get(`/boards/${boardId}`);
      return res.data;
    },
    staleTime: 10_000,
  });

  // Real-time updates
  const handleSocketEvent = useCallback(
    (event: { type: string; [key: string]: unknown }) => {
      // Invalidate board cache on any mutation event
      if (['CARD_CREATED','CARD_UPDATED','CARD_MOVED','CARD_DELETED',
           'LIST_CREATED','LIST_UPDATED'].includes(event.type)) {
        queryClient.invalidateQueries({ queryKey: ['board', boardId] });
      }
    },
    [boardId, queryClient]
  );

  useSocket({ boardId, onEvent: handleSocketEvent });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!board) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-text-secondary">Board not found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <BoardHeader board={board} />
      <KanbanBoard board={board} />
    </div>
  );
}
