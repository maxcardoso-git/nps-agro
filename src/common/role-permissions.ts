import { PlatformRole } from './constants';

export const ROLE_PERMISSIONS: Record<PlatformRole, string[]> = {
  platform_admin: [
    'tenant.create',
    'tenant.read',
    'tenant.update',
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
  ],
  tenant_admin: [
    'tenant.read.self',
    'user.create.self',
    'user.read.self',
    'user.update.self',
    'campaign.create.self',
    'campaign.read.self',
    'campaign.update.self',
    'questionnaire.create.self',
    'questionnaire.read.self',
    'questionnaire.update.self',
    'questionnaire.publish.self',
    'report.read.self',
  ],
  campaign_manager: [
    'campaign.read.self',
    'campaign.update.self',
    'questionnaire.read.self',
    'report.read.self',
  ],
  analyst: ['report.read.self', 'campaign.read.self', 'questionnaire.read.self'],
  interviewer: ['tenant.read.self', 'campaign.read.self', 'questionnaire.read.self', 'interview.execute.self'],
};

export function hasPermission(userPermissions: string[], required: string): boolean {
  if (userPermissions.includes(required)) {
    return true;
  }

  if (userPermissions.includes(`${required}.self`)) {
    return true;
  }

  return false;
}
