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
    const whereClause: { isActive?: boolean; category?: string } = {};

    if (activeOnly) {
      whereClause.isActive = true;
    }

    if (categoryFilter) {
      whereClause.category = categoryFilter;
    }

    // 查詢所有符合條件的物資
    const supplies = await prisma.supply.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        category: true,
        quantity: true,
        safetyStock: true,
        unit: true,
      },
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ],
    });

    // 計算庫存狀態
    const suppliesWithStatus: SupplyWithStatus[] = supplies.map(supply => ({
      ...supply,
      status: calculateStatus(supply.quantity, supply.safetyStock),
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