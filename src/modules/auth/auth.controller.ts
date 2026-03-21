import { Body, Controller, Get, Post } from '@nestjs/common';
import { AuthUserClaims } from '../../common/types';
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
  async me(@CurrentUser() user: AuthUserClaims) {
    return this.authService.getProfile(user);
  }
}
