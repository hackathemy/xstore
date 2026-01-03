import { Module } from '@nestjs/common';
import { FaucetController } from './faucet.controller';
import { FaucetService } from './faucet.service';
import { FacilitatorModule } from '../facilitator/facilitator.module';

@Module({
  imports: [FacilitatorModule],
  controllers: [FaucetController],
  providers: [FaucetService],
  exports: [FaucetService],
})
export class FaucetModule {}
