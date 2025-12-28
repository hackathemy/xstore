import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStoreDto {
  @ApiProperty({ description: 'Store name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Store description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Price range (legacy)' })
  @IsString()
  @IsOptional()
  price?: string;

  @ApiPropertyOptional({ description: 'Menu info (legacy)' })
  @IsString()
  @IsOptional()
  menu?: string;

  @ApiPropertyOptional({ description: 'Store image URL' })
  @IsString()
  @IsOptional()
  image?: string;

  @ApiProperty({ description: 'Owner wallet address' })
  @IsString()
  @IsNotEmpty()
  owner: string;

  @ApiProperty({ description: 'Wallet address for receiving payments' })
  @IsString()
  @IsNotEmpty()
  walletAddress: string;
}
