import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSettlementDto {
  @ApiProperty({ description: 'Store ID to create settlement for' })
  @IsString()
  @IsNotEmpty()
  storeId: string;
}
