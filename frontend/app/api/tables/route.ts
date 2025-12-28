import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const storeId = searchParams.get('storeId')

    if (!storeId) {
      return NextResponse.json(
        { error: 'storeId is required' },
        { status: 400 }
      )
    }

    const tables = await prisma.table.findMany({
      where: { storeId, isActive: true },
      orderBy: { number: 'asc' },
    })

    return NextResponse.json(tables)
  } catch (error) {
    console.error('Error fetching tables:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tables' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { storeId, number, name, seats } = body

    const table = await prisma.table.create({
      data: {
        storeId,
        number: parseInt(number),
        name,
        seats: seats ? parseInt(seats) : 4,
      },
    })

    return NextResponse.json(table, { status: 201 })
  } catch (error) {
    console.error('Error creating table:', error)
    return NextResponse.json(
      { error: 'Failed to create table' },
      { status: 500 }
    )
  }
}
