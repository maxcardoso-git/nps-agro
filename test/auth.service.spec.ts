import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../src/modules/auth/auth.service';
import { AuthRepository } from '../src/modules/auth/auth.repository';

describe('AuthService', () => {
  it('returns token for valid credentials', async () => {
    const passwordHash = await bcrypt.hash('secret123', 10);

    const repository: Partial<AuthRepository> = {
      findUserByEmail: jest.fn().mockResolvedValue({
        id: 'user-1',
        tenant_id: 'tenant-1',
        tenant_code: 'TENANT_A',
        name: 'User',
        email: 'user@test.com',
        role: 'tenant_admin',
        is_active: true,
        password_hash: passwordHash,
      }),
      updateLastLogin: jest.fn().mockResolvedValue(undefined),
    };

    const jwtService: Partial<JwtService> = {
      signAsync: jest.fn().mockResolvedValue('jwt-token'),
    };

    const service = new AuthService(repository as AuthRepository, jwtService as JwtService);
    const result = await service.login({
      email: 'user@test.com',
      password: 'secret123',
      tenant_code: 'TENANT_A',
    });

    expect(result.access_token).toBe('jwt-token');
    expect(result.user.role).toBe('tenant_admin');
  });

  it('rejects invalid credentials', async () => {
    const repository: Partial<AuthRepository> = {
      findUserByEmail: jest.fn().mockResolvedValue(null),
    };

    const jwtService: Partial<JwtService> = {
      signAsync: jest.fn(),
    };

    const service = new AuthService(repository as AuthRepository, jwtService as JwtService);
    await expect(
      service.login({
        email: 'user@test.com',
        password: 'wrong',
      }),
    ).rejects.toMatchObject({
      response: {
        error_code: 'AUTH_INVALID_CREDENTIALS',
      },
    });
  });
});

