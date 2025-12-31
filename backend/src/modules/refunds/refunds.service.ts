import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { FacilitatorService } from '../facilitator/facilitator.service';
import { CreateRefundDto } from './dto/create-refund.dto';
import { ProcessRefundDto } from './dto/process-refund.dto';

@Injectable()
export class RefundsService {
  private readonly logger = new Logger(RefundsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly facilitatorService: FacilitatorService,
  ) {}

  async create(dto: CreateRefundDto) {
    // Get payment
    const payment = await this.prisma.payment.findUnique({
      where: { id: dto.paymentId },
      include: {
        tab: {
          include: { store: true },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${dto.paymentId} not found`);
    }

    if (payment.status !== 'COMPLETED') {
      throw new BadRequestException('Can only refund completed payments');
    }

    // Check if already refunded
    const existingRefund = await this.prisma.refund.findFirst({
      where: {
        paymentId: dto.paymentId,
        status: { in: ['PENDING', 'APPROVED', 'COMPLETED'] },
      },
    });

    if (existingRefund) {
      throw new BadRequestException('A refund is already in progress for this payment');
    }

    // Validate refund amount
    const refundAmount = dto.amount || payment.amount;
    if (Number(refundAmount) > Number(payment.amount)) {
      throw new BadRequestException('Refund amount cannot exceed payment amount');
    }

    return this.prisma.refund.create({
      data: {
        paymentId: dto.paymentId,
        amount: refundAmount,
        reason: dto.reason,
        status: 'PENDING',
        requestedBy: dto.requestedBy,
      },
      include: {
        payment: {
          include: {
            tab: {
              include: { store: true },
            },
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const refund = await this.prisma.refund.findUnique({
      where: { id },
      include: {
        payment: {
          include: {
            tab: {
              include: { store: true },
            },
          },
        },
      },
    });

    if (!refund) {
      throw new NotFoundException(`Refund with ID ${id} not found`);
    }

    return refund;
  }

  async findByPayment(paymentId: string) {
    return this.prisma.refund.findMany({
      where: { paymentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByStore(storeId: string, status?: string) {
    const where: any = {
      payment: {
        tab: { storeId },
      },
    };

    if (status) {
      where.status = status;
    }

    return this.prisma.refund.findMany({
      where,
      include: {
        payment: {
          include: {
            tab: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approve(id: string) {
    const refund = await this.findOne(id);

    if (refund.status !== 'PENDING') {
      throw new BadRequestException('Refund is not in pending state');
    }

    return this.prisma.refund.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
      },
    });
  }

  async reject(id: string, reason: string) {
    const refund = await this.findOne(id);

    if (refund.status !== 'PENDING') {
      throw new BadRequestException('Refund is not in pending state');
    }

    return this.prisma.refund.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectionReason: reason,
      },
    });
  }

  /**
   * Generate refund permit data for store owner to sign
   */
  async getRefundPermitData(id: string) {
    const refund = await this.findOne(id);

    if (refund.status !== 'APPROVED') {
      throw new BadRequestException('Refund must be approved before getting permit data');
    }

    const storeWallet = refund.payment.tab.store.walletAddress;
    const customerWallet = refund.payment.payerAddress;

    // Generate Move transaction data for refund
    const refundData = await this.facilitatorService.generateRefundData({
      refundId: id,
      from: storeWallet,
      to: customerWallet,
      amount: refund.amount.toString(),
    });

    return {
      ...refundData,
    };
  }

  async processRefund(id: string, dto: ProcessRefundDto) {
    const refund = await this.findOne(id);

    if (refund.status !== 'APPROVED') {
      throw new BadRequestException('Refund must be approved before processing');
    }

    try {
      const customerWallet = refund.payment.payerAddress;

      this.logger.log(`Processing refund ${id}:`);
      this.logger.log(`  To (Customer): ${customerWallet}`);
      this.logger.log(`  Amount: ${refund.amount}`);

      // Execute on-chain refund via facilitator (Move transaction)
      const result = await this.facilitatorService.processRefund({
        refundId: id,
        to: customerWallet,
        amount: refund.amount.toString(),
      });

      if (!result.success) {
        throw new Error(result.error || 'Refund processing failed');
      }

      return this.prisma.refund.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          txHash: result.txHash,
          processedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Refund processing failed: ${error}`);

      await this.prisma.refund.update({
        where: { id },
        data: {
          status: 'FAILED',
        },
      });

      throw error;
    }
  }
}
