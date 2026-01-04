import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TabsService } from './tabs.service';
import { CreateTabDto } from './dto/create-tab.dto';
import { AddItemDto } from './dto/add-item.dto';

@ApiTags('Tabs')
@Controller('tabs')
export class TabsController {
  constructor(private readonly tabsService: TabsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new tab' })
  async create(@Body() dto: CreateTabDto) {
    return this.tabsService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tab by ID' })
  async findOne(@Param('id') id: string) {
    return this.tabsService.findOne(id);
  }

  @Get('store/:storeId')
  @ApiOperation({ summary: 'Get all open tabs for a store' })
  async findByStore(@Param('storeId') storeId: string) {
    return this.tabsService.findByStore(storeId);
  }

  @Get('orders/:storeId')
  @ApiOperation({ summary: 'Get all orders (paid tabs) for a store' })
  async getStoreOrders(@Param('storeId') storeId: string) {
    return this.tabsService.getStoreOrders(storeId);
  }

  @Get('customer/:customerAddress')
  @ApiOperation({ summary: 'Get all tabs for a customer (by payment address)' })
  async findByCustomer(@Param('customerAddress') customerAddress: string) {
    return this.tabsService.findByCustomer(customerAddress);
  }

  @Post(':id/items')
  @ApiOperation({ summary: 'Add item to tab' })
  async addItem(@Param('id') id: string, @Body() dto: AddItemDto) {
    return this.tabsService.addItem(id, dto);
  }

  @Put(':id/close')
  @ApiOperation({ summary: 'Close tab (mark as ready for payment)' })
  async closeTab(@Param('id') id: string) {
    return this.tabsService.closeTab(id);
  }
}
