import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { Role, ChangeType } from '@prisma/client';
import { randomUUID } from 'crypto';

interface BatchUpdateItem {
  itemStockId: string;
  newQuantity: number;
}

interface BatchUpdateRequest {
  updates: BatchUpdateItem[];
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
        error: 'Access denied. Admin or Staff privileges required.',
      }, { status: 403 });
    }

    const body = await request.json() as BatchUpdateRequest;
    const { updates } = body;

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    // Validate all items
    for (const item of updates) {
      if (!item.itemStockId || typeof item.newQuantity !== 'number') {
        return NextResponse.json({
          error: 'Invalid update format. Each item must have itemStockId and newQuantity'
        }, { status: 400 });
      }

      if (item.newQuantity < 0) {
        return NextResponse.json({
          error: 'Quantity cannot be negative'
        }, { status: 400 });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const logs = [];
      let successCount = 0;
      let skippedCount = 0;

      for (const update of updates) {
        const itemStock = await tx.itemStock.findUnique({
          where: { id: update.itemStockId },
          select: {
            id: true,
            itemName: true,
            itemCategory: true,
            itemUnit: true,
            totalStock: true,
          },
        });

        if (!itemStock) {
          throw new Error(`ITEM_NOT_FOUND:${update.itemStockId}`);
        }

        const previousQuantity = itemStock.totalStock;
        const diff = update.newQuantity - previousQuantity;

        // Skip if no change
        if (diff === 0) {
          skippedCount++;
          continue;
        }

        const changeType = diff > 0 ? ChangeType.INCREASE : ChangeType.DECREASE;
        const changeAmount = Math.abs(diff);

        // Update item stock
        await tx.itemStock.update({
          where: { id: update.itemStockId },
          data: {
            totalStock: update.newQuantity,
            updatedAt: new Date(),
          },
        });

        // Create inventory log
        const log = await tx.inventoryLog.create({
          data: {
            id: randomUUID(),
            itemStockId: update.itemStockId,
            changeType,
            changeAmount,
            previousQuantity,
            newQuantity: update.newQuantity,
            reason: '盤點調整',
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

        logs.push(log);
        successCount++;
      }

      return {
        successCount,
        skippedCount,
        logs,
      };
    });

    return NextResponse.json({
      message: `Successfully updated ${result.successCount} items, skipped ${result.skippedCount} items with no changes`,
      successCount: result.successCount,
      skippedCount: result.skippedCount,
      logs: result.logs,
    }, { status: 200 });

  } catch (error) {
    if (error instanceof Error) {
      if (error.message.startsWith('ITEM_NOT_FOUND:')) {
        const itemId = error.message.split(':')[1];
        return NextResponse.json({
          error: `Item stock not found: ${itemId}`
        }, { status: 404 });
      }
    }

    console.error('Error in batch inventory update:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
