import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import prisma from '@/lib/prisma'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params

    const customItem = await prisma.customItem.findUnique({
      where: { id }
    })

    if (!customItem) {
      return NextResponse.json({ error: '找不到此物品' }, { status: 404 })
    }

    const updatedItem = await prisma.customItem.update({
      where: { id },
      data: {
        isHidden: !customItem.isHidden
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
      data: updatedItem,
      message: updatedItem.isHidden ? '物品已隱藏' : '物品已顯示'
    })
  } catch (error) {
    console.error('切換物品隱藏狀態失敗:', error)
    return NextResponse.json(
      { error: '切換物品隱藏狀態失敗' },
      { status: 500 }
    )
  }
}
