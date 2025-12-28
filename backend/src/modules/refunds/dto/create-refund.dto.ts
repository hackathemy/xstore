import { IsString, IsNotEmpty, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRefundDto {
  @ApiProperty({ description: 'Payment ID to refund' })
  @IsString()
  @IsNotEmpty()
  paymentId: string;

  @ApiPropertyOptional({ description: 'Partial refund amount (defaults to full payment)' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  amount?: number;

  @ApiProperty({ description: 'Reason for refund' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiProperty({ description: 'Wallet address requesting refund' })
  @IsString()
  @IsNotEmpty()
  requestedBy: string;
}
