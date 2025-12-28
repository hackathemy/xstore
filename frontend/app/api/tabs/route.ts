import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const storeId = searchParams.get('storeId')
    const customer = searchParams.get('customer')
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}
    if (storeId) where.storeId = storeId
    if (customer) where.customer = customer
    if (status) where.status = status

    const tabs = await prisma.tab.findMany({
      where,
      include: {
        items: true,
        table: true,
        store: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(tabs)
  } catch (error) {
    console.error('Error fetching tabs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tabs' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { storeId, tableId, customer, customerName } = body

    // Check if there's already an open tab for this customer at this store
    const existingTab = await prisma.tab.findFirst({
      where: {
        storeId,
        customer,
        status: 'OPEN',
      },
    })

    if (existingTab) {
      return NextResponse.json(existingTab)
    }

    const tab = await prisma.tab.create({
      data: {
        storeId,
        tableId,
        customer,
        customerName,
        status: 'OPEN',
        totalAmount: '0',
      },
      include: {
        items: true,
        table: true,
      },
    })

    return NextResponse.json(tab, { status: 201 })
  } catch (error) {
    console.error('Error creating tab:', error)
    return NextResponse.json(
      { error: 'Failed to create tab' },
      { status: 500 }
    )
  }
}
