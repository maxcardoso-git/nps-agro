import type { Role } from '@/lib/types';

export const allowedRoles: Role[] = [
  'admin_master',
  'platform_admin',
  'tenant_admin',
  'campaign_manager',
  'analyst'
];

export function isRoleAllowed(role: Role | undefined): boolean {
  if (!role) {
    return false;
  }

  return allowedRoles.includes(role);
}
