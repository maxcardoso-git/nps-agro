import type { PaginatedResponse } from '@/lib/types';

export function extractItems<T>(payload: PaginatedResponse<T> | T[] | undefined | null): T[] {
  if (!payload) {
    return [];
  }

  if (Array.isArray(payload)) {
    return payload;
  }

  return payload.items || [];
}

export function formatDateKey(value?: string | null): string {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
