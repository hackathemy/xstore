import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';

@ApiTags('Reservations')
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new reservation' })
  async create(
    @Body() dto: CreateReservationDto,
    @Headers('x-payment') paymentTxHash?: string,
  ) {
    // If payment header is provided, use it
    if (paymentTxHash && !dto.paymentTxHash) {
      dto.paymentTxHash = paymentTxHash;
    }
    return this.reservationsService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get reservation by ID' })
  async findOne(@Param('id') id: string) {
    return this.reservationsService.findOne(id);
  }

  @Get('store/:storeId')
  @ApiOperation({ summary: 'Get all reservations for a store' })
  async findByStore(@Param('storeId') storeId: string) {
    return this.reservationsService.findByStore(storeId);
  }

  @Get('store/:storeId/upcoming')
  @ApiOperation({ summary: 'Get upcoming reservations for a store' })
  async getUpcoming(@Param('storeId') storeId: string) {
    return this.reservationsService.getUpcomingReservations(storeId);
  }

  @Get('customer/:customerAddress')
  @ApiOperation({ summary: 'Get all reservations for a customer' })
  async findByCustomer(@Param('customerAddress') customerAddress: string) {
    return this.reservationsService.findByCustomer(customerAddress);
  }

  @Put(':id/confirm')
  @ApiOperation({ summary: 'Confirm a reservation' })
  async confirm(
    @Param('id') id: string,
    @Body() body?: { paymentTxHash?: string },
  ) {
    return this.reservationsService.confirm(id, body?.paymentTxHash);
  }

  @Put(':id/cancel')
  @ApiOperation({ summary: 'Cancel a reservation' })
  async cancel(@Param('id') id: string) {
    return this.reservationsService.cancel(id);
  }

  @Put(':id/complete')
  @ApiOperation({ summary: 'Mark reservation as completed' })
  async complete(@Param('id') id: string) {
    return this.reservationsService.complete(id);
  }
}
