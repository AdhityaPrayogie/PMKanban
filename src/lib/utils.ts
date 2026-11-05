import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export function isOverdue(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  try {
    const d = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d < today;
  } catch {
    return false;
  }
}

export function formatLastActive(dateStr?: string | null): { isOnline: boolean; text: string } {
  if (!dateStr) return { isOnline: false, text: 'Offline' };
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffMin < 3) {
      return { isOnline: true, text: 'Sedang Online' };
    }
    if (diffMin < 60) {
      return { isOnline: false, text: `Aktif ${diffMin}m yang lalu` };
    }
    if (diffHour < 24) {
      return { isOnline: false, text: `Aktif ${diffHour}j yang lalu` };
    }
    if (diffDay < 7) {
      return { isOnline: false, text: `Aktif ${diffDay}h yang lalu` };
    }
    return { isOnline: false, text: formatDate(dateStr) };
  } catch {
    return { isOnline: false, text: 'Offline' };
  }
}
