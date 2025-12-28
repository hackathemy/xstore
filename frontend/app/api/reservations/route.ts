import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const storeId = searchParams.get('storeId')
    const customer = searchParams.get('customer')

    const where: Record<string, string> = {}
    if (storeId) where.storeId = storeId
    if (customer) where.customer = customer

    const reservations = await prisma.reservation.findMany({
      where,
      orderBy: { date: 'asc' },
      include: {
        store: true,
      },
    })

    return NextResponse.json(reservations)
  } catch (error) {
    console.error('Error fetching reservations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reservations' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { storeId, customer, customerName, phone, date, time, partySize, note, paymentTxHash } = body

    const reservation = await prisma.reservation.create({
      data: {
        storeId,
        customer,
        customerName,
        phone,
        date: new Date(date),
        time,
        partySize: parseInt(partySize),
        note,
        paymentTxHash,
        status: 'PENDING',
      },
    })

    return NextResponse.json(reservation, { status: 201 })
  } catch (error) {
    console.error('Error creating reservation:', error)
    return NextResponse.json(
      { error: 'Failed to create reservation' },
      { status: 500 }
    )
  }
}
