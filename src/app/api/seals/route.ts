import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";
import {
  parseImageDataUrl,
  parseSealCategory,
  requireUser,
  sealToResponse,
} from "./helpers";

export async function GET(request: NextRequest) {
  const { user, errorResponse } = await requireUser([
    Role.ADMIN,
    Role.STAFF,
    Role.VOLUNTEER,
  ]);
  if (errorResponse) return errorResponse;
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const includeInactive = searchParams.get("includeInactive") === "true";

  const seals = await prisma.receiptSeal.findMany({
    where: includeInactive
      ? undefined
      : {
          isActive: true,
        },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(seals.map(sealToResponse));
}

export async function POST(request: NextRequest) {
  const { user, errorResponse } = await requireUser([Role.ADMIN, Role.STAFF]);
  if (errorResponse) return errorResponse;
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, category: rawCategory, imageDataUrl } = body ?? {};

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "印章名稱不可為空" },
        { status: 400 }
      );
    }

    const category = parseSealCategory(rawCategory);
    if (!category) {
      return NextResponse.json({ error: "無效的印章類型" }, { status: 400 });
    }

    const { base64Data, mimeType } = parseImageDataUrl(imageDataUrl);

    const seal = await prisma.receiptSeal.create({
      data: {
        name: name.trim(),
        category,
        imageData: base64Data,
        mimeType,
        createdBy: user.id,
        updatedBy: user.id,
      },
    });

    return NextResponse.json(sealToResponse(seal), { status: 201 });
  } catch (error) {
    console.error("Failed to create receipt seal:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create seal";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

