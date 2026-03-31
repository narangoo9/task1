'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/authStore';

const WS_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

let globalSocket: Socket | null = null;
let connectCount = 0;

function getSocket(token: string): Socket {
  if (globalSocket?.connected) return globalSocket;

  globalSocket?.disconnect();
  globalSocket = io(WS_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 10,
    timeout: 10000,
  });

  return globalSocket;
}

interface UseSocketOptions {
  boardId?: string;
  workspaceId?: string;
  onEvent?: (event: BoardEvent) => void;
}

export interface BoardEvent {
  type: string;
  [key: string]: unknown;
}

export function useSocket({ boardId, workspaceId, onEvent }: UseSocketOptions = {}) {
  const { accessToken } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!accessToken) return;

    const socket = getSocket(accessToken);
    socketRef.current = socket;
    connectCount++;

    socket.on('connect', () => {
      if (boardId) socket.emit('join:board', boardId);
      if (workspaceId) socket.emit('join:workspace', workspaceId);
    });

    // Re-join rooms on reconnection
    socket.on('reconnect', () => {
      if (boardId) socket.emit('join:board', boardId);
      if (workspaceId) socket.emit('join:workspace', workspaceId);
    });

    // Listen to all board events
    const handleBoardEvent = (event: BoardEvent) => {
      onEventRef.current?.(event);
    };

    socket.on('board:event', handleBoardEvent);
    socket.on('card:event', handleBoardEvent);

    return () => {
      connectCount--;
      socket.off('board:event', handleBoardEvent);
      socket.off('card:event', handleBoardEvent);

      if (boardId) socket.emit('leave:board', boardId);

      // Only fully disconnect when no consumers remain
      if (connectCount === 0) {
        socket.disconnect();
        globalSocket = null;
      }
    };
  }, [accessToken, boardId, workspaceId]);

  const emit = useCallback((event: string, data?: unknown) => {
    socketRef.current?.emit(event, data);
  }, []);

  const isConnected = useCallback(() => socketRef.current?.connected ?? false, []);

  return { emit, isConnected };
}
