import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { Role, ChangeType } from "@prisma/client";

export async function DELETE(
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

    await prisma.$transaction(async (tx) => {
      const inventoryLog = await tx.inventoryLog.findUnique({
        where: { id },
        include: { itemStock: true },
      });

      if (!inventoryLog) {
        throw new Error("Inventory log not found");
      }

      const { itemStock, changeType, changeAmount } = inventoryLog;

      let stockUpdateData;
      if (changeType === ChangeType.INCREASE) {
        stockUpdateData = { decrement: changeAmount };
      } else {
        stockUpdateData = { increment: changeAmount };
      }

      const newTotalStock = await tx.itemStock.update({
        where: {
          id: itemStock.id,
        },
        data: {
          totalStock: stockUpdateData,
        },
        select: {
          totalStock: true,
        },
      });

      if (newTotalStock.totalStock < 0) {
        throw new Error(
          `Reverting this log would result in negative stock for ${itemStock.itemName}. Operation cancelled.`,
        );
      }

      await tx.inventoryLog.delete({
        where: { id },
      });
    });

    return NextResponse.json({ message: "Inventory log deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting inventory log:", error);
    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error.message.includes("negative stock")) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
