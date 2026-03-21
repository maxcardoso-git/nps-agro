import type { AuthUser, Role } from '@/lib/types';

const rolePermissions: Record<Role, string[]> = {
  admin_master: ['*'],
  platform_admin: ['*'],
  tenant_admin: [
    'tenant.read',
    'tenant.read.self',
    'user.create',
    'user.read',
    'user.update',
    'campaign.create',
    'campaign.read',
    'campaign.update',
    'questionnaire.create',
    'questionnaire.read',
    'questionnaire.update',
    'questionnaire.publish',
    'report.read',
    'branding.update'
  ],
  campaign_manager: ['campaign.create', 'campaign.read', 'campaign.update', 'report.read'],
  analyst: ['report.read', 'campaign.read', 'questionnaire.read'],
  interviewer: ['interview.execute', 'campaign.read', 'questionnaire.read']
};

function normalize(permission: string): string {
  return permission.trim().toLowerCase();
}

function matchPermission(granted: string, required: string): boolean {
  if (granted === '*') {
    return true;
  }

  if (granted === required) {
    return true;
  }

  if (granted.endsWith('.self') && granted.slice(0, -5) === required) {
    return true;
  }

  if (required.endsWith('.self') && required.slice(0, -5) === granted) {
    return true;
  }

  return false;
}

export function getUserPermissions(user?: AuthUser | null): string[] {
  if (!user) {
    return [];
  }

  const explicit = (user.permissions || []).map(normalize);
  const fromRole = (rolePermissions[user.role] || []).map(normalize);
  return Array.from(new Set([...explicit, ...fromRole]));
}

export function hasPermission(user: AuthUser | null | undefined, permission: string): boolean {
  if (!user) {
    return false;
  }

  const required = normalize(permission);
  const granted = getUserPermissions(user);
  return granted.some((candidate) => matchPermission(candidate, required));
}

export function hasAnyPermission(
  user: AuthUser | null | undefined,
  permissions: string[]
): boolean {
  if (permissions.length === 0) {
    return true;
  }

  return permissions.some((permission) => hasPermission(user, permission));
}
