import { Controller, Post, Get, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { SubmitPaymentDto } from './dto/submit-payment.dto';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('initiate')
  @ApiOperation({ summary: 'Initiate payment for a tab (returns payment details for signing)' })
  async initiatePayment(@Body() dto: CreatePaymentDto) {
    return this.paymentsService.initiatePayment(dto);
  }

  @Post('submit')
  @ApiOperation({ summary: 'Submit signed payment for processing via x402 facilitator' })
  async submitPayment(@Body() dto: SubmitPaymentDto) {
    return this.paymentsService.submitPayment(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment status' })
  async getPayment(@Param('id') id: string) {
    return this.paymentsService.findOne(id);
  }

  @Get('tab/:tabId')
  @ApiOperation({ summary: 'Get payments for a tab' })
  async getPaymentsByTab(@Param('tabId') tabId: string) {
    return this.paymentsService.findByTab(tabId);
  }
}
