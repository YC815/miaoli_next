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
        error: 'Access denied. Admin or Staff privileges required.',
      }, { status: 403 });
    }

    const { itemStockId, changeType, changeAmount, reason } = await request.json();

    if (!itemStockId || !changeType || changeAmount === undefined || changeAmount === null || !reason) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!Object.values(ChangeType).includes(changeType)) {
      return NextResponse.json({ error: 'Invalid change type' }, { status: 400 });
    }

    if (typeof changeAmount !== 'number' || changeAmount <= 0) {
      return NextResponse.json({ error: 'Change amount must be greater than zero' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const itemStock = await tx.itemStock.findUnique({
        where: { id: itemStockId },
        select: {
          id: true,
          itemName: true,
          itemCategory: true,
          itemUnit: true,
          totalStock: true,
        },
      });

      if (!itemStock) {
        throw new Error('ITEM_STOCK_NOT_FOUND');
      }

      const previousQuantity = itemStock.totalStock;

      const newQuantity = changeType === ChangeType.INCREASE
        ? previousQuantity + changeAmount
        : previousQuantity - changeAmount;

      if (newQuantity < 0) {
        throw new Error('NEGATIVE_QUANTITY');
      }

      await tx.itemStock.update({
        where: { id: itemStockId },
        data: {
          totalStock: newQuantity,
        },
      });

      const log = await tx.inventoryLog.create({
        data: {
          itemStockId,
          changeType,
          changeAmount,
          previousQuantity,
          newQuantity,
          reason,
          userId: currentUser.id,
        },
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
      });

      return log;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'ITEM_STOCK_NOT_FOUND') {
        return NextResponse.json({ error: 'Item stock not found' }, { status: 404 });
      }

      if (error.message === 'NEGATIVE_QUANTITY') {
        return NextResponse.json({ error: 'Quantity cannot be negative' }, { status: 400 });
      }
    }

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
