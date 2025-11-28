import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to merge Tailwind CSS classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date to a relative time string
 */
export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const d = typeof date === 'string' ? new Date(date) : date;
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return d.toLocaleDateString();
}

/**
 * Truncate text to a specified length
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get status color class
 */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    verified: 'text-emerald-600',
    confirmed: 'text-emerald-600',
    debunked: 'text-rose-600',
    contradicted: 'text-rose-600',
    uncertain: 'text-amber-600',
    unconfirmed: 'text-amber-600',
    pending: 'text-blue-600',
    in_progress: 'text-blue-600',
  };
  return colors[status] || 'text-gray-600';
}

/**
 * Get status emoji
 */
export function getStatusEmoji(status: string): string {
  const emojis: Record<string, string> = {
    verified: '✅',
    confirmed: '✅',
    debunked: '❌',
    contradicted: '❌',
    uncertain: '⚠️',
    unconfirmed: '⚠️',
    pending: '🔍',
    in_progress: '⏳',
  };
  return emojis[status] || '❓';
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate share URL for a claim
 */
export function getClaimShareUrl(claimId: string): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}/claim/${claimId}`;
}
