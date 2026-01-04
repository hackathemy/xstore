import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

// Common
import { PrismaModule } from './common/prisma/prisma.module';

// Modules
import { AuthModule } from './modules/auth/auth.module';
import { StoresModule } from './modules/stores/stores.module';
import { TabsModule } from './modules/tabs/tabs.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { FacilitatorModule } from './modules/facilitator/facilitator.module';
import { SettlementsModule } from './modules/settlements/settlements.module';
import { RefundsModule } from './modules/refunds/refunds.module';
import { X402Module } from './modules/x402/x402.module';
import { FaucetModule } from './modules/faucet/faucet.module';
import { AiChatModule } from './modules/ai-chat/ai-chat.module';
import { ReservationsModule } from './modules/reservations/reservations.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../.env',
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    StoresModule,
    TabsModule,
    PaymentsModule,
    FacilitatorModule,
    SettlementsModule,
    RefundsModule,
    X402Module,
    FaucetModule,
    AiChatModule,
    ReservationsModule,
  ],
})
export class AppModule {}
