import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    const standardItems = await prisma.standardItem.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' }
    })

    return NextResponse.json({
      success: true,
      data: standardItems
    })
  } catch (error) {
    console.error('取得標準物品清單失敗:', error)
    return NextResponse.json(
      {
        error: '取得標準物品清單失敗',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!user) {
      return NextResponse.json({ error: '找不到用戶' }, { status: 404 })
    }

    if (user.role === 'VOLUNTEER') {
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }

    const { items } = await request.json()

    const results = await Promise.all(
      items.map(async (item: { name: string; category: string; units: string[]; defaultUnit: string }) => {
        return prisma.standardItem.upsert({
          where: {
            name_category: {
              name: item.name,
              category: item.category
            }
          },
          create: {
            name: item.name,
            category: item.category,
            units: item.units,
            defaultUnit: item.defaultUnit
          },
          update: {
            units: item.units,
            defaultUnit: item.defaultUnit,
            isActive: true
          }
        })
      })
    )

    return NextResponse.json({
      success: true,
      data: results,
      message: `已同步 ${results.length} 項標準物品`
    })
  } catch (error) {
    console.error('同步標準物品失敗:', error)
    return NextResponse.json(
      { error: '同步標準物品失敗' },
      { status: 500 }
    )
  }
}