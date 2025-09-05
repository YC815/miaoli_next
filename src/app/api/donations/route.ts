import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { Role } from '@prisma/client';

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
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!currentUser || (currentUser.role !== Role.ADMIN && currentUser.role !== Role.STAFF && currentUser.role !== Role.VOLUNTEER)) {
      return NextResponse.json({ 
        error: 'Access denied. Admin, Staff or Volunteer privileges required.' 
      }, { status: 403 });
    }

        const { donorInfo, supplyItems, notes }: { donorInfo: DonorInfo, supplyItems: SupplyItem[], notes: string } = await request.json();

    if (!donorInfo || !donorInfo.name || !supplyItems || supplyItems.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newDonationRecord = await prisma.donationRecord.create({
      data: {
        donorName: donorInfo.name,
        donorPhone: donorInfo.phone || null,
        address: donorInfo.address || null,
        notes: notes || null,
        userId: currentUser.id,
        donationItems: {
          create: await Promise.all(supplyItems.map(async (item: SupplyItem) => {
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