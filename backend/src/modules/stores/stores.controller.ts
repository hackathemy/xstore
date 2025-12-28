import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StoresService } from './stores.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';

@ApiTags('Stores')
@Controller('stores')
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new store' })
  async create(@Body() dto: CreateStoreDto) {
    return this.storesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all stores' })
  async findAll() {
    return this.storesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get store by ID' })
  async findOne(@Param('id') id: string) {
    return this.storesService.findOne(id);
  }

  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update store' })
  async update(@Param('id') id: string, @Body() dto: UpdateStoreDto) {
    return this.storesService.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete store' })
  async remove(@Param('id') id: string) {
    return this.storesService.remove(id);
  }
}
