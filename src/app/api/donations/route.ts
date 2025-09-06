import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { Role } from '@prisma/client';
import { generateDonationSerialNumber } from '@/lib/serialNumber';

interface DonorInfo {
  name: string;
  phone?: string;
  address?: string;
}

interface SupplyItem {
  name: string;
  category: string;
  quantity: number;
  expiryDate?: string;
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
    console.log('📥 Request body received:', requestBody);
    
    const { donorInfo, supplyItems, notes }: { donorInfo: DonorInfo, supplyItems: SupplyItem[], notes: string } = requestBody;

    console.log('📦 Supply items received:', supplyItems);
    
    if (!supplyItems || supplyItems.length === 0) {
      console.log('❌ No supply items provided');
      return NextResponse.json({ error: 'Supply items are required' }, { status: 400 });
    }

    // Validate that at least one supply item is valid
    const validSupplyItems = supplyItems.filter(item => 
      item.name && item.name.trim() !== '' && 
      item.category && item.category.trim() !== '' && 
      item.quantity > 0
    );

    console.log('✅ Valid supply items:', validSupplyItems);

    if (validSupplyItems.length === 0) {
      console.log('❌ No valid supply items found');
      return NextResponse.json({ error: 'At least one valid supply item is required' }, { status: 400 });
    }

    const serialNumber = await generateDonationSerialNumber();

    const newDonationRecord = await prisma.donationRecord.create({
      data: {
        serialNumber,
        donorName: donorInfo?.name || '匿名捐贈者',
        donorPhone: donorInfo?.phone || null,
        address: donorInfo?.address || null,
        notes: notes || null,
        userId: currentUser.id,
        donationItems: {
          create: await Promise.all(validSupplyItems.map(async (item: SupplyItem) => {
            // Find or create supply
            let supply = await prisma.supply.findFirst({
              where: { name: item.name, category: item.category },
            });

            if (!supply) {
              supply = await prisma.supply.create({
                data: {
                  name: item.name,
                  category: item.category,
                  quantity: item.quantity, // Initial quantity
                  safetyStock: 0, // Default safety stock
                },
              });
            } else {
              // Update existing supply quantity
              await prisma.supply.update({
                where: { id: supply.id },
                data: {
                  quantity: { increment: item.quantity },
                },
              });
            }

            return {
              supplyId: supply.id,
              quantity: item.quantity,
              expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
            };
          })),
        },
      },
      include: {
        donationItems: true,
      },
    });

    return NextResponse.json(newDonationRecord, { status: 201 });
  } catch (error) {
    console.error('Error creating donation:', error);
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
            supply: true,
          },
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