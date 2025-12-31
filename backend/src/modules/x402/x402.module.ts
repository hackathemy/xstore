import { Module } from '@nestjs/common';
import { X402Controller } from './x402.controller';
import { FacilitatorModule } from '../facilitator/facilitator.module';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [FacilitatorModule, PrismaModule],
  controllers: [X402Controller],
})
export class X402Module {}
