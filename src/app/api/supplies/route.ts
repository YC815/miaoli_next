import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { Role } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';
    const sortBy = searchParams.get('sortBy') || 'name';
    const namesOnly = searchParams.get('namesOnly') === 'true';

    let whereClause = {};
    let orderByClause = {};

    // 根據 activeOnly 參數決定是否只查詢活躍的物資
    if (activeOnly) {
      whereClause = { isActive: true };
    }

    // 根據 sortBy 參數決定排序方式
    if (sortBy === 'sortOrder') {
      orderByClause = [
        { sortOrder: 'asc' },
        { name: 'asc' }
      ];
    } else {
      orderByClause = { name: 'asc' };
    }

    // 如果只需要名稱（用於下拉選單），返回去重的名稱列表
    if (namesOnly) {
      const supplies = await prisma.supply.findMany({
        where: whereClause,
        select: {
          name: true,
          isActive: true,
          sortOrder: true,
        },
        orderBy: orderByClause,
      });

      // 去重並返回唯一名稱
      const uniqueNames = supplies
        .filter((supply, index, self) => 
          index === self.findIndex(s => s.name === supply.name)
        )
        .map(supply => supply.name);

      return NextResponse.json(uniqueNames);
    }

    // 正常查詢所有物資
    const supplies = await prisma.supply.findMany({
      where: whereClause,
      orderBy: orderByClause,
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

    const { name, category, quantity, unit, safetyStock, isActive, sortOrder } = await request.json();

    if (!name || !category || quantity === undefined || safetyStock === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    try {
      const newSupply = await prisma.supply.create({
        data: {
          name,
          category,
          quantity,
          unit: unit || '個',
          safetyStock,
          isActive: isActive !== undefined ? isActive : true,
          sortOrder: sortOrder || 0,
        },
      });

      return NextResponse.json(newSupply, { status: 201 });
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
    console.error('Error creating supply:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
