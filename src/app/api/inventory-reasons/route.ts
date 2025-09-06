import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { Role, ChangeType } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const changeType = searchParams.get('changeType') as ChangeType | null;

    const where = {
      isActive: true,
      ...(changeType && { changeType }),
    };

    const reasons = await prisma.inventoryChangeReason.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json(reasons);
  } catch (error) {
    console.error('Error fetching inventory reasons:', error);
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

    const { reason, changeType, sortOrder } = await request.json();

    if (!reason || typeof reason !== 'string') {
      return NextResponse.json({ error: 'Reason is required' }, { status: 400 });
    }

    if (!changeType || !Object.values(ChangeType).includes(changeType)) {
      return NextResponse.json({ 
        error: 'Valid changeType is required (INCREASE or DECREASE)' 
      }, { status: 400 });
    }

    // If no sortOrder provided, use the next available order for this changeType
    let finalSortOrder = sortOrder;
    if (finalSortOrder === undefined) {
      const lastReason = await prisma.inventoryChangeReason.findFirst({
        where: { changeType },
        orderBy: { sortOrder: 'desc' },
      });
      finalSortOrder = (lastReason?.sortOrder || 0) + 1;
    }

    const newReason = await prisma.inventoryChangeReason.create({
      data: {
        reason: reason.trim(),
        changeType,
        sortOrder: finalSortOrder,
      },
    });

    return NextResponse.json(newReason, { status: 201 });
  } catch (error) {
    console.error('Error creating inventory reason:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}