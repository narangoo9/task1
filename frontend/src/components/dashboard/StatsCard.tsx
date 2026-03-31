'use client';

import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

type ColorKey = 'brand' | 'success' | 'danger' | 'info' | 'warning' | 'muted';

const COLOR_MAP: Record<ColorKey, { icon: string; value: string; bg: string }> = {
  brand:   { icon: 'text-brand',   value: 'text-brand',   bg: 'bg-brand/10' },
  success: { icon: 'text-success', value: 'text-success', bg: 'bg-success/10' },
  danger:  { icon: 'text-danger',  value: 'text-danger',  bg: 'bg-danger/10' },
  info:    { icon: 'text-info',    value: 'text-info',    bg: 'bg-info/10' },
  warning: { icon: 'text-warning', value: 'text-warning', bg: 'bg-warning/10' },
  muted:   { icon: 'text-text-muted', value: 'text-text-secondary', bg: 'bg-bg-overlay' },
};

interface Props {
  icon: ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color?: ColorKey;
}

export function StatsCard({ icon, label, value, sub, color = 'brand' }: Props) {
  const colors = COLOR_MAP[color];

  return (
    <div className="bg-bg-subtle border border-border rounded-xl p-5 hover:border-border-accent transition-colors">
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center mb-3', colors.bg)}>
        <div className={colors.icon}>{icon}</div>
      </div>
      <div className={cn('text-2xl font-bold mb-0.5', colors.value)}>{value}</div>
      <div className="text-sm text-text-secondary">{label}</div>
      {sub && <div className="text-xs text-text-muted mt-1">{sub}</div>}
    </div>
  );
}
