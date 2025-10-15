import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { Role } from '@prisma/client';
import { generateDisbursementSerialNumber } from '@/lib/serialNumber';

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

    const unitName = (pickupInfo.unitName ?? pickupInfo.unit ?? '').trim();
    if (!unitName) {
      throw createValidationError('領取單位為必填欄位');
    }

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
          serialNumber,
          recipientUnitName: unitName,
          recipientUnitId: resolvedUnitId ?? undefined,
          recipientPhone: resolvedPhone || null,
          recipientAddress: resolvedAddress || null,
          userId: currentUser.id,
          disbursementItems: {
            create: normalizedItems.map(item => ({
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

    if (error instanceof Error && (error as Error & { code?: string }).code === 'VALIDATION_ERROR') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

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

    // Only admins and staff can view all disbursement records
    if (currentUser.role !== Role.ADMIN && currentUser.role !== Role.STAFF) {
      return NextResponse.json({
        error: 'Access denied. Admin or Staff privileges required.',
      }, { status: 403 });
    }

    const disbursementRecords = await prisma.disbursement.findMany({
      include: {
        disbursementItems: true,
        user: {
          select: {
            id: true,
            nickname: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(disbursementRecords);
  } catch (error) {
    console.error('Error fetching disbursement records:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
