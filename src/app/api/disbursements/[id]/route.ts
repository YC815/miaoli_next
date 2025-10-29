import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!currentUser || currentUser.role !== Role.ADMIN) {
      return NextResponse.json(
        { error: "Access denied. Admin privileges required." },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { recipientUnitId, recipientUnitName, recipientPhone, recipientAddress } = body;

    // DEBUG: 記錄收到的資料
    console.log('📥 [PATCH /api/disbursements] 收到的 body:', JSON.stringify(body, null, 2));
    console.log('📥 recipientUnitId:', recipientUnitId);

    // Check if the disbursement record exists
    const existingRecord = await prisma.disbursement.findUnique({
      where: { id },
      include: {
        disbursementItems: true,
      },
    });

    if (!existingRecord) {
      return NextResponse.json(
        { error: "Disbursement record not found" },
        { status: 404 }
      );
    }

    // If recipientUnitId is being updated, fetch the unit details
    let unitDetails = null;
    if (recipientUnitId !== undefined && recipientUnitId !== null) {
      unitDetails = await prisma.recipientUnit.findUnique({
        where: { id: recipientUnitId },
        select: {
          name: true,
          phone: true,
          address: true,
        },
      });

      if (!unitDetails) {
        return NextResponse.json(
          { error: "Recipient unit not found" },
          { status: 404 }
        );
      }
    }

    // Prepare update data
    const updateData: {
      recipientUnitId?: string | null;
      recipientUnitName?: string;
      recipientPhone?: string | null;
      recipientAddress?: string | null;
    } = {};

    // Update recipientUnitId if provided
    if (recipientUnitId !== undefined) {
      updateData.recipientUnitId = recipientUnitId || null;

      // If we have unit details, update related fields
      if (unitDetails) {
        updateData.recipientUnitName = unitDetails.name;
        updateData.recipientPhone = unitDetails.phone;
        updateData.recipientAddress = unitDetails.address;
      }
    }

    // Allow manual override of individual fields (if provided in request)
    if (recipientUnitName !== undefined) {
      updateData.recipientUnitName = recipientUnitName;
    }
    if (recipientPhone !== undefined) {
      updateData.recipientPhone = recipientPhone || null;
    }
    if (recipientAddress !== undefined) {
      updateData.recipientAddress = recipientAddress || null;
    }

    // DEBUG: 記錄準備寫入的資料
    console.log('⚙️ [PATCH /api/disbursements] 準備 update 的 data:', JSON.stringify(updateData, null, 2));

    // Update disbursement record
    const updatedRecord = await prisma.disbursement.update({
      where: { id },
      data: updateData,
      include: {
        disbursementItems: true,
        recipientUnit: true,
        user: {
          select: {
            id: true,
            nickname: true,
          },
        },
      },
    });

    // DEBUG: 記錄更新後的結果
    console.log('✅ [PATCH /api/disbursements] Update 成功！');
    console.log('✅ 更新後的 recipientUnitId:', updatedRecord.recipientUnitId);
    console.log('✅ 更新後的 recipientUnitName:', updatedRecord.recipientUnitName);

    return NextResponse.json(updatedRecord, { status: 200 });
  } catch (error) {
    console.error("Error updating disbursement record:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!currentUser || currentUser.role !== Role.ADMIN) {
      return NextResponse.json(
        { error: "Access denied. Admin privileges required." },
        { status: 403 },
      );
    }

    await prisma.$transaction(async (tx) => {
      const disbursement = await tx.disbursement.findUnique({
        where: { id },
        include: {
          disbursementItems: true,
        },
      });

      if (!disbursement) {
        throw new Error("Disbursement record not found");
      }

      // 1. Restore stock quantities
      for (const item of disbursement.disbursementItems) {
        await tx.itemStock.update({
          where: {
            itemName_itemCategory: {
              itemName: item.itemName,
              itemCategory: item.itemCategory,
            },
          },
          data: {
            totalStock: {
              increment: item.quantity,
            },
          },
        });
      }

      // 2. Delete disbursement items (child records)
      await tx.disbursementItem.deleteMany({
        where: { disbursementId: id },
      });

      // 3. Delete disbursement record (parent record)
      await tx.disbursement.delete({
        where: { id },
      });
    });

    return NextResponse.json({ message: "Disbursement record deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting disbursement record:", error);
    if (error instanceof Error && error.message === "Disbursement record not found") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
