import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";
import {
  requireUser,
  sealToResponse,
} from "./helpers";

/**
 * GET /api/seals
 *
 * Returns all user seals (read-only).
 * Used by the SealManagement page to display all users' stamps.
 *
 * To manage your own seal, use PUT /api/users/profile
 */
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

