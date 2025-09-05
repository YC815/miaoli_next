import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { Role } from '@prisma/client';

interface PickupInfo {
  unit: string;
  phone?: string;
  purpose?: string;
}

interface SelectedItem {
  id: string;
  name: string;
  requestedQuantity: number;
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

        const { pickupInfo, selectedItems }: { pickupInfo: PickupInfo, selectedItems: SelectedItem[] } = await request.json();

    if (!pickupInfo || !pickupInfo.unit || !selectedItems || selectedItems.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if quantities are available
    for (const item of selectedItems) {
      const supply = await prisma.supply.findUnique({
        where: { id: item.id },
      });

      if (!supply || supply.quantity < item.requestedQuantity) {
        return NextResponse.json({ error: `Insufficient quantity for ${item.name}` }, { status: 400 });
      }
    }

    const newDisbursement = await prisma.disbursement.create({
      data: {
        recipientUnit: pickupInfo.unit,
        recipientPhone: pickupInfo.phone || null,
        purpose: pickupInfo.purpose || null,
        userId: currentUser.id,
        disbursementItems: {
          create: selectedItems.map((item: SelectedItem) => ({
            supplyId: item.id,
            quantity: item.requestedQuantity,
          })),
        },
      },
      include: {
        disbursementItems: true,
      },
    });

    // Deduct quantities from supplies
    for (const item of selectedItems) {
      await prisma.supply.update({
        where: { id: item.id },
        data: {
          quantity: { decrement: item.requestedQuantity },
        },
      });
    }

    return NextResponse.json(newDisbursement, { status: 201 });
  } catch (error) {
    console.error('Error creating disbursement:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
