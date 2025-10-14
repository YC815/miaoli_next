import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { Role } from '@prisma/client';
import { generateDisbursementSerialNumber } from '@/lib/serialNumber';

interface PickupInfo {
  unit: string;
  phone?: string;
}

interface ItemConditionSelection {
  condition: string;
  requestedQuantity: number;
  notes?: string;
}

interface SelectedItemData {
  itemName: string;
  itemCategory: string;
  itemUnit: string;
  conditionSelections: ItemConditionSelection[];
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

        const { pickupInfo, selectedItems }: { pickupInfo: PickupInfo, selectedItems: SelectedItemData[] } = await request.json();

    if (!pickupInfo || !pickupInfo.unit || !selectedItems || selectedItems.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate that each item has valid condition selections
    for (const item of selectedItems) {
      if (!item.conditionSelections || item.conditionSelections.length === 0) {
        return NextResponse.json({
          error: `No condition selections for item: ${item.itemName}`
        }, { status: 400 });
      }

      for (const selection of item.conditionSelections) {
        if (selection.requestedQuantity <= 0) {
          return NextResponse.json({
            error: `Invalid quantity for ${item.itemName} (${selection.condition})`
          }, { status: 400 });
        }
      }
    }

    // Check if quantities are available by looking at ItemConditions from donation records
    for (const item of selectedItems) {
      const itemStock = await prisma.itemStock.findUnique({
        where: {
          itemName_itemCategory: {
            itemName: item.itemName,
            itemCategory: item.itemCategory
          }
        }
      });

      if (!itemStock) {
        return NextResponse.json({
          error: `Item not found: ${item.itemName}`
        }, { status: 400 });
      }

      // Check available quantities for each condition
      for (const selection of item.conditionSelections) {
        const availableConditions = await prisma.itemCondition.findMany({
          where: {
            donationItem: {
              itemName: item.itemName,
              itemCategory: item.itemCategory
            },
            condition: selection.condition,
            disbursementItemId: null // Not yet disbursed
          }
        });

        const totalAvailable = availableConditions.reduce((sum, cond) => sum + cond.quantity, 0);

        if (totalAvailable < selection.requestedQuantity) {
          return NextResponse.json({
            error: `Insufficient quantity for ${item.itemName} (${selection.condition}): requested ${selection.requestedQuantity}, available ${totalAvailable}`
          }, { status: 400 });
        }
      }
    }

    const serialNumber = await generateDisbursementSerialNumber();

    const newDisbursement = await prisma.disbursement.create({
      data: {
        serialNumber,
        recipientUnit: pickupInfo.unit,
        recipientPhone: pickupInfo.phone || null,
        userId: currentUser.id,
        disbursementItems: {
          create: selectedItems.map((item: SelectedItemData) => ({
            itemName: item.itemName,
            itemCategory: item.itemCategory,
            itemUnit: item.itemUnit,
            itemConditions: {
              create: item.conditionSelections.map(selection => ({
                condition: selection.condition,
                quantity: selection.requestedQuantity,
                notes: selection.notes || null
              }))
            }
          })),
        },
      },
      include: {
        disbursementItems: {
          include: {
            itemConditions: true
          }
        },
      },
    });

    // Mark ItemConditions as disbursed and update item stock
    for (const item of selectedItems) {
      const disbursementItem = newDisbursement.disbursementItems.find(
        di => di.itemName === item.itemName && di.itemCategory === item.itemCategory
      );

      if (disbursementItem) {
        for (const selection of item.conditionSelections) {
          // Find available donation conditions to mark as disbursed
          const availableConditions = await prisma.itemCondition.findMany({
            where: {
              donationItem: {
                itemName: item.itemName,
                itemCategory: item.itemCategory
              },
              condition: selection.condition,
              disbursementItemId: null
            },
            orderBy: { createdAt: 'asc' } // FIFO
          });

          let remainingQuantity = selection.requestedQuantity;
          for (const availableCondition of availableConditions) {
            if (remainingQuantity <= 0) break;

            const quantityToTake = Math.min(remainingQuantity, availableCondition.quantity);

            if (quantityToTake === availableCondition.quantity) {
              // Take the entire condition
              await prisma.itemCondition.update({
                where: { id: availableCondition.id },
                data: { disbursementItemId: disbursementItem.id }
              });
            } else {
              // Split the condition
              await prisma.itemCondition.update({
                where: { id: availableCondition.id },
                data: { quantity: availableCondition.quantity - quantityToTake }
              });

              // Create a new condition record for the disbursed part
              await prisma.itemCondition.create({
                data: {
                  condition: availableCondition.condition,
                  quantity: quantityToTake,
                  notes: availableCondition.notes,
                  disbursementItemId: disbursementItem.id
                }
              });
            }

            remainingQuantity -= quantityToTake;
          }
        }

        // Update item stock
        const totalQuantityTaken = item.conditionSelections.reduce(
          (sum, selection) => sum + selection.requestedQuantity, 0
        );

        await prisma.itemStock.update({
          where: {
            itemName_itemCategory: {
              itemName: item.itemName,
              itemCategory: item.itemCategory
            }
          },
          data: {
            totalStock: { decrement: totalQuantityTaken }
          }
        });
      }
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
        disbursementItems: {
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

    return NextResponse.json(disbursementRecords);
  } catch (error) {
    console.error('Error fetching disbursement records:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
