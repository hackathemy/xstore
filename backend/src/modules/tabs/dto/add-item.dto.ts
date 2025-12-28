import { IsString, IsNotEmpty, IsInt, Min, IsOptional, ValidateIf, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddItemDto {
  @ApiPropertyOptional({ description: 'Menu item ID (optional if name and price provided)' })
  @IsString()
  @IsOptional()
  menuItemId?: string;

  @ApiPropertyOptional({ description: 'Item name (required if menuItemId not provided)' })
  @ValidateIf(o => !o.menuItemId)
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ description: 'Item price (required if menuItemId not provided)' })
  @ValidateIf(o => !o.menuItemId)
  @IsNotEmpty()
  price?: string | number;

  @ApiProperty({ description: 'Quantity', minimum: 1, default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  quantity?: number = 1;

  @ApiPropertyOptional({ description: 'Additional note for the item' })
  @IsString()
  @IsOptional()
  note?: string;
}
