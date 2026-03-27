'use client';

import { useSessionContext } from '@/contexts/session-context';
import { isRoleAllowed } from '@/lib/rbac/access';

export function useRoleAccess() {
  const { user } = useSessionContext();
  const userAny = user as (typeof user & { roles?: string[] }) | null;
  return {
    canAccessPortal: isRoleAllowed(user?.role, userAny?.roles),
    role: user?.role
  };
}
