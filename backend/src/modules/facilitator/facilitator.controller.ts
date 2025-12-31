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
  @ApiOperation({ summary: 'Get MOVE token balance for an address' })
  async getTokenBalance(
    @Query('address') address: string,
  ) {
    const balance = await this.facilitatorService.getTokenBalance(address);
    return { balance };
  }

  @Get('network')
  @ApiOperation({ summary: 'Get Movement network info' })
  getNetworkInfo() {
    return this.facilitatorService.getNetworkInfo();
  }
}
