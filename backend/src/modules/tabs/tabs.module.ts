import { Module } from '@nestjs/common';
import { TabsController } from './tabs.controller';
import { TabsService } from './tabs.service';

@Module({
  controllers: [TabsController],
  providers: [TabsService],
  exports: [TabsService],
})
export class TabsModule {}
