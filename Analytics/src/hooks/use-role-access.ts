'use client';

import { useSessionContext } from '@/contexts/session-context';
import { isRoleAllowed } from '@/lib/rbac/access';

export function useRoleAccess() {
  const { user } = useSessionContext();
  return {
    canAccessPortal: isRoleAllowed(user?.role),
    role: user?.role
  };
}
