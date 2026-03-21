import { Body, Controller, Get, Post } from '@nestjs/common';
import { CurrentUser } from '../access/current-user.decorator';
import { Public } from '../access/public.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  async login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }

  @Get('me')
  async me(@CurrentUser() user: { sub: string; email: string; role: string; tenant_id: string; permissions?: string[] }) {
    return this.authService.getProfile(user);
  }
}
