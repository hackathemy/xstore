import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { menuItemId, name, price, quantity, note } = body

    // Create the tab item
    const tabItem = await prisma.tabItem.create({
      data: {
        tabId: params.id,
        menuItemId,
        name,
        price,
        quantity: quantity || 1,
        note,
      },
    })

    // Update the total amount on the tab
    const tab = await prisma.tab.findUnique({
      where: { id: params.id },
      include: { items: true },
    })

    if (tab) {
      const totalAmount = tab.items.reduce((sum, item) => {
        return sum + parseFloat(item.price) * item.quantity
      }, 0)

      await prisma.tab.update({
        where: { id: params.id },
        data: { totalAmount: totalAmount.toString() },
      })
    }

    return NextResponse.json(tabItem, { status: 201 })
  } catch (error) {
    console.error('Error adding item to tab:', error)
    return NextResponse.json(
      { error: 'Failed to add item to tab' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const itemId = searchParams.get('itemId')

    if (!itemId) {
      return NextResponse.json(
        { error: 'itemId is required' },
        { status: 400 }
      )
    }

    await prisma.tabItem.delete({
      where: { id: itemId },
    })

    // Update the total amount on the tab
    const tab = await prisma.tab.findUnique({
      where: { id: params.id },
      include: { items: true },
    })

    if (tab) {
      const totalAmount = tab.items.reduce((sum, item) => {
        return sum + parseFloat(item.price) * item.quantity
      }, 0)

      await prisma.tab.update({
        where: { id: params.id },
        data: { totalAmount: totalAmount.toString() },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing item from tab:', error)
    return NextResponse.json(
      { error: 'Failed to remove item from tab' },
      { status: 500 }
    )
  }
}
