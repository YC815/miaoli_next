import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

type InventoryStatus = 'sufficient' | 'insufficient' | 'out_of_stock';

interface SupplyWithStatus {
  id: string;
  name: string;
  category: string;
  quantity: number;
  safetyStock: number;
  unit: string;
  status: InventoryStatus;
}

interface InventorySummary {
  total: number;
  sufficient: number;
  insufficient: number;
  outOfStock: number;
}

interface InventoryResponse {
  summary: InventorySummary;
  supplies: SupplyWithStatus[];
}

function calculateStatus(quantity: number, safetyStock: number): InventoryStatus {
  if (quantity === 0) return 'out_of_stock';
  if (quantity < safetyStock) return 'insufficient';
  return 'sufficient';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status') as InventoryStatus | 'all' | null;
    const categoryFilter = searchParams.get('category');
    const activeOnly = searchParams.get('activeOnly') !== 'false'; // 預設為 true

    // 建立查詢條件
    const whereClause: {
      itemCategory?: string;
      AND?: Array<Record<string, unknown>>;
    } = {};

    const andConditions: Array<Record<string, unknown>> = [];

    if (categoryFilter) {
      whereClause.itemCategory = categoryFilter;
    }

    if (activeOnly) {
      andConditions.push({ totalStock: { gt: 0 } });
    }

    if (andConditions.length > 0) {
      whereClause.AND = andConditions;
    }

    // 查詢所有符合條件的物資
    const supplies = await prisma.itemStock.findMany({
      where: whereClause,
      select: {
        id: true,
        itemName: true,
        itemCategory: true,
        totalStock: true,
        safetyStock: true,
        itemUnit: true,
      },
      orderBy: [
        { itemCategory: 'asc' },
        { itemName: 'asc' }
      ],
    });

    // 計算庫存狀態
    const suppliesWithStatus: SupplyWithStatus[] = supplies.map(supply => ({
      id: supply.id,
      name: supply.itemName,
      category: supply.itemCategory,
      quantity: supply.totalStock,
      safetyStock: supply.safetyStock,
      unit: supply.itemUnit,
      status: calculateStatus(supply.totalStock, supply.safetyStock),
    }));

    // 根據狀態過濾
    const filteredSupplies = statusFilter && statusFilter !== 'all'
      ? suppliesWithStatus.filter(supply => supply.status === statusFilter)
      : suppliesWithStatus;

    // 計算統計摘要
    const summary: InventorySummary = {
      total: suppliesWithStatus.length,
      sufficient: suppliesWithStatus.filter(s => s.status === 'sufficient').length,
      insufficient: suppliesWithStatus.filter(s => s.status === 'insufficient').length,
      outOfStock: suppliesWithStatus.filter(s => s.status === 'out_of_stock').length,
    };

    const response: InventoryResponse = {
      summary,
      supplies: filteredSupplies,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching inventory status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
