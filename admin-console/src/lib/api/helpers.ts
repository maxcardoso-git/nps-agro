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
