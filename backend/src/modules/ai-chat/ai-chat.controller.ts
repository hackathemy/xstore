import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { AiChatService, ChatMessage, ChatResponse } from './ai-chat.service';

interface ChatRequestDto {
  message: string;
  history?: ChatMessage[];
  userAddress?: string;
}

@Controller('ai-chat')
export class AiChatController {
  constructor(private readonly aiChatService: AiChatService) {}

  @Post('chat')
  async chat(@Body() body: ChatRequestDto): Promise<ChatResponse> {
    return this.aiChatService.chat(
      body.message,
      body.history || [],
      body.userAddress,
    );
  }

  @Get('stores')
  async getStores(@Query('query') query?: string): Promise<any[]> {
    if (query) {
      return this.aiChatService.searchStores(query);
    }
    return this.aiChatService.getAllStores();
  }

  @Get('menu')
  async getMenu(@Query('storeId') storeId: string): Promise<any[]> {
    return this.aiChatService.getStoreMenu(storeId);
  }

  @Get('menu-items')
  async searchMenuItems(
    @Query('query') query: string,
    @Query('storeId') storeId?: string,
  ): Promise<any[]> {
    return this.aiChatService.searchMenuItems(query, storeId);
  }
}
