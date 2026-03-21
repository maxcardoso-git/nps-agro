import { SetMetadata } from '@nestjs/common';
import { PlatformRole } from '../../common/constants';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: PlatformRole[]) => SetMetadata(ROLES_KEY, roles);
