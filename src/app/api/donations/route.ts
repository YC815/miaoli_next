import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { Role } from '@prisma/client';
import { generateDonationSerialNumber } from '@/lib/serialNumber';

interface DonorInfo {
  name: string;
  phone?: string;
  unifiedNumber?: string;
  address?: string;
}

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

    const { donorInfo, donationItems }: { donorInfo: DonorInfo, donationItems: DonationItemData[] } = requestBody;

    console.log('👤 Donor info details:', JSON.stringify(donorInfo, null, 2));
    console.log('📦 Donation items details:', JSON.stringify(donationItems, null, 2));
    
    if (!donationItems || donationItems.length === 0) {
      console.log('❌ No donation items provided');
      return NextResponse.json({ error: 'Donation items are required' }, { status: 400 });
    }

    // Validate that at least one donation item is valid
    const validDonationItems = donationItems.filter(item =>
      item.itemName && item.itemName.trim() !== '' &&
      item.itemCategory && item.itemCategory.trim() !== ''
    );

    console.log('✅ Valid donation items:', validDonationItems);

    if (validDonationItems.length === 0) {
      console.log('❌ No valid donation items found');
      return NextResponse.json({ error: 'At least one valid donation item is required' }, { status: 400 });
    }

    const serialNumber = await generateDonationSerialNumber();
    console.log('📝 Generated serial number:', serialNumber);

    const donationData = {
      serialNumber,
      donorName: donorInfo?.name || '匿名捐贈者',
      donorPhone: donorInfo?.phone || null,
      unifiedNumber: donorInfo?.unifiedNumber || null,
      address: donorInfo?.address || null,
      userId: currentUser.id,
      donationItems: {
        create: validDonationItems.map((item: DonationItemData) => ({
          itemName: item.itemName,
          itemCategory: item.itemCategory,
          itemUnit: item.itemUnit,
          expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
          isStandard: Boolean(item.isStandard),
          quantity: Number(item.quantity),
          notes: item.notes || null
        })),
      },
    };

    console.log('🗄️ Creating donation record with data:', JSON.stringify(donationData, null, 2));

    const newDonationRecord = await prisma.donationRecord.create({
      data: donationData,
      include: {
        donationItems: true
      },
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
        donationItems: {
          include: {
            itemConditions: true
          }
        },
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