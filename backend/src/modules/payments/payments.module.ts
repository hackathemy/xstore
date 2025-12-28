import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { FacilitatorModule } from '../facilitator/facilitator.module';
import { SettlementsModule } from '../settlements/settlements.module';

@Module({
  imports: [FacilitatorModule, SettlementsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
