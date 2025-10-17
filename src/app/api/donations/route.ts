import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { Prisma, Role } from '@prisma/client';
import { generateDonationSerialNumber } from '@/lib/serialNumber';
import { randomUUID } from 'crypto';

interface DonationItemData {
  itemName: string;
  itemCategory: string;
  itemUnit: string;
  expiryDate?: string;
  isStandard: boolean;
  quantity: number;
  notes?: string;
}

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Donations API POST called');
    
    const { userId: clerkId } = await auth();
    console.log('🔐 ClerkId:', clerkId);
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { clerkId },
    });
    console.log('👤 Current user:', currentUser);

    if (!currentUser || (currentUser.role !== Role.ADMIN && currentUser.role !== Role.STAFF && currentUser.role !== Role.VOLUNTEER)) {
      return NextResponse.json({ 
        error: 'Access denied. Admin, Staff or Volunteer privileges required.' 
      }, { status: 403 });
    }

    const requestBody = await request.json();
    console.log('📥 Request body received:', JSON.stringify(requestBody, null, 2));

    const { donorId, donationItems }: { donorId?: string | null, donationItems: DonationItemData[] } = requestBody;

    console.log('👤 donorId:', donorId ?? 'Anonymous');
    console.log('📦 Donation items details:', JSON.stringify(donationItems, null, 2));

    if (!donationItems || donationItems.length === 0) {
      console.log('❌ No donation items provided');
      return NextResponse.json({ error: 'Donation items are required' }, { status: 400 });
    }

    // Normalize and validate donation items
    let normalizedDonationItems;
    try {
      normalizedDonationItems = donationItems
        .filter(item =>
          item.itemName && item.itemName.trim() !== '' &&
          item.itemCategory && item.itemCategory.trim() !== ''
        )
        .map(item => {
          const quantity = Number(item.quantity);
          if (!Number.isFinite(quantity) || quantity <= 0) {
            throw new Error(`物品「${item.itemName}」缺少有效的數量設定`);
          }

          return {
            itemName: item.itemName.trim(),
            itemCategory: item.itemCategory.trim(),
            itemUnit: item.itemUnit || '個',
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
            isStandard: Boolean(item.isStandard),
            notes: item.notes?.trim() || null,
            quantity: quantity,
          };
        });
    } catch (validationError) {
      const message = validationError instanceof Error
        ? validationError.message
        : 'Donation items validation failed';
      return NextResponse.json({ error: message }, { status: 400 });
    }

    if (normalizedDonationItems.length === 0) {
      return NextResponse.json(
        { error: 'At least one valid donation item is required' },
        { status: 400 }
      );
    }

    const serialNumber = await generateDonationSerialNumber();
    console.log('📝 Generated serial number:', serialNumber);

    const newDonationRecord = await prisma.$transaction(async (tx) => {
      const donationRecord = await tx.donationRecord.create({
        data: {
          id: randomUUID(),
          serialNumber,
          donorId: donorId || null,
          userId: currentUser.id,
          donationItems: {
            create: normalizedDonationItems.map(item => ({
              id: randomUUID(),
              itemName: item.itemName,
              itemCategory: item.itemCategory,
              itemUnit: item.itemUnit,
              expiryDate: item.expiryDate,
              isStandard: item.isStandard,
              quantity: item.quantity,
              notes: item.notes,
            })),
          },
        },
        include: {
          donationItems: true,
          donor: true,
        },
      });

      // Update item stock totals
      for (const item of normalizedDonationItems) {
        await tx.itemStock.upsert({
          where: {
            itemName_itemCategory: {
              itemName: item.itemName,
              itemCategory: item.itemCategory,
            },
          },
          create: {
            id: randomUUID(),
            itemName: item.itemName,
            itemCategory: item.itemCategory,
            itemUnit: item.itemUnit,
            totalStock: item.quantity,
            safetyStock: 0,
            isStandard: item.isStandard,
            updatedAt: new Date(),
          },
          update: {
            totalStock: {
              increment: item.quantity,
            },
            itemUnit: item.itemUnit,
            isStandard: item.isStandard,
            updatedAt: new Date(),
          },
        });
      }

      return donationRecord;
    });

    console.log('✅ Donation record created successfully:', newDonationRecord.id);
    return NextResponse.json(newDonationRecord, { status: 201 });
  } catch (error) {
    console.error('💥 Error creating donation:', error);
    console.error('💥 Error details:', JSON.stringify(error, null, 2));

    // 檢查是否為 Prisma 錯誤
    if (error instanceof Error) {
      console.error('💥 Error message:', error.message);
      console.error('💥 Error stack:', error.stack);
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
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

    // Only admins and staff can view all donation records
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
    const donorIdFilter = searchParams.get('donorId') ?? undefined;
    const itemStockIdFilter = searchParams.get('itemStockId') ?? undefined;
    const categories = normalizeMultiValueParam(searchParams, 'category');
    const itemTypes = normalizeMultiValueParam(searchParams, 'itemType');

    const where: Prisma.DonationRecordWhereInput = {};
    const andConditions: Prisma.DonationRecordWhereInput[] = [];

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
          {
            donor: {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
                { address: { contains: search, mode: 'insensitive' } },
                { taxId: { contains: search, mode: 'insensitive' } },
              ],
            },
          },
          {
            donationItems: {
              some: {
                OR: [
                  { itemName: { contains: search, mode: 'insensitive' } },
                  { itemCategory: { contains: search, mode: 'insensitive' } },
                  { notes: { contains: search, mode: 'insensitive' } },
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

    if (donorIdFilter) {
      andConditions.push({ donorId: donorIdFilter });
    }

    // Filter by itemStockId - need to lookup the item details first
    if (itemStockIdFilter) {
      const itemStock = await prisma.itemStock.findUnique({
        where: { id: itemStockIdFilter },
        select: { itemName: true, itemCategory: true },
      });

      if (itemStock) {
        andConditions.push({
          donationItems: {
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
        donationItems: {
          some: {
            itemCategory: {
              in: categories,
            },
          },
        },
      });
    }

    if (itemTypes.length > 0) {
      const includeStandard = itemTypes.includes('standard');
      const includeCustom = itemTypes.includes('custom');

      if (includeStandard !== includeCustom) {
        andConditions.push({
          donationItems: {
            some: {
              isStandard: includeStandard,
            },
          },
        });
      }
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    const sortBy = searchParams.get('sortBy') ?? 'createdAt';
    const sortOrderParam = searchParams.get('sortOrder');
    const sortOrder = sortOrderParam === 'asc' ? 'asc' : 'desc';

    const sortFieldMap: Record<string, Prisma.DonationRecordOrderByWithRelationInput> = {
      createdAt: { createdAt: sortOrder },
      serialNumber: { serialNumber: sortOrder },
      donor: { donor: { name: sortOrder } },
      items: { donationItems: { _count: sortOrder } },
    };

    const orderBy =
      sortFieldMap[sortBy] ??
      ({
        createdAt: sortOrder,
      } as Prisma.DonationRecordOrderByWithRelationInput);

    const [totalCount, donationRecords, donationQuantitySum] = await prisma.$transaction([
      prisma.donationRecord.count({ where }),
      prisma.donationRecord.findMany({
        where,
        include: {
          donationItems: true,
          donor: true,
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
      prisma.donationItem.aggregate({
        _sum: {
          quantity: true,
        },
        where: {
          donation: {
            ...where,
          },
        },
      }),
    ]);

    return NextResponse.json({
      items: donationRecords,
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
      summary: {
        totalQuantity: donationQuantitySum._sum.quantity ?? 0,
      },
    });
  } catch (error) {
    console.error('Error fetching donation records:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
