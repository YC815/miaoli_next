import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import {
  ReceiptSeal,
  ReceiptSealCategory,
  Role,
  User,
} from "@prisma/client";

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
]);

export const MAX_SEAL_IMAGE_BYTES = 2 * 1024 * 1024; // 2MB

export interface AuthResult {
  user: User | null;
  errorResponse?: NextResponse;
}

export function buildSealImageUrl(seal: ReceiptSeal): string {
  const timestamp = seal.updatedAt.getTime();
  return `/api/seals/${seal.id}/image?updatedAt=${timestamp}`;
}

export function sealToResponse(seal: ReceiptSeal) {
  return {
    id: seal.id,
    name: seal.name,
    category: seal.category,
    imageUrl: buildSealImageUrl(seal),
    createdAt: seal.createdAt,
    updatedAt: seal.updatedAt,
    mimeType: seal.mimeType,
  };
}

export async function requireUser(requiredRoles?: Role[]): Promise<AuthResult> {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return {
      user: null,
      errorResponse: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const user = await prisma.user.findUnique({
    where: { clerkId },
  });

  if (!user) {
    return {
      user: null,
      errorResponse: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (requiredRoles && !requiredRoles.includes(user.role)) {
    return {
      user: null,
      errorResponse: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { user };
}

export function parseSealCategory(value: unknown): ReceiptSealCategory | null {
  if (typeof value !== "string") return null;
  const upper = value.toUpperCase() as keyof typeof ReceiptSealCategory;
  if (upper in ReceiptSealCategory) {
    return ReceiptSealCategory[upper];
  }
  return null;
}

export interface ParsedImageDataUrl {
  base64Data: string;
  mimeType: string;
  buffer: Buffer;
}

export function parseImageDataUrl(imageDataUrl: unknown): ParsedImageDataUrl {
  if (typeof imageDataUrl !== "string") {
    throw new Error("Image data must be a string");
  }

  const match = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error("Invalid image data URL");
  }

  const mimeType = match[1];
  if (!ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) {
    throw new Error("Unsupported image type. Please upload PNG or JPEG");
  }

  const base64Data = match[2];
  let buffer: Buffer;
  try {
    buffer = Buffer.from(base64Data, "base64");
  } catch {
    throw new Error("Image data is not valid base64");
  }

  if (buffer.length === 0) {
    throw new Error("Image data is empty");
  }

  if (buffer.length > MAX_SEAL_IMAGE_BYTES) {
    throw new Error("Image size exceeds 2MB limit");
  }

  return { base64Data, mimeType, buffer };
}
