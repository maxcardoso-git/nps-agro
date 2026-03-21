import { HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { DomainException } from '../../common/errors';
import { ROLE_PERMISSIONS } from '../../common/role-permissions';
import { AuthUserClaims } from '../../common/types';
import { LoginDto } from './dto/login.dto';
import { AuthRepository } from './auth.repository';

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.authRepository.findUserByEmail(dto.email, dto.tenant_code);

    if (!user || !user.password_hash) {
      throw new DomainException('AUTH_INVALID_CREDENTIALS', 'Credenciais inválidas', HttpStatus.UNAUTHORIZED);
    }

    const validPassword = await bcrypt.compare(dto.password, user.password_hash);
    if (!validPassword) {
      throw new DomainException('AUTH_INVALID_CREDENTIALS', 'Credenciais inválidas', HttpStatus.UNAUTHORIZED);
    }

    if (!user.is_active) {
      throw new DomainException('AUTH_USER_INACTIVE', 'Usuário inativo', HttpStatus.FORBIDDEN);
    }

    if (dto.tenant_code && dto.tenant_code !== user.tenant_code && user.role !== 'platform_admin') {
      throw new DomainException('AUTH_TENANT_NOT_ALLOWED', 'Usuário não autorizado para o tenant informado', HttpStatus.FORBIDDEN);
    }

    const permissions = ROLE_PERMISSIONS[user.role as keyof typeof ROLE_PERMISSIONS] ?? [];

    const claims: AuthUserClaims = {
      sub: user.id,
      tenant_id: user.tenant_id,
      role: user.role as AuthUserClaims['role'],
      permissions,
      email: user.email,
    };

    const accessToken = await this.jwtService.signAsync(claims);
    await this.authRepository.updateLastLogin(user.id);

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: Number(process.env.JWT_EXPIRES_IN_SECONDS ?? 3600),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenant_id: user.tenant_id,
      },
    };
  }

  getProfile(user: AuthUserClaims) {
    return {
      id: user.sub,
      email: user.email,
      role: user.role,
      tenant_id: user.tenant_id,
      permissions: user.permissions ?? [],
    };
  }
}
