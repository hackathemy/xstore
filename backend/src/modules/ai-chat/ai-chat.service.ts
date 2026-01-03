import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  GoogleGenerativeAI,
  SchemaType,
  FunctionDeclaration,
  Part,
} from '@google/generative-ai';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  message: string;
  stores?: any[];
  menuItems?: any[];
  selectedStore?: any;
  selectedItems?: any[];
  action?: 'search_stores' | 'search_menu' | 'create_order' | 'show_results' | 'confirm_order';
  orderSummary?: {
    storeId: string;
    storeName: string;
    items: Array<{ id: string; name: string; price: string; quantity: number }>;
    totalAmount: string;
  };
}

@Injectable()
export class AiChatService {
  private readonly logger = new Logger(AiChatService.name);
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(private prisma: PrismaService) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      this.logger.warn('GEMINI_API_KEY not set. AI chat will not work.');
    } else {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
      });
    }
  }

  private getFunctionDeclarations(): FunctionDeclaration[] {
    return [
      {
        name: 'searchStores',
        description: 'Search for stores/restaurants by name, cuisine type, or keywords',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            query: {
              type: SchemaType.STRING,
              description: 'Search query for store name or cuisine type',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'getStoreMenu',
        description: 'Get menu items from a specific store',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            storeId: {
              type: SchemaType.STRING,
              description: 'The ID of the store to get menu from',
            },
          },
          required: ['storeId'],
        },
      },
      {
        name: 'searchMenuItems',
        description: 'Search for specific menu items across all stores or in a specific store',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            query: {
              type: SchemaType.STRING,
              description: 'Search query for menu item name or type',
            },
            storeId: {
              type: SchemaType.STRING,
              description: 'Optional: limit search to a specific store',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'prepareOrder',
        description: 'Prepare an order with selected items from a store. Use this when user wants to order specific items.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            storeId: {
              type: SchemaType.STRING,
              description: 'The ID of the store to order from',
            },
            items: {
              type: SchemaType.ARRAY,
              description: 'Array of items to order',
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  menuItemId: {
                    type: SchemaType.STRING,
                    description: 'The ID of the menu item',
                  },
                  quantity: {
                    type: SchemaType.NUMBER,
                    description: 'Quantity of the item',
                  },
                },
                required: ['menuItemId', 'quantity'],
              },
            },
          },
          required: ['storeId', 'items'],
        },
      },
    ];
  }

  async searchStores(query: string): Promise<any[]> {
    const stores = await this.prisma.store.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { menu: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 10,
    });
    return stores;
  }

  async getStoreMenu(storeId: string): Promise<any[]> {
    const menuItems = await this.prisma.menuItem.findMany({
      where: { storeId },
      orderBy: { category: 'asc' },
    });
    return menuItems;
  }

  async searchMenuItems(query: string, storeId?: string): Promise<any[]> {
    const where: any = {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { category: { contains: query, mode: 'insensitive' } },
      ],
    };

    if (storeId) {
      where.storeId = storeId;
    }

    const menuItems = await this.prisma.menuItem.findMany({
      where,
      include: {
        store: {
          select: { id: true, name: true },
        },
      },
      take: 20,
    });
    return menuItems;
  }

  async prepareOrder(
    storeId: string,
    items: Array<{ menuItemId: string; quantity: number }>,
  ): Promise<any> {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      return { error: 'Store not found' };
    }

    const menuItems = await this.prisma.menuItem.findMany({
      where: {
        id: { in: items.map((i) => i.menuItemId) },
        storeId,
      },
    });

    const orderItems = items.map((item) => {
      const menuItem = menuItems.find((m: { id: string; name: string; price: string }) => m.id === item.menuItemId);
      if (!menuItem) return null;
      return {
        id: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: item.quantity,
        subtotal: (parseFloat(menuItem.price) * item.quantity).toFixed(6),
      };
    }).filter(Boolean);

    const totalAmount = orderItems.reduce(
      (sum, item) => sum + parseFloat(item!.subtotal),
      0,
    ).toFixed(6);

    return {
      storeId: store.id,
      storeName: store.name,
      storeOwner: store.owner,
      items: orderItems,
      totalAmount,
    };
  }

  async chat(
    message: string,
    history: ChatMessage[] = [],
    userAddress?: string,
  ): Promise<ChatResponse> {
    if (!this.model) {
      return {
        message: 'AI service is not available. Please configure GEMINI_API_KEY.',
      };
    }

    try {
      const systemPrompt = `You are a helpful restaurant ordering assistant for XStore, a crypto payment-based restaurant platform.
Your job is to help users:
1. Find stores/restaurants they're looking for
2. Browse menus and find specific items
3. Prepare orders for payment via X402 protocol (USDC stablecoin)

When users ask about food or restaurants, use the searchStores function to find matching stores.
When users want to see a menu, use getStoreMenu function.
When users are looking for specific food items, use searchMenuItems function.
When users want to order items, use prepareOrder function to create an order summary.

Always be friendly and helpful. Respond in the same language the user uses (Korean or English).
When showing results, format them nicely and ask if the user wants to proceed.
Prices are in USDC (crypto stablecoin pegged to USD).`;

      const chat = this.model.startChat({
        history: history.map((msg) => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        })),
        tools: [
          {
            functionDeclarations: this.getFunctionDeclarations(),
          },
        ],
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
      });

      const result = await chat.sendMessage(message);
      const response = result.response;

      // Check if there are function calls
      const functionCalls = response.functionCalls();

      if (functionCalls && functionCalls.length > 0) {
        const functionResults: Part[] = [];
        let stores: any[] = [];
        let menuItems: any[] = [];
        let orderSummary: any = null;
        let action: ChatResponse['action'] = 'show_results';

        for (const call of functionCalls) {
          let functionResult: any;

          switch (call.name) {
            case 'searchStores':
              stores = await this.searchStores(call.args.query as string);
              functionResult = stores;
              action = 'search_stores';
              break;

            case 'getStoreMenu':
              menuItems = await this.getStoreMenu(call.args.storeId as string);
              functionResult = menuItems;
              action = 'search_menu';
              break;

            case 'searchMenuItems':
              menuItems = await this.searchMenuItems(
                call.args.query as string,
                call.args.storeId as string | undefined,
              );
              functionResult = menuItems;
              action = 'search_menu';
              break;

            case 'prepareOrder':
              orderSummary = await this.prepareOrder(
                call.args.storeId as string,
                call.args.items as Array<{ menuItemId: string; quantity: number }>,
              );
              functionResult = orderSummary;
              action = 'confirm_order';
              break;

            default:
              functionResult = { error: 'Unknown function' };
          }

          functionResults.push({
            functionResponse: {
              name: call.name,
              response: { result: functionResult },
            },
          });
        }

        // Send function results back to the model
        const finalResult = await chat.sendMessage(functionResults);
        const finalText = finalResult.response.text();

        return {
          message: finalText,
          stores: stores.length > 0 ? stores : undefined,
          menuItems: menuItems.length > 0 ? menuItems : undefined,
          orderSummary: orderSummary || undefined,
          action,
        };
      }

      // No function calls, just return the text response
      return {
        message: response.text(),
      };
    } catch (error) {
      this.logger.error('Chat error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Error details:', errorMessage);
      return {
        message: `Sorry, I encountered an error: ${errorMessage}`,
      };
    }
  }

  async getAllStores(): Promise<any[]> {
    return this.prisma.store.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
    });
  }
}
