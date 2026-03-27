import type { Role } from '@/lib/types';

export const allowedRoles: Role[] = [
  'admin_master',
  'platform_admin',
  'tenant_admin',
  'campaign_manager',
  'analyst',
  'interviewer'
];

export function isRoleAllowed(role: Role | undefined, roles?: string[]): boolean {
  if (roles && roles.length > 0) {
    return roles.some((r) => allowedRoles.includes(r as Role));
  }
  if (!role) return false;
  return allowedRoles.includes(role);
}
