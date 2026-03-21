'use client';

import { hasAnyPermission, hasPermission } from '@/lib/rbac/permissions';
import { useSessionContext } from '@/contexts/session-context';

export function usePermission() {
  const { user } = useSessionContext();

  return {
    can: (permission: string) => hasPermission(user, permission),
    canAny: (permissions: string[]) => hasAnyPermission(user, permissions)
  };
}
