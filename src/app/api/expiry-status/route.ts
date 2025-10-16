import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

const EXPIRY_THRESHOLD_DAYS = 30;
const DEFAULT_PAGE_SIZE = 25;

export async function GET(request: Request) {
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

    const url = new URL(request.url);
    const includeDetails = url.searchParams.get("detail") === "full";
    const pageParam = url.searchParams.get("page");
    const pageSizeParam = url.searchParams.get("pageSize");

    const page = pageParam ? Math.max(1, parseInt(pageParam, 10)) : 1;
    const pageSize = pageSizeParam
      ? Math.min(100, Math.max(1, parseInt(pageSizeParam, 10)))
      : DEFAULT_PAGE_SIZE;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thresholdDate = addDays(today, EXPIRY_THRESHOLD_DAYS);

    // Count ONLY unhandled items for summary (but display all in list)
    const expiringCount = await prisma.donationItem.count({
      where: {
        expiryDate: {
          not: null,
          gte: today,
          lte: thresholdDate,
        },
        isHandled: false,
      },
    });

    const expiredCount = await prisma.donationItem.count({
      where: {
        expiryDate: {
          not: null,
          lt: today,
        },
        isHandled: false,
      },
    });

    // Get total counts (including handled items) for pagination
    const totalExpiringItems = await prisma.donationItem.count({
      where: {
        expiryDate: {
          not: null,
          gte: today,
          lte: thresholdDate,
        },
      },
    });

    const totalExpiredItems = await prisma.donationItem.count({
      where: {
        expiryDate: {
          not: null,
          lt: today,
        },
      },
    });

    const summary = {
      expiring: expiringCount,
      expired: expiredCount,
      updatedAt: new Date().toISOString(),
    };

    if (!includeDetails) {
      return NextResponse.json({ summary });
    }

    // Fetch ALL paginated expiring items (both handled and unhandled)
    const expiringItems = await prisma.donationItem.findMany({
      where: {
        expiryDate: {
          not: null,
          gte: today,
          lte: thresholdDate,
        },
      },
      select: {
        id: true,
        itemName: true,
        itemCategory: true,
        itemUnit: true,
        quantity: true,
        expiryDate: true,
        isHandled: true,
        donation: {
          select: {
            id: true,
            serialNumber: true,
          },
        },
      },
      orderBy: {
        expiryDate: "asc",
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    // Fetch ALL paginated expired items (both handled and unhandled)
    const expiredItems = await prisma.donationItem.findMany({
      where: {
        expiryDate: {
          not: null,
          lt: today,
        },
      },
      select: {
        id: true,
        itemName: true,
        itemCategory: true,
        itemUnit: true,
        quantity: true,
        expiryDate: true,
        isHandled: true,
        donation: {
          select: {
            id: true,
            serialNumber: true,
          },
        },
      },
      orderBy: {
        expiryDate: "asc",
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const mapItem = (item: typeof expiringItems[number]) => {
      const daysUntilExpiry = item.expiryDate
        ? calculateDaysBetween(today, item.expiryDate)
        : null;

      return {
        id: item.id,
        itemName: item.itemName,
        itemCategory: item.itemCategory,
        itemUnit: item.itemUnit,
        quantity: item.quantity,
        expiryDate: item.expiryDate?.toISOString() ?? null,
        daysUntilExpiry,
        isHandled: item.isHandled,
        serialNumber: item.donation?.serialNumber ?? null,
        donationId: item.donation?.id ?? null,
      };
    };

    return NextResponse.json({
      summary,
      expiringItems: expiringItems.map(mapItem),
      expiredItems: expiredItems.map(mapItem),
      pagination: {
        page,
        pageSize,
        totalExpiring: totalExpiringItems,
        totalExpired: totalExpiredItems,
        totalPagesExpiring: Math.ceil(totalExpiringItems / pageSize),
        totalPagesExpired: Math.ceil(totalExpiredItems / pageSize),
      },
    });
  } catch (error) {
    console.error("Error fetching expiry status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function calculateDaysBetween(start: Date, end: Date) {
  const startUTC = Date.UTC(
    start.getFullYear(),
    start.getMonth(),
    start.getDate()
  );
  const endUTC = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.floor((endUTC - startUTC) / (1000 * 60 * 60 * 24));
}
