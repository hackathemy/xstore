import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SettlementsService } from './settlements.service';
import { CreateSettlementDto } from './dto/create-settlement.dto';

@ApiTags('Settlements')
@ApiBearerAuth()
@Controller('settlements')
export class SettlementsController {
  constructor(private readonly settlementsService: SettlementsService) {}

  @Post()
  @ApiOperation({ summary: 'Create settlement request for a store' })
  async create(@Body() dto: CreateSettlementDto) {
    return this.settlementsService.create(dto);
  }

  @Get('store/:storeId')
  @ApiOperation({ summary: 'Get settlements for a store' })
  async findByStore(
    @Param('storeId') storeId: string,
    @Query('status') status?: string,
  ) {
    return this.settlementsService.findByStore(storeId, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get settlement by ID' })
  async findOne(@Param('id') id: string) {
    return this.settlementsService.findOne(id);
  }

  @Post(':id/process')
  @ApiOperation({ summary: 'Process pending settlement (admin)' })
  async process(@Param('id') id: string) {
    return this.settlementsService.processSettlement(id);
  }

  @Get('store/:storeId/summary')
  @ApiOperation({ summary: 'Get settlement summary for a store' })
  async getSummary(@Param('storeId') storeId: string) {
    return this.settlementsService.getSettlementSummary(storeId);
  }
}
