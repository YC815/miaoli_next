import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { Role } from '@prisma/client';

const transformItemStock = (item: {
  id: string;
  itemName: string;
  itemCategory: string;
  itemUnit: string;
  totalStock: number;
  safetyStock: number;
  isStandard: boolean;
}) => ({
  id: item.id,
  name: item.itemName,
  category: item.itemCategory,
  unit: item.itemUnit,
  quantity: item.totalStock,
  totalStock: item.totalStock,
  safetyStock: item.safetyStock,
  isStandard: item.isStandard,
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: itemStockId } = await params;
    const {
      name,
      category,
      unit,
      quantity,
      totalStock,
      safetyStock,
      isStandard,
    } = await request.json();

    const existingItem = await prisma.itemStock.findUnique({
      where: { id: itemStockId },
    });

    if (!existingItem) {
      return NextResponse.json({ error: 'Item stock not found' }, { status: 404 });
    }

    const updatedName = name ? String(name).trim() : existingItem.itemName;
    const updatedCategory = category ? String(category).trim() : existingItem.itemCategory;

    // Ensure unique name/category combination
    if (updatedName !== existingItem.itemName || updatedCategory !== existingItem.itemCategory) {
      const duplicate = await prisma.itemStock.findFirst({
        where: {
          itemName: updatedName,
          itemCategory: updatedCategory,
          NOT: { id: itemStockId },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: '物資名稱與分類的組合已存在，請使用不同的名稱或分類' },
          { status: 409 }
        );
      }
    }

    const normalizedQuantity = totalStock ?? quantity;
    const normalizedSafetyStock = safetyStock !== undefined ? Number(safetyStock) : undefined;

    if (normalizedQuantity !== undefined && !Number.isFinite(Number(normalizedQuantity))) {
      return NextResponse.json({ error: 'Quantity must be a number' }, { status: 400 });
    }

    if (normalizedSafetyStock !== undefined && !Number.isFinite(normalizedSafetyStock)) {
      return NextResponse.json({ error: 'Safety stock must be a number' }, { status: 400 });
    }

    const updatedItem = await prisma.itemStock.update({
      where: { id: itemStockId },
      data: {
        itemName: updatedName,
        itemCategory: updatedCategory,
        itemUnit: unit ? String(unit).trim() : existingItem.itemUnit,
        ...(normalizedQuantity !== undefined
          ? { totalStock: Number(normalizedQuantity) }
          : {}),
        ...(normalizedSafetyStock !== undefined
          ? { safetyStock: normalizedSafetyStock }
          : {}),
        ...(isStandard !== undefined ? { isStandard: Boolean(isStandard) } : {}),
      },
    });

    return NextResponse.json(transformItemStock(updatedItem));
  } catch (error) {
    console.error('Error updating supply:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
