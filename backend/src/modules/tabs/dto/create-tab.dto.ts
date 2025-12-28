import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTabDto {
  @ApiProperty({ description: 'Store ID' })
  @IsString()
  @IsNotEmpty()
  storeId: string;

  @ApiPropertyOptional({ description: 'Table number' })
  @IsInt()
  @Min(1)
  @IsOptional()
  tableNumber?: number;
}
