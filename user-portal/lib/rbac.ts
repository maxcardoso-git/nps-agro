import type { Role } from '@/lib/types';

const allowedRoles: Role[] = ['admin_master', 'platform_admin', 'tenant_admin', 'campaign_manager', 'analyst'];

export function canAccessPortal(role?: Role): boolean {
  if (!role) {
    return false;
  }

  return allowedRoles.includes(role);
}
