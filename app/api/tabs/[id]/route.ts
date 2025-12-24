import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tab = await prisma.tab.findUnique({
      where: { id: params.id },
      include: {
        items: {
          include: { menuItem: true },
          orderBy: { createdAt: 'asc' },
        },
        table: true,
        store: true,
      },
    })

    if (!tab) {
      return NextResponse.json(
        { error: 'Tab not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(tab)
  } catch (error) {
    console.error('Error fetching tab:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tab' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { status, totalAmount, paymentTxHash, closedAt } = body

    const tab = await prisma.tab.update({
      where: { id: params.id },
      data: {
        ...(status && { status }),
        ...(totalAmount && { totalAmount }),
        ...(paymentTxHash && { paymentTxHash }),
        ...(closedAt && { closedAt: new Date(closedAt) }),
      },
      include: {
        items: true,
        table: true,
      },
    })

    return NextResponse.json(tab)
  } catch (error) {
    console.error('Error updating tab:', error)
    return NextResponse.json(
      { error: 'Failed to update tab' },
      { status: 500 }
    )
  }
}
