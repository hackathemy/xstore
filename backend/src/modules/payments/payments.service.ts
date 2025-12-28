import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { FacilitatorService } from '../facilitator/facilitator.service';
import { SettlementsService } from '../settlements/settlements.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { SubmitPaymentDto } from './dto/submit-payment.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly facilitatorService: FacilitatorService,
    private readonly settlementsService: SettlementsService,
  ) {}

  async initiatePayment(dto: CreatePaymentDto) {
    // Get tab with store info
    const tab = await this.prisma.tab.findUnique({
      where: { id: dto.tabId },
      include: { store: true },
    });

    if (!tab) {
      throw new NotFoundException(`Tab with ID ${dto.tabId} not found`);
    }

    if (tab.status !== 'PENDING_PAYMENT') {
      throw new BadRequestException('Tab is not ready for payment');
    }

    // Create payment record
    const payment = await this.prisma.payment.create({
      data: {
        tabId: dto.tabId,
        payerAddress: dto.payerAddress,
        amount: tab.total,
        tokenAddress: process.env.USDC_ADDRESS || '',
        status: 'PENDING',
      },
    });

    // Generate payment data for signing (ERC-2612 permit or ERC-3009 transferWithAuthorization)
    const paymentData = await this.facilitatorService.generatePaymentData({
      paymentId: payment.id,
      from: dto.payerAddress,
      to: tab.store.walletAddress,
      amount: tab.total.toString(),
      tokenAddress: process.env.USDC_ADDRESS || '',
    });

    return {
      amount: tab.total,
      tokenAddress: process.env.USDC_ADDRESS,
      ...paymentData,
    };
  }

  async submitPayment(dto: SubmitPaymentDto) {
    const payment = await this.findOne(dto.paymentId);

    if (payment.status !== 'PENDING') {
      throw new BadRequestException('Payment is not in pending state');
    }

    // Submit to facilitator for processing
    const result = await this.facilitatorService.processPayment({
      paymentId: dto.paymentId,
      signature: dto.signature,
      deadline: dto.deadline,
      v: dto.v,
      r: dto.r,
      s: dto.s,
    });

    // Update payment status
    await this.prisma.payment.update({
      where: { id: dto.paymentId },
      data: {
        status: result.success ? 'COMPLETED' : 'FAILED',
        txHash: result.txHash,
        completedAt: result.success ? new Date() : null,
      },
    });

    // Update tab status if payment successful
    if (result.success) {
      await this.prisma.tab.update({
        where: { id: payment.tabId },
        data: { status: 'PAID' },
      });

      // Schedule auto-settlement after 30 seconds
      const storeId = payment.tab.storeId;
      this.logger.log(`Payment completed, scheduling auto-settlement for store ${storeId}`);
      this.settlementsService.scheduleAutoSettlement(storeId);
    }

    return result;
  }

  async findOne(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        tab: {
          include: {
            store: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    return payment;
  }

  async findByTab(tabId: string) {
    return this.prisma.payment.findMany({
      where: { tabId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
