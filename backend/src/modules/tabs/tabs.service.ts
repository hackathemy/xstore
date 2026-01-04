import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateTabDto } from './dto/create-tab.dto';
import { AddItemDto } from './dto/add-item.dto';

@Injectable()
export class TabsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTabDto) {
    return this.prisma.tab.create({
      data: {
        storeId: dto.storeId,
        tableNumber: dto.tableNumber,
        status: 'OPEN',
      },
      include: {
        items: true,
      },
    });
  }

  async findOne(id: string) {
    const tab = await this.prisma.tab.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            menuItem: true,
          },
        },
        store: true,
      },
    });

    if (!tab) {
      throw new NotFoundException(`Tab with ID ${id} not found`);
    }

    return tab;
  }

  async findByStore(storeId: string) {
    return this.prisma.tab.findMany({
      where: {
        storeId,
        status: 'OPEN',
      },
      include: {
        items: {
          include: {
            menuItem: true,
          },
        },
      },
    });
  }

  async findByCustomer(customerAddress: string) {
    // Find tabs through payments made by this customer
    return this.prisma.tab.findMany({
      where: {
        payments: {
          some: {
            payerAddress: customerAddress,
          },
        },
      },
      include: {
        items: {
          include: {
            menuItem: true,
          },
        },
        store: true,
        payments: {
          where: {
            payerAddress: customerAddress,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async addItem(tabId: string, dto: AddItemDto) {
    const tab = await this.findOne(tabId);

    if (tab.status !== 'OPEN') {
      throw new BadRequestException('Cannot add items to a closed tab');
    }

    let itemName: string;
    let itemPrice: string;
    let menuItemId: string | undefined;

    // Mode 1: By menuItemId - lookup menu item
    if (dto.menuItemId) {
      const menuItem = await this.prisma.menuItem.findUnique({
        where: { id: dto.menuItemId },
      });

      if (!menuItem) {
        throw new NotFoundException(`Menu item with ID ${dto.menuItemId} not found`);
      }

      itemName = menuItem.name;
      itemPrice = menuItem.price;
      menuItemId = dto.menuItemId;
    }
    // Mode 2: Direct item data (name and price provided)
    else if (dto.name && dto.price !== undefined) {
      itemName = dto.name;
      itemPrice = typeof dto.price === 'number' ? dto.price.toString() : dto.price;
      menuItemId = undefined;
    }
    // Invalid: neither mode satisfied
    else {
      throw new BadRequestException('Either menuItemId or both name and price must be provided');
    }

    const tabItem = await this.prisma.tabItem.create({
      data: {
        tabId,
        menuItemId,
        quantity: dto.quantity || 1,
        name: itemName,
        price: itemPrice,
        note: dto.note,
      },
      include: {
        menuItem: true,
      },
    });

    // Update tab total
    await this.updateTabTotal(tabId);

    return tabItem;
  }

  private async updateTabTotal(tabId: string) {
    const tab = await this.prisma.tab.findUnique({
      where: { id: tabId },
      include: { items: true },
    });

    if (tab) {
      const total = tab.items.reduce(
        (sum, item) => sum + Number(item.price) * item.quantity,
        0,
      );

      await this.prisma.tab.update({
        where: { id: tabId },
        data: {
          total,
          totalAmount: total.toString(),
        },
      });
    }
  }

  async closeTab(id: string) {
    const tab = await this.findOne(id);

    if (tab.status !== 'OPEN') {
      throw new BadRequestException('Tab is already closed');
    }

    // Calculate total
    const total = tab.items.reduce(
      (sum, item) => sum + Number(item.price) * item.quantity,
      0,
    );

    return this.prisma.tab.update({
      where: { id },
      data: {
        status: 'PENDING_PAYMENT',
        total,
        totalAmount: total.toString(),
      },
      include: {
        items: {
          include: {
            menuItem: true,
          },
        },
      },
    });
  }

  async getStoreOrders(storeId: string) {
    // Get all tabs (orders) for a store - including paid ones
    const tabs = await this.prisma.tab.findMany({
      where: {
        storeId,
        status: {
          in: ['PAID', 'PENDING_PAYMENT', 'OPEN'],
        },
      },
      include: {
        items: true,
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });

    // Transform tabs to order format
    return tabs.map((tab) => {
      const totalItems = tab.items.reduce((sum, item) => sum + item.quantity, 0);
      const customerAddress = tab.payments[0]?.payerAddress || 'Unknown';

      return {
        id: tab.id,
        customer: customerAddress,
        price: tab.totalAmount || tab.total?.toString() || '0',
        count: totalItems,
        createdAt: tab.createdAt,
        status: tab.status,
        items: tab.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
      };
    });
  }
}
