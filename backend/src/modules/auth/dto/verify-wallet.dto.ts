import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyWalletDto {
  @ApiProperty({ description: 'Privy access token' })
  @IsString()
  @IsNotEmpty()
  accessToken: string;
}
