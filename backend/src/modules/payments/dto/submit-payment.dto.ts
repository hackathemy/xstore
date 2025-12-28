import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitPaymentDto {
  @ApiProperty({ description: 'Payment ID' })
  @IsString()
  @IsNotEmpty()
  paymentId: string;

  @ApiProperty({ description: 'EIP-712 signature' })
  @IsString()
  @IsNotEmpty()
  signature: string;

  @ApiProperty({ description: 'Permit deadline timestamp' })
  @IsNumber()
  deadline: number;

  @ApiPropertyOptional({ description: 'Signature v component' })
  @IsNumber()
  @IsOptional()
  v?: number;

  @ApiPropertyOptional({ description: 'Signature r component' })
  @IsString()
  @IsOptional()
  r?: string;

  @ApiPropertyOptional({ description: 'Signature s component' })
  @IsString()
  @IsOptional()
  s?: string;
}
