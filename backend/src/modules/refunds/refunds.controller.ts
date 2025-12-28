import { Controller, Get, Post, Put, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RefundsService } from './refunds.service';
import { CreateRefundDto } from './dto/create-refund.dto';
import { ProcessRefundDto } from './dto/process-refund.dto';

@ApiTags('Refunds')
@ApiBearerAuth()
@Controller('refunds')
export class RefundsController {
  constructor(private readonly refundsService: RefundsService) {}

  @Post()
  @ApiOperation({ summary: 'Request a refund' })
  async create(@Body() dto: CreateRefundDto) {
    return this.refundsService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get refund by ID' })
  async findOne(@Param('id') id: string) {
    return this.refundsService.findOne(id);
  }

  @Get('payment/:paymentId')
  @ApiOperation({ summary: 'Get refunds for a payment' })
  async findByPayment(@Param('paymentId') paymentId: string) {
    return this.refundsService.findByPayment(paymentId);
  }

  @Get('store/:storeId')
  @ApiOperation({ summary: 'Get all refunds for a store' })
  async findByStore(
    @Param('storeId') storeId: string,
    @Query('status') status?: string,
  ) {
    return this.refundsService.findByStore(storeId, status);
  }

  @Put(':id/approve')
  @ApiOperation({ summary: 'Approve refund request (store owner)' })
  async approve(@Param('id') id: string) {
    return this.refundsService.approve(id);
  }

  @Put(':id/reject')
  @ApiOperation({ summary: 'Reject refund request (store owner)' })
  async reject(@Param('id') id: string, @Body('reason') reason: string) {
    return this.refundsService.reject(id, reason);
  }

  @Get(':id/permit')
  @ApiOperation({ summary: 'Get refund permit data for signing (store owner signs this)' })
  async getPermitData(@Param('id') id: string) {
    return this.refundsService.getRefundPermitData(id);
  }

  @Post(':id/process')
  @ApiOperation({ summary: 'Process approved refund with store signature' })
  async process(@Param('id') id: string, @Body() dto: ProcessRefundDto) {
    return this.refundsService.processRefund(id, dto);
  }
}
