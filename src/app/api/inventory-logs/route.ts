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

    const { itemStockId, supplyId, changeType, changeAmount, reason } = await request.json();
    const targetItemStockId = itemStockId || supplyId;

    if (!targetItemStockId || !changeType || changeAmount === undefined || !reason) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const itemStock = await prisma.itemStock.findUnique({
      where: { id: targetItemStockId },
    });

    if (!itemStock) {
      return NextResponse.json({ error: 'Item stock not found' }, { status: 404 });
    }

    let newQuantity = itemStock.totalStock;
    if (changeType === ChangeType.INCREASE) {
      newQuantity += changeAmount;
    } else if (changeType === ChangeType.DECREASE) {
      newQuantity -= changeAmount;
    }

    if (newQuantity < 0) {
      return NextResponse.json({ error: 'Quantity cannot be negative' }, { status: 400 });
    }

    // Update item stock quantity
    await prisma.itemStock.update({
      where: { id: targetItemStockId },
      data: {
        totalStock: newQuantity,
      },
    });

    const newLog = await prisma.inventoryLog.create({
      data: {
        itemStockId: targetItemStockId,
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
        itemStock: {
          select: {
            id: true,
            itemName: true,
            itemCategory: true,
            itemUnit: true,
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
