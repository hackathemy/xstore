import { Module } from '@nestjs/common';
import { AiChatController } from './ai-chat.controller';
import { AiChatService } from './ai-chat.service';
import { PrismaService } from '../../common/prisma/prisma.service';

@Module({
  controllers: [AiChatController],
  providers: [AiChatService, PrismaService],
  exports: [AiChatService],
})
export class AiChatModule {}
