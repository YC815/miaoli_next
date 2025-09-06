import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const units = await prisma.unit.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' }
    })
    return NextResponse.json(units)
  } catch (error) {
    console.error('Error fetching units:', error)
    return NextResponse.json({ error: 'Failed to fetch units' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json()

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Unit name is required' }, { status: 400 })
    }

    // Check if unit already exists
    const existingUnit = await prisma.unit.findUnique({
      where: { name }
    })

    if (existingUnit) {
      return NextResponse.json({ error: 'Unit already exists' }, { status: 409 })
    }

    const unit = await prisma.unit.create({
      data: {
        name: name.trim(),
        sortOrder: 0
      }
    })

    return NextResponse.json(unit, { status: 201 })
  } catch (error) {
    console.error('Error creating unit:', error)
    return NextResponse.json({ error: 'Failed to create unit' }, { status: 500 })
  }
}