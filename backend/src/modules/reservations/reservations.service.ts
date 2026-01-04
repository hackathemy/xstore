import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateReservationDto } from './dto/create-reservation.dto';

@Injectable()
export class ReservationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateReservationDto) {
    // Parse date string to DateTime
    const reservationDate = new Date(dto.date);
    if (isNaN(reservationDate.getTime())) {
      throw new BadRequestException('Invalid date format');
    }

    return this.prisma.reservation.create({
      data: {
        storeId: dto.storeId,
        customer: dto.customer,
        customerName: dto.customerName,
        phone: dto.phone,
        date: reservationDate,
        time: dto.time,
        partySize: parseInt(dto.partySize, 10) || 2,
        note: dto.note,
        paymentTxHash: dto.paymentTxHash,
        tabId: dto.tabId,
        status: dto.paymentTxHash ? 'CONFIRMED' : 'PENDING',
      },
      include: {
        store: true,
      },
    });
  }

  async findOne(id: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: {
        store: true,
        tab: true,
      },
    });

    if (!reservation) {
      throw new NotFoundException(`Reservation with ID ${id} not found`);
    }

    return reservation;
  }

  async findByStore(storeId: string) {
    return this.prisma.reservation.findMany({
      where: { storeId },
      include: {
        store: true,
      },
      orderBy: {
        date: 'asc',
      },
    });
  }

  async findByCustomer(customerAddress: string) {
    return this.prisma.reservation.findMany({
      where: { customer: customerAddress },
      include: {
        store: true,
      },
      orderBy: {
        date: 'desc',
      },
    });
  }

  async updateStatus(id: string, status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED') {
    const reservation = await this.findOne(id);

    return this.prisma.reservation.update({
      where: { id },
      data: { status },
      include: {
        store: true,
      },
    });
  }

  async cancel(id: string) {
    return this.updateStatus(id, 'CANCELLED');
  }

  async confirm(id: string, paymentTxHash?: string) {
    const reservation = await this.findOne(id);

    return this.prisma.reservation.update({
      where: { id },
      data: {
        status: 'CONFIRMED',
        ...(paymentTxHash && { paymentTxHash }),
      },
      include: {
        store: true,
      },
    });
  }

  async complete(id: string) {
    return this.updateStatus(id, 'COMPLETED');
  }

  async getUpcomingReservations(storeId: string) {
    const now = new Date();
    return this.prisma.reservation.findMany({
      where: {
        storeId,
        date: {
          gte: now,
        },
        status: {
          in: ['PENDING', 'CONFIRMED'],
        },
      },
      include: {
        store: true,
      },
      orderBy: [
        { date: 'asc' },
        { time: 'asc' },
      ],
    });
  }
}
