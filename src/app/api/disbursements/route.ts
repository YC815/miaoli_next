import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { Prisma, Role } from '@prisma/client';
import { generateDisbursementSerialNumber } from '@/lib/serialNumber';
import { randomUUID } from 'crypto';
import { classifyError } from '@/lib/errors';

interface PickupInfo {
  unitId?: string;
  unitName?: string;
  unit?: string; // legacy support
  phone?: string;
  address?: string;
}

interface SelectedItemData {
  itemName?: string;
  itemCategory?: string;
  itemUnit?: string;
  quantity?: number;
  requestedQuantity?: number;
}

type NormalizedSelectedItem = {
  itemName: string;
  itemCategory: string;
  itemUnit: string;
  quantity: number;
};

const createValidationError = (message: string) => {
  const error = new Error(message);
  (error as Error & { code?: string }).code = 'VALIDATION_ERROR';
  return error;
};

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (
      !currentUser ||
      (currentUser.role !== Role.ADMIN &&
        currentUser.role !== Role.STAFF &&
        currentUser.role !== Role.VOLUNTEER)
    ) {
      return NextResponse.json({
        error: 'Access denied. Admin, Staff or Volunteer privileges required.',
      }, { status: 403 });
    }

    const { pickupInfo, selectedItems }: { pickupInfo: PickupInfo; selectedItems: SelectedItemData[] } = await request.json();

    if (!pickupInfo || !Array.isArray(selectedItems) || selectedItems.length === 0) {
      throw createValidationError('Missing selected items');
    }

    const unitName = (pickupInfo.unitName ?? pickupInfo.unit ?? '').trim() || '臨時領取';

    const normalizedItems: NormalizedSelectedItem[] = selectedItems
      .map(item => {
        const itemName = item.itemName?.trim();
        const itemCategory = item.itemCategory?.trim();
        const itemUnit = (item.itemUnit ?? (item as unknown as { unit?: string }).unit ?? '個').toString().trim();
        const quantity = Number(item.quantity ?? item.requestedQuantity ?? 0);

        if (!itemName || !itemCategory || !Number.isFinite(quantity) || quantity <= 0) {
          return null;
        }

        return {
          itemName,
          itemCategory,
          itemUnit: itemUnit || '個',
          quantity: Math.floor(quantity),
        };
      })
      .filter((item): item is NormalizedSelectedItem => item !== null);

    if (normalizedItems.length === 0) {
      throw createValidationError('請至少選擇一項有效的物資');
    }

    const serialNumber = await generateDisbursementSerialNumber();

    const disbursementId = await prisma.$transaction(async (tx) => {
      let resolvedUnitId = pickupInfo.unitId?.trim() || null;
      let resolvedPhone = pickupInfo.phone?.trim() || '';
      let resolvedAddress = pickupInfo.address?.trim() || '';

      if (resolvedUnitId) {
        const existingUnit = await tx.recipientUnit.findUnique({
          where: { id: resolvedUnitId },
        });

        if (!existingUnit) {
          throw createValidationError('指定的領取單位不存在');
        }

        if (!resolvedPhone) {
          resolvedPhone = existingUnit.phone ?? '';
        }
        if (!resolvedAddress) {
          resolvedAddress = existingUnit.address ?? '';
        }
      } else {
        const existingUnit = await tx.recipientUnit.findUnique({
          where: { name: unitName },
        });

        if (existingUnit) {
          resolvedUnitId = existingUnit.id;
          if (!resolvedPhone) {
            resolvedPhone = existingUnit.phone ?? '';
          }
          if (!resolvedAddress) {
            resolvedAddress = existingUnit.address ?? '';
          }
        }
      }

      for (const item of normalizedItems) {
        const stock = await tx.itemStock.findUnique({
          where: {
            itemName_itemCategory: {
              itemName: item.itemName,
              itemCategory: item.itemCategory,
            },
          },
        });

        if (!stock || stock.totalStock < item.quantity) {
          throw createValidationError(
            `物資「${item.itemName}」庫存不足（需求 ${item.quantity}，現有 ${stock?.totalStock ?? 0}）`
          );
        }
      }

      const disbursement = await tx.disbursement.create({
        data: {
          id: randomUUID(),
          serialNumber,
          recipientUnitName: unitName,
          recipientUnitId: resolvedUnitId ?? undefined,
          recipientPhone: resolvedPhone || null,
          recipientAddress: resolvedAddress || null,
          userId: currentUser.id,
          disbursementItems: {
            create: normalizedItems.map(item => ({
              id: randomUUID(),
              itemName: item.itemName,
              itemCategory: item.itemCategory,
              itemUnit: item.itemUnit,
              quantity: item.quantity,
            })),
          },
        },
        include: {
          disbursementItems: true,
        },
      });

      for (const item of normalizedItems) {
        await tx.itemStock.update({
          where: {
            itemName_itemCategory: {
              itemName: item.itemName,
              itemCategory: item.itemCategory,
            },
          },
          data: {
            totalStock: {
              decrement: item.quantity,
            },
            updatedAt: new Date(),
          },
        });
      }

      return disbursement.id;
    });

    const disbursementRecord = await prisma.disbursement.findUnique({
      where: { id: disbursementId },
      include: {
        disbursementItems: true,
        recipientUnit: true,
      },
    });

    return NextResponse.json(disbursementRecord, { status: 201 });
  } catch (error) {
    console.error('Error creating disbursement:', error);

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

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 25;

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

    // Only admins and staff can view all disbursement records
    if (currentUser.role !== Role.ADMIN && currentUser.role !== Role.STAFF) {
      return NextResponse.json({
        error: 'Access denied. Admin or Staff privileges required.',
      }, { status: 403 });
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
    const recipientUnitId = searchParams.get('recipientUnitId') ?? undefined;
    const itemStockIdFilter = searchParams.get('itemStockId') ?? undefined;
    const categories = normalizeMultiValueParam(searchParams, 'category');

    const where: Prisma.DisbursementWhereInput = {};
    const andConditions: Prisma.DisbursementWhereInput[] = [];

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
          { serialNumber: { contains: search, mode: 'insensitive' } },
          { recipientUnitName: { contains: search, mode: 'insensitive' } },
          { recipientPhone: { contains: search, mode: 'insensitive' } },
          { recipientAddress: { contains: search, mode: 'insensitive' } },
          {
            disbursementItems: {
              some: {
                OR: [
                  { itemName: { contains: search, mode: 'insensitive' } },
                  { itemCategory: { contains: search, mode: 'insensitive' } },
                ],
              },
            },
          },
          {
            user: {
              nickname: { contains: search, mode: 'insensitive' },
            },
          },
        ],
      });
    }

    if (userIdFilter) {
      andConditions.push({ userId: userIdFilter });
    }

    if (recipientUnitId) {
      andConditions.push({ recipientUnitId });
    }

    // Filter by itemStockId - need to lookup the item details first
    if (itemStockIdFilter) {
      const itemStock = await prisma.itemStock.findUnique({
        where: { id: itemStockIdFilter },
        select: { itemName: true, itemCategory: true },
      });

      if (itemStock) {
        andConditions.push({
          disbursementItems: {
            some: {
              itemName: itemStock.itemName,
              itemCategory: itemStock.itemCategory,
            },
          },
        });
      }
    }

    if (categories.length > 0) {
      andConditions.push({
        disbursementItems: {
          some: {
            itemCategory: {
              in: categories,
            },
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

    const sortFieldMap: Record<string, Prisma.DisbursementOrderByWithRelationInput> = {
      createdAt: { createdAt: sortOrder },
      serialNumber: { serialNumber: sortOrder },
      unit: { recipientUnitName: sortOrder },
      items: { disbursementItems: { _count: sortOrder } },
    };

    const orderBy =
      sortFieldMap[sortBy] ??
      ({
        createdAt: sortOrder,
      } as Prisma.DisbursementOrderByWithRelationInput);

    const [totalCount, disbursementRecords, disbursementSummary] = await prisma.$transaction([
      prisma.disbursement.count({ where }),
      prisma.disbursement.findMany({
        where,
        include: {
          disbursementItems: true,
          recipientUnit: {
            select: {
              id: true,
              name: true,
              serviceCount: true,
            },
          },
          user: {
            select: {
              id: true,
              nickname: true,
            },
          },
        },
        orderBy,
        skip,
        take: pageSize,
      }),
      prisma.disbursementItem.aggregate({
        _sum: {
          quantity: true,
        },
        where: {
          disbursement: {
            ...where,
          },
        },
      }),
    ]);

    return NextResponse.json({
      items: disbursementRecords,
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
      summary: {
        totalQuantity: disbursementSummary._sum.quantity ?? 0,
      },
    });
  } catch (error) {
    console.error('Error fetching disbursement records:', error);

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
