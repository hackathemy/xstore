import { Controller, Get, Post, Body, Query, HttpException, HttpStatus } from '@nestjs/common';
import { FaucetService } from './faucet.service';

interface FaucetRequestDto {
  address: string;
}

@Controller('faucet')
export class FaucetController {
  constructor(private readonly faucetService: FaucetService) {}

  /**
   * GET /api/faucet/info
   * Get faucet information
   */
  @Get('info')
  getFaucetInfo() {
    return this.faucetService.getFaucetInfo();
  }

  /**
   * POST /api/faucet/request
   * Request TUSDC tokens from faucet
   */
  @Post('request')
  async requestTokens(@Body() dto: FaucetRequestDto) {
    if (!dto.address) {
      throw new HttpException('Address is required', HttpStatus.BAD_REQUEST);
    }

    const result = await this.faucetService.requestTokens(dto.address);

    if (!result.success) {
      throw new HttpException(
        result.error || 'Faucet request failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return result;
  }

  /**
   * GET /api/faucet/balance
   * Get TUSDC balance for an address
   */
  @Get('balance')
  async getBalance(@Query('address') address: string) {
    if (!address) {
      throw new HttpException('Address query parameter is required', HttpStatus.BAD_REQUEST);
    }

    const balance = await this.faucetService.getBalance(address);
    return {
      address,
      balance,
      symbol: 'TUSDC',
    };
  }
}
