'use client';

import { Board } from '@/types';
import { ArrowLeft, Users } from 'lucide-react';
import Link from 'next/link';

interface Props { board: Board; }

export function BoardHeader({ board }: Props) {
  return (
    <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-bg-base/80 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="btn-ghost p-1.5">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: board.color }} />
        <h1 className="font-semibold text-text-primary">{board.name}</h1>
        {board.description && (
          <span className="text-text-muted text-sm hidden md:block">— {board.description}</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button className="btn-ghost text-xs gap-1.5">
          <Users className="w-3.5 h-3.5" />
          Members
        </button>
      </div>
    </div>
  );
}
