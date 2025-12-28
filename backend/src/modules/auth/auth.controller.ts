import { Controller, Post, Body, Get, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { VerifyWalletDto } from './dto/verify-wallet.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('verify')
  @ApiOperation({ summary: 'Verify wallet signature and get JWT token' })
  async verifyWallet(@Body() dto: VerifyWalletDto) {
    return this.authService.verifyWallet(dto);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user info' })
  async getMe(@Req() req: Request) {
    // Will implement with JWT guard
    return { message: 'Not implemented yet' };
  }
}
