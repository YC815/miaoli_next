import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params as { id: string };
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