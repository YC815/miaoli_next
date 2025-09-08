import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { Role } from '@prisma/client';

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

    const { id: supplyId } = await params;
    const { name, category, quantity, unit, safetyStock, isActive, sortOrder } = await request.json();

    const existingSupply = await prisma.supply.findUnique({
      where: { id: supplyId },
    });

    if (!existingSupply) {
      return NextResponse.json({ error: 'Supply not found' }, { status: 404 });
    }

    try {
      const updatedSupply = await prisma.supply.update({
        where: { id: supplyId },
        data: {
          name: name ?? existingSupply.name,
          category: category ?? existingSupply.category,
          quantity: quantity ?? existingSupply.quantity,
          unit: unit ?? existingSupply.unit,
          safetyStock: safetyStock ?? existingSupply.safetyStock,
          isActive: isActive ?? existingSupply.isActive,
          sortOrder: sortOrder ?? existingSupply.sortOrder,
        },
      });

      return NextResponse.json(updatedSupply);
    } catch (prismaError: unknown) {
      // 處理唯一約束錯誤
      if (typeof prismaError === 'object' && prismaError !== null && 'code' in prismaError && prismaError.code === 'P2002') {
        return NextResponse.json({ 
          error: '物資名稱已存在，請使用不同的名稱' 
        }, { status: 409 });
      }
      throw prismaError;
    }
  } catch (error) {
    console.error('Error updating supply:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
