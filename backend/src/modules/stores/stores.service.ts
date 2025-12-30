import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';

@Injectable()
export class StoresService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateStoreDto) {
    return this.prisma.store.create({
      data: {
        name: dto.name,
        description: dto.description || '',
        price: dto.price || '',
        menu: dto.menu || '',
        image: dto.image || '',
        owner: dto.owner,
        walletAddress: dto.walletAddress,
      },
    });
  }

  async findAll() {
    return this.prisma.store.findMany({
      include: {
        menuItems: true,
      },
    });
  }

  async findOne(id: string) {
    const store = await this.prisma.store.findUnique({
      where: { id },
      include: {
        menuItems: true,
      },
    });

    if (!store) {
      throw new NotFoundException(`Store with ID ${id} not found`);
    }

    return store;
  }

  async findByOwner(owner: string) {
    return this.prisma.store.findFirst({
      where: { owner },
      include: {
        menuItems: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, dto: UpdateStoreDto) {
    await this.findOne(id); // Check exists
    return this.prisma.store.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id); // Check exists
    return this.prisma.store.delete({
      where: { id },
    });
  }
}
