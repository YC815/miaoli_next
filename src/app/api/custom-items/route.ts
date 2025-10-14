import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const includeHidden = searchParams.get('includeHidden') === 'true'

    const customItems = await prisma.customItem.findMany({
      where: {
        isActive: true,
        ...(includeHidden ? {} : { isHidden: false })
      },
      include: {
        user: {
          select: {
            nickname: true,
            email: true
          }
        }
      },
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' }
      ]
    })

    return NextResponse.json({
      success: true,
      data: customItems
    })
  } catch (error) {
    console.error('取得自訂物品清單失敗:', error)
    return NextResponse.json(
      { error: '取得自訂物品清單失敗' },
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

    const { name, category, unit } = await request.json()

    if (!name || !category || !unit) {
      return NextResponse.json(
        { error: '物品名稱、分類和單位不可為空' },
        { status: 400 }
      )
    }

    const existingItem = await prisma.customItem.findUnique({
      where: {
        name_category: {
          name,
          category
        }
      }
    })

    if (existingItem) {
      return NextResponse.json(
        { error: '此物品已存在' },
        { status: 409 }
      )
    }

    const customItem = await prisma.customItem.create({
      data: {
        name,
        category,
        unit,
        createdBy: user.id
      },
      include: {
        user: {
          select: {
            nickname: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: customItem,
      message: '自訂物品創建成功'
    })
  } catch (error) {
    console.error('創建自訂物品失敗:', error)
    return NextResponse.json(
      { error: '創建自訂物品失敗' },
      { status: 500 }
    )
  }
}