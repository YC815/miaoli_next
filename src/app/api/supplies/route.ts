import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { Role } from '@prisma/client';

export async function GET() {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supplies = await prisma.supply.findMany({
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json(supplies);
  } catch (error) {
    console.error('Error fetching supplies:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!currentUser || (currentUser.role !== Role.ADMIN && currentUser.role !== Role.STAFF)) {
      return NextResponse.json({ 
        error: 'Access denied. Admin or Staff privileges required.' 
      }, { status: 403 });
    }

    const { name, category, quantity, unit, safetyStock } = await request.json();

    if (!name || !category || quantity === undefined || safetyStock === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newSupply = await prisma.supply.create({
      data: {
        name,
        category,
        quantity,
        unit: unit || '個',
        safetyStock,
      },
    });

    return NextResponse.json(newSupply, { status: 201 });
  } catch (error) {
    console.error('Error creating supply:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
