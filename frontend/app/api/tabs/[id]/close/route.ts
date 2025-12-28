import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// This endpoint requires x402 payment
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check for payment header
    const paymentTxHash = request.headers.get('x-payment')

    // Get the tab
    const tab = await prisma.tab.findUnique({
      where: { id: params.id },
      include: {
        items: true,
        store: true,
      },
    })

    if (!tab) {
      return NextResponse.json(
        { error: 'Tab not found' },
        { status: 404 }
      )
    }

    if (tab.status !== 'OPEN' && tab.status !== 'PENDING_PAYMENT') {
      return NextResponse.json(
        { error: 'Tab is not open' },
        { status: 400 }
      )
    }

    // Calculate total
    const totalAmount = tab.items.reduce((sum, item) => {
      return sum + parseFloat(item.price.toString()) * item.quantity
    }, 0)

    // If no payment header, return 402 Payment Required
    if (!paymentTxHash) {
      // Update tab status to pending payment
      await prisma.tab.update({
        where: { id: params.id },
        data: { status: 'PENDING_PAYMENT', totalAmount: totalAmount.toString() },
      })

      return new NextResponse(
        JSON.stringify({
          error: 'Payment Required',
          payment: {
            version: '1',
            network: 'movement-testnet',
            amount: totalAmount.toString(),
            currency: 'MOVE',
            recipient: tab.store.owner,
            description: `Payment for tab at ${tab.store.name}`,
            tabId: tab.id,
            items: tab.items.map(item => ({
              name: item.name,
              quantity: item.quantity,
              price: item.price.toString(),
            })),
          },
        }),
        {
          status: 402,
          headers: {
            'Content-Type': 'application/json',
            'X-Payment-Required': JSON.stringify({
              version: '1',
              network: 'movement-testnet',
              amount: totalAmount.toString(),
              currency: 'MOVE',
              recipient: tab.store.owner,
            }),
          },
        }
      )
    }

    // Payment received - close the tab
    const closedTab = await prisma.tab.update({
      where: { id: params.id },
      data: {
        status: 'PAID',
        totalAmount: totalAmount.toString(),
        paymentTxHash,
        closedAt: new Date(),
      },
      include: {
        items: true,
        table: true,
        store: true,
      },
    })

    return NextResponse.json({
      success: true,
      tab: closedTab,
      message: 'Tab closed successfully',
    })
  } catch (error) {
    console.error('Error closing tab:', error)
    return NextResponse.json(
      { error: 'Failed to close tab' },
      { status: 500 }
    )
  }
}
