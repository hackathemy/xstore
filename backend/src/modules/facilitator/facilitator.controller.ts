import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { FacilitatorService } from './facilitator.service';

@ApiTags('Facilitator')
@Controller('facilitator')
export class FacilitatorController {
  constructor(private readonly facilitatorService: FacilitatorService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get facilitator status' })
  async getStatus() {
    const address = this.facilitatorService.getFacilitatorAddress();
    const balance = address
      ? await this.facilitatorService.checkFacilitatorBalance()
      : { hasBalance: false, balance: '0' };

    return {
      configured: !!address,
      address,
      ...balance,
    };
  }

  @Get('token-balance')
  @ApiOperation({ summary: 'Get token balance for an address' })
  async getTokenBalance(
    @Query('token') tokenAddress: string,
    @Query('address') address: string,
  ) {
    const balance = await this.facilitatorService.getTokenBalance(
      tokenAddress,
      address,
    );
    return { balance };
  }
}
