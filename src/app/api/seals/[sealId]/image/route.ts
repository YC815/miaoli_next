import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";
import { requireUser } from "../../helpers";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sealId: string }> }
): Promise<NextResponse> {
  const { errorResponse } = await requireUser([
    Role.ADMIN,
    Role.STAFF,
    Role.VOLUNTEER,
  ]);
  if (errorResponse) return errorResponse;

  const { sealId } = await params;

  const seal = await prisma.receiptSeal.findUnique({
    where: { id: sealId },
  });

  if (!seal || !seal.isActive) {
    return NextResponse.json({ error: "印章不存在" }, { status: 404 });
  }

  try {
    const buffer = Buffer.from(seal.imageData, "base64");
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": seal.mimeType ?? "image/png",
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Failed to decode seal image:", error);
    return NextResponse.json(
      { error: "Failed to load image" },
      { status: 500 }
    );
  }
}
