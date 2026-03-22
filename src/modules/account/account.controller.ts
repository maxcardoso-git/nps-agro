import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Permissions } from '../access/permissions.decorator';
import { CurrentUser } from '../access/current-user.decorator';
import { AuthUserClaims } from '../../common/types';
import { AccountService } from './account.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

@Controller('accounts')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Post()
  @Permissions('campaign.create')
  createAccount(@CurrentUser() user: AuthUserClaims, @Body() body: CreateAccountDto) {
    return this.accountService.createAccount(user, body);
  }

  @Get()
  @Permissions('campaign.read')
  listAccounts(@CurrentUser() user: AuthUserClaims, @Query('search') search?: string) {
    return this.accountService.listAccounts(user, search);
  }

  @Get(':id')
  @Permissions('campaign.read')
  getAccountById(@CurrentUser() user: AuthUserClaims, @Param('id') id: string) {
    return this.accountService.getAccountById(user, id);
  }

  @Patch(':id')
  @Permissions('campaign.update')
  updateAccount(@CurrentUser() user: AuthUserClaims, @Param('id') id: string, @Body() body: UpdateAccountDto) {
    return this.accountService.updateAccount(user, id, body);
  }
}
