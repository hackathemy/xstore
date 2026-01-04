import { IsString, IsNotEmpty, IsOptional, IsInt, Min, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReservationDto {
  @ApiProperty({ description: 'Store ID' })
  @IsString()
  @IsNotEmpty()
  storeId: string;

  @ApiProperty({ description: 'Customer wallet address' })
  @IsString()
  @IsNotEmpty()
  customer: string;

  @ApiProperty({ description: 'Customer name' })
  @IsString()
  @IsNotEmpty()
  customerName: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ description: 'Reservation date (YYYY-MM-DD)' })
  @IsString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ description: 'Reservation time (HH:mm)' })
  @IsString()
  @IsNotEmpty()
  time: string;

  @ApiProperty({ description: 'Party size' })
  @IsString()
  @IsNotEmpty()
  partySize: string;

  @ApiPropertyOptional({ description: 'Special requests or notes' })
  @IsString()
  @IsOptional()
  note?: string;

  @ApiPropertyOptional({ description: 'Payment transaction hash' })
  @IsString()
  @IsOptional()
  paymentTxHash?: string;

  @ApiPropertyOptional({ description: 'Tab ID for payment' })
  @IsString()
  @IsOptional()
  tabId?: string;
}
