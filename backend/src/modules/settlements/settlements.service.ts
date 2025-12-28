import { Injectable, NotFoundException, BadRequestException, Logger, Inject, forwardRef } from '@nestjs/common';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateSettlementDto } from './dto/create-settlement.dto';

// Auto-settlement delay in milliseconds (30 seconds)
const AUTO_SETTLEMENT_DELAY = 30 * 1000;

@Injectable()
export class SettlementsService {
  private readonly logger = new Logger(SettlementsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  /**
   * Schedule auto-settlement for a store after payment completion
   */
  scheduleAutoSettlement(storeId: string) {
    const timeoutName = `auto-settlement-${storeId}`;

    // Cancel existing timeout for this store if any
    try {
      const existingTimeout = this.schedulerRegistry.getTimeout(timeoutName);
      if (existingTimeout) {
        this.schedulerRegistry.deleteTimeout(timeoutName);
        this.logger.log(`Cancelled existing auto-settlement for store ${storeId}`);
      }
    } catch (e) {
      // No existing timeout, that's fine
    }

    // Schedule new auto-settlement
    const timeout = setTimeout(async () => {
      this.logger.log(`Auto-settlement triggered for store ${storeId}`);
      try {
        // Check if there are unsettled payments
        const unsettledCount = await this.prisma.payment.count({
          where: {
            tab: { storeId },
            status: 'COMPLETED',
            settlementId: null,
          },
        });

        if (unsettledCount > 0) {
          // Create and process settlement
          const settlement = await this.create({ storeId });
          await this.processSettlement(settlement.id);
          this.logger.log(`Auto-settlement completed for store ${storeId}: ${settlement.id}`);
        }
      } catch (error) {
        this.logger.error(`Auto-settlement failed for store ${storeId}: ${error}`);
      } finally {
        // Clean up the timeout reference
        try {
          this.schedulerRegistry.deleteTimeout(timeoutName);
        } catch (e) {}
      }
    }, AUTO_SETTLEMENT_DELAY);

    this.schedulerRegistry.addTimeout(timeoutName, timeout);
    this.logger.log(`Scheduled auto-settlement for store ${storeId} in ${AUTO_SETTLEMENT_DELAY / 1000}s`);
  }

  async create(dto: CreateSettlementDto) {
    // Get unsettled payments for the store
    const unsettledPayments = await this.prisma.payment.findMany({
      where: {
        tab: {
          storeId: dto.storeId,
        },
        status: 'COMPLETED',
        settlementId: null,
      },
    });

    if (unsettledPayments.length === 0) {
      throw new BadRequestException('No unsettled payments found');
    }

    // Calculate total amount
    const totalAmount = unsettledPayments.reduce(
      (sum, payment) => sum + Number(payment.amount),
      0,
    );

    // Create settlement
    const settlement = await this.prisma.settlement.create({
      data: {
        storeId: dto.storeId,
        amount: totalAmount,
        status: 'PENDING',
        paymentIds: unsettledPayments.map((p) => p.id),
      },
    });

    // Link payments to settlement
    await this.prisma.payment.updateMany({
      where: {
        id: { in: unsettledPayments.map((p) => p.id) },
      },
      data: {
        settlementId: settlement.id,
      },
    });

    return settlement;
  }

  async findOne(id: string) {
    const settlement = await this.prisma.settlement.findUnique({
      where: { id },
      include: {
        store: true,
        payments: true,
      },
    });

    if (!settlement) {
      throw new NotFoundException(`Settlement with ID ${id} not found`);
    }

    return settlement;
  }

  async findByStore(storeId: string, status?: string) {
    const where: any = { storeId };
    if (status) {
      where.status = status;
    }

    return this.prisma.settlement.findMany({
      where,
      include: {
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async processSettlement(id: string) {
    const settlement = await this.findOne(id);

    if (settlement.status !== 'PENDING') {
      throw new BadRequestException('Settlement is not in pending state');
    }

    // In x402 model, funds are already transferred to store during payment
    // Settlement just marks payments as settled for bookkeeping
    // In a custodial model, this would transfer accumulated funds

    return this.prisma.settlement.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        processedAt: new Date(),
        txHash: 'direct-transfer', // Funds already transferred during payment
      },
    });
  }

  async getSettlementSummary(storeId: string) {
    const [pendingSettlements, completedSettlements, unsettledPayments] = await Promise.all([
      this.prisma.settlement.aggregate({
        where: { storeId, status: 'PENDING' },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.settlement.aggregate({
        where: { storeId, status: 'COMPLETED' },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.payment.aggregate({
        where: {
          tab: { storeId },
          status: 'COMPLETED',
          settlementId: null,
        },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    return {
      pending: {
        count: pendingSettlements._count,
        amount: pendingSettlements._sum.amount || 0,
      },
      completed: {
        count: completedSettlements._count,
        amount: completedSettlements._sum.amount || 0,
      },
      unsettled: {
        count: unsettledPayments._count,
        amount: unsettledPayments._sum.amount || 0,
      },
    };
  }

  // Fallback: Auto-create settlements daily for any missed payments
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailySettlements() {
    this.logger.log('Running daily settlement cleanup job');

    // Get all stores with unsettled payments
    const storesWithUnsettled = await this.prisma.store.findMany({
      where: {
        tabs: {
          some: {
            payments: {
              some: {
                status: 'COMPLETED',
                settlementId: null,
              },
            },
          },
        },
      },
    });

    for (const store of storesWithUnsettled) {
      try {
        const settlement = await this.create({ storeId: store.id });
        await this.processSettlement(settlement.id);
        this.logger.log(`Created daily settlement for store ${store.id}`);
      } catch (error) {
        this.logger.error(`Failed to create settlement for store ${store.id}: ${error}`);
      }
    }
  }
}
