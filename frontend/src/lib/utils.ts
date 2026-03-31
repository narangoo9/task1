import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatDistanceToNow, isAfter, isBefore, addDays } from 'date-fns';
import { Priority } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeTime(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function isOverdue(deadline?: string | null): boolean {
  if (!deadline) return false;
  return isBefore(new Date(deadline), new Date());
}

export function isDueSoon(deadline?: string | null, days = 2): boolean {
  if (!deadline) return false;
  const d = new Date(deadline);
  return isAfter(d, new Date()) && isBefore(d, addDays(new Date(), days));
}

export const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string }> = {
  LOW:    { label: 'Low',    color: '#5a5a7a', bg: 'bg-text-muted/10' },
  MEDIUM: { label: 'Medium', color: '#38bdf8', bg: 'bg-info/10' },
  HIGH:   { label: 'High',   color: '#f59e0b', bg: 'bg-warning/10' },
  URGENT: { label: 'Urgent', color: '#f04f5e', bg: 'bg-danger/10' },
};

export function getPriorityConfig(priority: Priority) {
  return PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.MEDIUM;
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function getAvatarUrl(user: { name: string; avatar?: string | null }): string {
  if (user.avatar) return user.avatar;
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name)}&backgroundColor=7c6af7`;
}

// Fractional index helper for client-side optimistic updates
export function calcPosition(before?: number, after?: number): number {
  if (before === undefined && after === undefined) return 1000;
  if (before === undefined) return (after as number) / 2;
  if (after === undefined) return before + 1000;
  return (before + after) / 2;
}

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
}
