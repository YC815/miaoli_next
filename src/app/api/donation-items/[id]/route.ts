import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { id } = await params;
    const body = await request.json();
    const { isHandled } = body;

    if (typeof isHandled !== "boolean") {
      return NextResponse.json(
        { error: "isHandled must be a boolean" },
        { status: 400 }
      );
    }

    const donationItem = await prisma.donationItem.findUnique({
      where: { id },
    });

    if (!donationItem) {
      return NextResponse.json(
        { error: "Donation item not found" },
        { status: 404 }
      );
    }

    await prisma.donationItem.update({
      where: { id },
      data: { isHandled },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating donation item:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
