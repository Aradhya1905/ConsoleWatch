import React from 'react';
import type { ConsoleMethod } from '../../../shared/types';

interface BadgeProps {
  variant: ConsoleMethod | 'custom';
  children: React.ReactNode;
}

const variantStyles: Record<string, string> = {
  log: 'bg-accent-blue text-bg-primary',
  info: 'bg-accent-cyan text-bg-primary',
  warn: 'bg-accent-amber text-bg-primary',
  error: 'bg-accent-red text-bg-primary',
  debug: 'bg-accent-purple text-bg-primary',
  custom: 'bg-accent-pink text-bg-primary',
};

export function Badge({ variant, children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center justify-center px-2 h-[18px] rounded-full text-[10px] font-semibold uppercase ${variantStyles[variant] || variantStyles.log}`}
    >
      {children}
    </span>
  );
}
