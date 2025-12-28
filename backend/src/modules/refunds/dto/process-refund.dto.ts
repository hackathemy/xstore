import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProcessRefundDto {
  @ApiProperty({ description: 'Store owner signature for permit' })
  @IsString()
  @IsNotEmpty()
  signature: string;

  @ApiProperty({ description: 'Permit deadline' })
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
