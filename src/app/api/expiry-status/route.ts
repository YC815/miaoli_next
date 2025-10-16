import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

const EXPIRY_THRESHOLD_DAYS = 30;
const KEY_SEPARATOR = "::";

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

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thresholdDate = addDays(today, EXPIRY_THRESHOLD_DAYS);

    const stocks = await prisma.itemStock.findMany({
      select: {
        id: true,
        itemName: true,
        itemCategory: true,
        itemUnit: true,
        totalStock: true,
      },
    });

    const stockMap = new Map<string, (typeof stocks)[number]>();
    stocks.forEach((stock) => {
      if (stock.totalStock <= 0) return;
      const key = buildKey(stock.itemName, stock.itemCategory);
      stockMap.set(key, stock);
    });

    const donationGroups = await prisma.donationItem.groupBy({
      by: ["itemName", "itemCategory"],
      where: {
        expiryDate: {
          not: null,
        },
      },
      _min: {
        expiryDate: true,
      },
    });

    const itemMeta = new Map<
      string,
      {
        soonestExpiry: Date;
        daysUntilExpiry: number;
      }
    >();

    const expiringKeys: string[] = [];
    const expiredKeys: string[] = [];

    donationGroups.forEach((group) => {
      const key = buildKey(group.itemName, group.itemCategory);
      const stock = stockMap.get(key);
      const minExpiry = group._min.expiryDate;
      if (!stock || !minExpiry) {
        return;
      }

      const daysUntil = calculateDaysBetween(today, minExpiry);
      itemMeta.set(key, {
        soonestExpiry: minExpiry,
        daysUntilExpiry: daysUntil,
      });

      if (minExpiry < today) {
        expiredKeys.push(key);
      } else if (minExpiry <= thresholdDate) {
        expiringKeys.push(key);
      }
    });

    const summary = {
      expiring: expiringKeys.length,
      expired: expiredKeys.length,
      updatedAt: new Date().toISOString(),
    };

    if (!includeDetails) {
      return NextResponse.json({ summary });
    }

    const relevantKeys = Array.from(new Set([...expiringKeys, ...expiredKeys]));

    type DonationItemWithDonation = Prisma.DonationItemGetPayload<{
      select: {
        itemName: true;
        itemCategory: true;
        expiryDate: true;
        quantity: true;
        donationId: true;
        donation: {
          select: {
            id: true;
            serialNumber: true;
          };
        };
      };
    }>;

    let donationItems: DonationItemWithDonation[] = [];

    if (relevantKeys.length > 0) {
      donationItems = await prisma.donationItem.findMany({
        where: {
          expiryDate: {
            not: null,
          },
          OR: relevantKeys.map((key) => {
            const [itemName, itemCategory] = key.split(KEY_SEPARATOR);
            return {
              itemName,
              itemCategory,
            };
          }),
        },
        select: {
          itemName: true,
          itemCategory: true,
          expiryDate: true,
          quantity: true,
          donationId: true,
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
      });
    }

    const donationByKey = new Map<string, DonationItemWithDonation[]>();
    donationItems.forEach((donationItem) => {
      const key = buildKey(donationItem.itemName, donationItem.itemCategory);
      const list = donationByKey.get(key);
      if (list) {
        list.push(donationItem);
      } else {
        donationByKey.set(key, [donationItem]);
      }
    });

    const buildDetail = (keys: string[]) =>
      [...keys]
        .sort((a, b) => {
          const metaA = itemMeta.get(a);
          const metaB = itemMeta.get(b);
          if (!metaA || !metaB) return 0;
          return metaA.soonestExpiry.getTime() - metaB.soonestExpiry.getTime();
        })
        .map((key) => {
          const stock = stockMap.get(key)!;
          const meta = itemMeta.get(key)!;
          const soonestExpiryISO = meta.soonestExpiry.toISOString();
          const donations = (donationByKey.get(key) ?? []).filter(
            (
              r
            ): r is DonationItemWithDonation & {
              expiryDate: Date;
            } =>
              !!r.expiryDate && isSameDay(r.expiryDate, meta.soonestExpiry)
          );

          return {
            itemStockId: stock.id,
            itemName: stock.itemName,
            itemCategory: stock.itemCategory,
            itemUnit: stock.itemUnit,
            totalStock: stock.totalStock,
            soonestExpiry: soonestExpiryISO,
            daysUntilExpiry: meta.daysUntilExpiry,
            donationRecords: donations.map((donationItem) => ({
              donationId: donationItem.donationId,
              serialNumber: donationItem.donation?.serialNumber ?? null,
              quantity: donationItem.quantity,
              expiryDate: donationItem.expiryDate.toISOString(),
            })),
          };
        });

    return NextResponse.json({
      summary,
      expiringItems: buildDetail(expiringKeys),
      expiredItems: buildDetail(expiredKeys),
    });
  } catch (error) {
    console.error("Error fetching expiry status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function buildKey(itemName: string, itemCategory: string) {
  return `${itemName}${KEY_SEPARATOR}${itemCategory}`;
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

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
