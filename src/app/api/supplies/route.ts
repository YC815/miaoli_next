import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { Role } from '@prisma/client';
import { randomUUID } from 'crypto';
import { classifyError } from '@/lib/errors';

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

export async function GET(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const namesOnly = url.searchParams.get('namesOnly') === 'true';
    const category = url.searchParams.get('category');
    const searchKeyword = url.searchParams.get('search')?.trim() || '';
    const activeOnly = url.searchParams.get('activeOnly') === 'true';

    const filters: Record<string, unknown> = {};
    const andConditions: unknown[] = [];

    if (category) {
      filters.itemCategory = category;
    }

    if (searchKeyword) {
      andConditions.push({
        OR: [
          { itemName: { contains: searchKeyword, mode: 'insensitive' } },
          { itemCategory: { contains: searchKeyword, mode: 'insensitive' } },
        ],
      });
    }

    if (activeOnly) {
      andConditions.push({ totalStock: { gt: 0 } });
    }

    if (andConditions.length > 0) {
      filters.AND = andConditions;
    }

    const itemStocks = await prisma.itemStock.findMany({
      where: filters,
      orderBy: [
        { itemCategory: 'asc' },
        { itemName: 'asc' },
      ],
    });

    if (namesOnly) {
      const uniqueNames = Array.from(new Set(itemStocks.map(item => item.itemName)));
      return NextResponse.json(uniqueNames);
    }

    return NextResponse.json(itemStocks.map(transformItemStock));
  } catch (error) {
    console.error('Error fetching item stocks:', error);

    const classified = classifyError(error);
    return NextResponse.json(
      {
        error: classified.userMessage,
        type: classified.type,
        retryable: classified.retryable,
      },
      { status: classified.statusCode }
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
        error: 'Access denied. Admin or Staff privileges required.',
      }, { status: 403 });
    }

    const {
      name,
      category,
      unit,
      quantity,
      safetyStock,
      isStandard,
    } = await request.json();

    if (!name || !category) {
      return NextResponse.json({ error: 'Name and category are required' }, { status: 400 });
    }

    const normalizedName = String(name).trim();
    const normalizedCategory = String(category).trim();
    const normalizedUnit = unit ? String(unit).trim() : '個';
    const normalizedQuantity = quantity !== undefined ? Number(quantity) : undefined;
    const normalizedSafetyStock = safetyStock !== undefined ? Number(safetyStock) : undefined;

    if (normalizedQuantity !== undefined && !Number.isFinite(normalizedQuantity)) {
      return NextResponse.json({ error: 'Quantity must be a number' }, { status: 400 });
    }

    if (normalizedSafetyStock !== undefined && !Number.isFinite(normalizedSafetyStock)) {
      return NextResponse.json({ error: 'Safety stock must be a number' }, { status: 400 });
    }

    const itemStock = await prisma.itemStock.upsert({
      where: {
        itemName_itemCategory: {
          itemName: normalizedName,
          itemCategory: normalizedCategory,
        },
      },
      create: {
        id: randomUUID(),
        itemName: normalizedName,
        itemCategory: normalizedCategory,
        itemUnit: normalizedUnit,
        totalStock: normalizedQuantity ?? 0,
        safetyStock: normalizedSafetyStock ?? 0,
        isStandard: Boolean(isStandard),
        updatedAt: new Date(),
      },
      update: {
        itemUnit: normalizedUnit,
        ...(normalizedQuantity !== undefined
          ? { totalStock: normalizedQuantity }
          : {}),
        ...(normalizedSafetyStock !== undefined
          ? { safetyStock: normalizedSafetyStock }
          : {}),
        isStandard: isStandard === undefined ? undefined : Boolean(isStandard),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(transformItemStock(itemStock), { status: 201 });
  } catch (error) {
    console.error('Error creating or updating item stock:', error);

    const classified = classifyError(error);
    return NextResponse.json(
      {
        error: classified.userMessage,
        type: classified.type,
        retryable: classified.retryable,
      },
      { status: classified.statusCode }
    );
  }
}
