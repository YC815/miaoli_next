import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { Role, ChangeType } from '@prisma/client';

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

    const { supplyId, changeType, changeAmount, reason } = await request.json();

    if (!supplyId || !changeType || changeAmount === undefined || !reason) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supply = await prisma.supply.findUnique({
      where: { id: supplyId },
    });

    if (!supply) {
      return NextResponse.json({ error: 'Supply not found' }, { status: 404 });
    }

    let newQuantity = supply.quantity;
    if (changeType === ChangeType.INCREASE) {
      newQuantity += changeAmount;
    } else if (changeType === ChangeType.DECREASE) {
      newQuantity -= changeAmount;
    }

    if (newQuantity < 0) {
      return NextResponse.json({ error: 'Quantity cannot be negative' }, { status: 400 });
    }

    // Update supply quantity
    await prisma.supply.update({
      where: { id: supplyId },
      data: {
        quantity: newQuantity,
      },
    });

    const newLog = await prisma.inventoryLog.create({
      data: {
        supplyId,
        changeType,
        changeAmount,
        newQuantity,
        reason,
        userId: currentUser.id,
      },
    });

    return NextResponse.json(newLog, { status: 201 });
  } catch (error) {
    console.error('Error creating inventory log:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const inventoryLogs = await prisma.inventoryLog.findMany({
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            email: true,
          },
        },
        supply: {
          select: {
            id: true,
            name: true,
            category: true,
            unit: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(inventoryLogs);
  } catch (error) {
    console.error('Error fetching inventory logs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
