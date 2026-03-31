'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { cn, getAvatarUrl } from '@/lib/utils';
import { Workspace, Board } from '@/types';
import {
  Zap, LayoutDashboard, Plus, ChevronDown, ChevronRight,
  LogOut, Settings, Users, Loader2
} from 'lucide-react';
import Image from 'next/image';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const [expandedWorkspace, setExpandedWorkspace] = useState<string | null>(null);

  const { data: workspaces = [], isLoading } = useQuery<Workspace[]>({
    queryKey: ['workspaces'],
    queryFn: async () => {
      const res = await api.get('/workspaces');
      return res.data;
    },
  });

  const { data: boards = {} } = useQuery<Record<string, Board[]>>({
    queryKey: ['workspace-boards', expandedWorkspace],
    queryFn: async () => {
      if (!expandedWorkspace) return {};
      const res = await api.get(`/boards/workspace/${expandedWorkspace}`);
      return { [expandedWorkspace]: res.data };
    },
    enabled: !!expandedWorkspace,
  });

  async function logout() {
    try { await api.post('/auth/logout'); } catch {}
    clearAuth();
    router.push('/auth/login');
  }

  return (
    <aside className="w-60 flex-shrink-0 flex flex-col bg-bg-subtle border-r border-border">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-border">
        <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center shadow-glow">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <span className="font-semibold text-text-primary">TaskFlow</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        <Link
          href="/dashboard"
          className={cn(
            'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
            pathname === '/dashboard'
              ? 'bg-brand/10 text-brand'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-overlay'
          )}
        >
          <LayoutDashboard className="w-4 h-4" />
          Dashboard
        </Link>

        {/* Workspaces */}
        <div className="mt-4">
          <div className="flex items-center justify-between px-3 mb-1">
            <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
              Workspaces
            </span>
            <button className="w-5 h-5 flex items-center justify-center rounded hover:bg-bg-overlay text-text-muted hover:text-text-secondary transition-colors">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-text-muted" />
            </div>
          ) : (
            workspaces.map((ws) => (
              <WorkspaceItem
                key={ws.id}
                workspace={ws}
                boards={boards[ws.id] ?? []}
                isExpanded={expandedWorkspace === ws.id}
                onToggle={() =>
                  setExpandedWorkspace(expandedWorkspace === ws.id ? null : ws.id)
                }
                currentPath={pathname}
              />
            ))
          )}
        </div>
      </nav>

      {/* User footer */}
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-bg-overlay transition-colors cursor-pointer">
          {user && (
            <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
              <Image
                src={getAvatarUrl(user)}
                alt={user.name}
                width={28}
                height={28}
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-text-primary truncate">{user?.name}</p>
            <p className="text-xs text-text-muted truncate">{user?.email}</p>
          </div>
        </div>

        <div className="flex gap-1 mt-2">
          <button className="btn-ghost flex-1 justify-center py-1.5 text-xs">
            <Settings className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={logout}
            className="btn-ghost flex-1 justify-center py-1.5 text-xs hover:text-danger"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}

function WorkspaceItem({
  workspace, boards, isExpanded, onToggle, currentPath,
}: {
  workspace: Workspace;
  boards: Board[];
  isExpanded: boolean;
  onToggle: () => void;
  currentPath: string;
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm
                   text-text-secondary hover:text-text-primary hover:bg-bg-overlay transition-colors"
      >
        {isExpanded ? <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />}
        <span className="truncate flex-1 text-left">{workspace.name}</span>
      </button>

      {isExpanded && (
        <div className="ml-3 pl-3 border-l border-border mt-1 space-y-0.5">
          {boards.map((board) => (
            <Link
              key={board.id}
              href={`/dashboard/board/${board.id}`}
              className={cn(
                'flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors',
                currentPath === `/dashboard/board/${board.id}`
                  ? 'text-text-primary bg-bg-overlay'
                  : 'text-text-muted hover:text-text-secondary hover:bg-bg-overlay'
              )}
            >
              <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: board.color }} />
              <span className="truncate">{board.name}</span>
            </Link>
          ))}

          <CreateBoardButton workspaceId={workspace.id} />
        </div>
      )}
    </div>
  );
}

function CreateBoardButton({ workspaceId }: { workspaceId: string }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const router = useRouter();

  async function create() {
    if (!name.trim()) return;
    try {
      const res = await api.post('/boards', { workspaceId, name: name.trim() });
      router.push(`/dashboard/board/${res.data.id}`);
      setAdding(false);
      setName('');
    } catch {}
  }

  if (!adding) {
    return (
      <button
        onClick={() => setAdding(true)}
        className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-text-muted
                   hover:text-text-secondary transition-colors w-full"
      >
        <Plus className="w-3 h-3" /> New board
      </button>
    );
  }

  return (
    <div className="py-1">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') create();
          if (e.key === 'Escape') setAdding(false);
        }}
        onBlur={() => setAdding(false)}
        className="input text-xs py-1 px-2 w-full"
        placeholder="Board name..."
      />
    </div>
  );
}
