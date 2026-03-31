// ============================================================
// Domain Types
// ============================================================

export type Role = 'ADMIN' | 'MEMBER' | 'VIEWER';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type Plan = 'FREE' | 'PRO' | 'ENTERPRISE';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role?: Role;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: Plan;
  createdAt: string;
}

export interface Workspace {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  createdAt: string;
  members?: WorkspaceMember[];
  boards?: Board[];
  _count?: { boards: number; members: number };
}

export interface WorkspaceMember {
  userId: string;
  workspaceId: string;
  role: Role;
  user: User;
}

export interface Board {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  color: string;
  position: number;
  isArchived: boolean;
  createdAt: string;
  lists?: List[];
  _count?: { lists: number };
}

export interface List {
  id: string;
  boardId: string;
  name: string;
  position: number;
  isArchived: boolean;
  cards?: Card[];
}

export interface Card {
  id: string;
  listId: string;
  title: string;
  description?: string;
  position: number;
  assignee?: User;
  assigneeId?: string;
  deadline?: string;
  priority: Priority;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  labels?: CardLabel[];
  _count?: { comments: number };
}

export interface Label {
  id: string;
  name: string;
  color: string;
  boardId: string;
}

export interface CardLabel {
  cardId: string;
  labelId: string;
  label: Label;
}

export interface Comment {
  id: string;
  cardId: string;
  content: string;
  createdAt: string;
  user: User;
}

export interface Activity {
  id: string;
  action: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  user: User;
  card?: { id: string; title: string };
}

// ============================================================
// Dashboard Types
// ============================================================

export interface BoardStats {
  id: string;
  name: string;
  color: string;
  stats: {
    totalCards: number;
    completedCards: number;
    overdueCards: number;
    highPriorityCards: number;
    assignedToMe: number;
    completionRate: number;
  };
}

export interface DashboardSummary {
  workspace: { id: string };
  totals: {
    totalCards: number;
    completedCards: number;
    overdueCards: number;
    assignedToMe: number;
    completionRate: number;
  };
  boards: BoardStats[];
  recentActivity: Activity[];
  upcomingDeadlines: (Card & { list: List & { board: { name: string; color: string } } })[];
  generatedAt: string;
}

// ============================================================
// API Response Types
// ============================================================

export interface AuthResponse {
  user: User;
  tenantId: string;
  role: Role;
  accessToken: string;
  expiresIn: number;
}

export interface ApiError {
  error: string;
  code: string;
  details?: unknown;
}

// ============================================================
// Filter Types
// ============================================================

export interface CardFilters {
  assigneeId?: string;
  labelId?: string;
  priority?: Priority;
  overdueOnly?: boolean;
}
