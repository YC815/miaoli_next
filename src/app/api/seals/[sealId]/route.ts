import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma, Role } from "@prisma/client";
import {
  parseImageDataUrl,
  parseSealCategory,
  requireUser,
  sealToResponse,
} from "../helpers";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sealId: string }> }
): Promise<NextResponse> {
  const { sealId } = await params;
  const { errorResponse } = await requireUser([
    Role.ADMIN,
    Role.STAFF,
    Role.VOLUNTEER,
  ]);
  if (errorResponse) return errorResponse;

  const seal = await prisma.receiptSeal.findUnique({
    where: { id: sealId },
  });

  if (!seal || !seal.isActive) {
    return NextResponse.json({ error: "印章不存在" }, { status: 404 });
  }

  return NextResponse.json(sealToResponse(seal));
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ sealId: string }> }
): Promise<NextResponse> {
  const { user, errorResponse } = await requireUser([Role.ADMIN, Role.STAFF]);
  if (errorResponse) return errorResponse;
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sealId } = await params;

  const existing = await prisma.receiptSeal.findUnique({
    where: { id: sealId },
  });

  if (!existing || !existing.isActive) {
    return NextResponse.json({ error: "印章不存在" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { name, category: rawCategory, imageDataUrl, isActive } = body ?? {};

    const data: Prisma.ReceiptSealUpdateInput = {
      updatedBy: user.id,
    };

    if (typeof name === "string" && name.trim()) {
      data.name = name.trim();
    }

    if (rawCategory !== undefined) {
      const category = parseSealCategory(rawCategory);
      if (!category) {
        return NextResponse.json({ error: "無效的印章類型" }, { status: 400 });
      }
      data.category = category;
    }

    if (imageDataUrl !== undefined) {
      const { base64Data, mimeType } = parseImageDataUrl(imageDataUrl);
      data.imageData = base64Data;
      data.mimeType = mimeType;
    }

    if (typeof isActive === "boolean") {
      data.isActive = isActive;
    }

    const updated = await prisma.receiptSeal.update({
      where: { id: sealId },
      data,
    });

    return NextResponse.json(sealToResponse(updated));
  } catch (error) {
    console.error("Failed to update receipt seal:", error);
    const message =
      error instanceof Error ? error.message : "Failed to update seal";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ sealId: string }> }
): Promise<NextResponse> {
  const { user, errorResponse } = await requireUser([Role.ADMIN, Role.STAFF]);
  if (errorResponse) return errorResponse;
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sealId } = await params;

  const existing = await prisma.receiptSeal.findUnique({
    where: { id: sealId },
  });

  if (!existing || !existing.isActive) {
    return NextResponse.json({ error: "印章不存在" }, { status: 404 });
  }

  await prisma.receiptSeal.update({
    where: { id: sealId },
    data: {
      isActive: false,
      updatedBy: user.id,
    },
  });

  return NextResponse.json({ success: true });
}
