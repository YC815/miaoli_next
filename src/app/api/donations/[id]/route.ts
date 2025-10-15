import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { Role } from '@prisma/client';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Only admins and staff can delete donation records
    if (currentUser.role !== Role.ADMIN && currentUser.role !== Role.STAFF) {
      return NextResponse.json({
        error: 'Access denied. Admin or Staff privileges required.',
      }, { status: 403 });
    }

    const { id } = await params;

    // Check if the donation record exists
    const donationRecord = await prisma.donationRecord.findUnique({
      where: { id },
      include: {
        donationItems: true,
      },
    });

    if (!donationRecord) {
      return NextResponse.json(
        { error: 'Donation record not found' },
        { status: 404 }
      );
    }

    // Delete the donation record and its items in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete all donation items first
      await tx.donationItem.deleteMany({
        where: { donationId: id },
      });

      // Delete the donation record
      await tx.donationRecord.delete({
        where: { id },
      });

      // Update item stock totals (decrease by the donated quantities)
      for (const item of donationRecord.donationItems) {
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
    });

    return NextResponse.json({
      success: true,
      message: 'Donation record deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting donation record:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
