import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { Role } from '@prisma/client';
import { generateDonationSerialNumber } from '@/lib/serialNumber';

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

    const { donorId, donationItems }: { donorId: string, donationItems: DonationItemData[] } = requestBody;

    console.log('👤 donorId:', donorId);
    console.log('📦 Donation items details:', JSON.stringify(donationItems, null, 2));

    if (!donorId) {
      console.log('❌ No donor ID provided');
      return NextResponse.json({ error: 'Donor ID is required' }, { status: 400 });
    }

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
          serialNumber,
          donorId,
          userId: currentUser.id,
          donationItems: {
            create: normalizedDonationItems.map(item => ({
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
            itemName: item.itemName,
            itemCategory: item.itemCategory,
            itemUnit: item.itemUnit,
            totalStock: item.quantity,
            safetyStock: 0,
            isStandard: item.isStandard,
          },
          update: {
            totalStock: {
              increment: item.quantity,
            },
            itemUnit: item.itemUnit,
            isStandard: item.isStandard,
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

    // Only admins and staff can view all donation records
    if (currentUser.role !== Role.ADMIN && currentUser.role !== Role.STAFF) {
      return NextResponse.json({
        error: 'Access denied. Admin or Staff privileges required.',
      }, { status: 403 });
    }

    const donationRecords = await prisma.donationRecord.findMany({
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(donationRecords);
  } catch (error) {
    console.error('Error fetching donation records:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
