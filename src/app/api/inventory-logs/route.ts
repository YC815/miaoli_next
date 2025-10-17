import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { Role, ChangeType, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

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
          updatedAt: new Date(),
        },
      });

      const log = await tx.inventoryLog.create({
        data: {
          id: randomUUID(),
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

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 50;

const parseDate = (value: string | null, endOfDay = false) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  }
  return date;
};

const normalizeMultiValueParam = (params: URLSearchParams, key: string) => {
  const directValues = params
    .getAll(key)
    .flatMap((entry) => entry.split(',').map((v) => v.trim()));

  const bracketValues = params
    .getAll(`${key}[]`)
    .flatMap((entry) => entry.split(',').map((v) => v.trim()));

  const combined = [...directValues, ...bracketValues].filter(Boolean);

  return Array.from(new Set(combined));
};

export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(parseInt(searchParams.get('page') ?? '1', 10) || 1, 1);
    const requestedPageSize =
      parseInt(searchParams.get('pageSize') ?? `${DEFAULT_PAGE_SIZE}`, 10) ||
      DEFAULT_PAGE_SIZE;
    const pageSize = Math.min(Math.max(requestedPageSize, 1), MAX_PAGE_SIZE);
    const skip = (page - 1) * pageSize;

    const search = searchParams.get('search')?.trim();
    const startDate = parseDate(searchParams.get('startDate'));
    const endDate = parseDate(searchParams.get('endDate'), true);
    const userIdFilter = searchParams.get('userId') ?? undefined;
    const itemIdFilter = searchParams.get('itemStockId') ?? undefined;
    const changeTypes = normalizeMultiValueParam(searchParams, 'changeType').filter(
      (type): type is ChangeType => type === 'INCREASE' || type === 'DECREASE',
    );
    const categories = normalizeMultiValueParam(searchParams, 'category');

    const where: Prisma.InventoryLogWhereInput = {};
    const andConditions: Prisma.InventoryLogWhereInput[] = [];

    if (startDate || endDate) {
      andConditions.push({
        createdAt: {
          ...(startDate ? { gte: startDate } : {}),
          ...(endDate ? { lte: endDate } : {}),
        },
      });
    }

    if (search) {
      andConditions.push({
        OR: [
          { reason: { contains: search, mode: 'insensitive' } },
          {
            itemStock: {
              OR: [
                { itemName: { contains: search, mode: 'insensitive' } },
                { itemCategory: { contains: search, mode: 'insensitive' } },
              ],
            },
          },
          {
            user: {
              OR: [
                { nickname: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
              ],
            },
          },
        ],
      });
    }

    if (userIdFilter) {
      andConditions.push({ userId: userIdFilter });
    }

    if (itemIdFilter) {
      andConditions.push({ itemStockId: itemIdFilter });
    }

    if (changeTypes.length === 1) {
      andConditions.push({ changeType: changeTypes[0] });
    } else if (changeTypes.length === 2) {
      // both types selected, no need to add filter
    }

    if (categories.length > 0) {
      andConditions.push({
        itemStock: {
          itemCategory: {
            in: categories,
          },
        },
      });
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    const sortBy = searchParams.get('sortBy') ?? 'createdAt';
    const sortOrderParam = searchParams.get('sortOrder');
    const sortOrder = sortOrderParam === 'asc' ? 'asc' : 'desc';

    const sortFieldMap: Record<string, Prisma.InventoryLogOrderByWithRelationInput> = {
      createdAt: { createdAt: sortOrder },
      changeAmount: { changeAmount: sortOrder },
      item: { itemStock: { itemName: sortOrder } },
    };

    const orderBy =
      sortFieldMap[sortBy] ??
      ({
        createdAt: sortOrder,
      } as Prisma.InventoryLogOrderByWithRelationInput);

    const [totalCount, inventoryLogs, groupedSummaries] = await prisma.$transaction([
      prisma.inventoryLog.count({ where }),
      prisma.inventoryLog.findMany({
        where,
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
        orderBy,
        skip,
        take: pageSize,
      }),
      prisma.inventoryLog.groupBy({
        by: ['changeType'],
        where,
        _sum: {
          changeAmount: true,
        },
        orderBy: {
          changeType: 'asc',
        },
      }),
    ]);

    const summary = groupedSummaries.reduce(
      (acc, item) => {
        const amount = item._sum?.changeAmount ?? 0;
        if (item.changeType === ChangeType.INCREASE) {
          acc.totalIncrease += amount;
        } else if (item.changeType === ChangeType.DECREASE) {
          acc.totalDecrease += amount;
        }
        return acc;
      },
      { totalIncrease: 0, totalDecrease: 0 },
    );

    return NextResponse.json({
      items: inventoryLogs,
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
      summary,
    });
  } catch (error) {
    console.error('Error fetching inventory logs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
