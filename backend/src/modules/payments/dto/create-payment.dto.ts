import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePaymentDto {
  @ApiProperty({ description: 'Tab ID to pay for' })
  @IsString()
  @IsNotEmpty()
  tabId: string;

  @ApiProperty({ description: 'Payer wallet address' })
  @IsString()
  @IsNotEmpty()
  payerAddress: string;
}
