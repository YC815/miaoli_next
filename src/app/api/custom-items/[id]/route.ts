import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import prisma from '@/lib/prisma'

export async function PUT(
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

    const { name, category, unit, isHidden } = await request.json()
    const { id } = await params

    const customItem = await prisma.customItem.findUnique({
      where: { id }
    })

    if (!customItem) {
      return NextResponse.json({ error: '找不到自訂物品' }, { status: 404 })
    }

    const updatedItem = await prisma.customItem.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(category && { category }),
        ...(unit && { unit }),
        ...(typeof isHidden === 'boolean' && { isHidden })
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
      message: '自訂物品更新成功'
    })
  } catch (error) {
    console.error('更新自訂物品失敗:', error)
    return NextResponse.json(
      { error: '更新自訂物品失敗' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: '僅管理員可刪除物品' }, { status: 403 })
    }

    const { id } = await params

    const customItem = await prisma.customItem.findUnique({
      where: { id }
    })

    if (!customItem) {
      return NextResponse.json({ error: '找不到自訂物品' }, { status: 404 })
    }

    await prisma.customItem.update({
      where: { id },
      data: {
        isActive: false
      }
    })

    return NextResponse.json({
      success: true,
      message: '自訂物品已刪除（軟刪除）'
    })
  } catch (error) {
    console.error('刪除自訂物品失敗:', error)
    return NextResponse.json(
      { error: '刪除自訂物品失敗' },
      { status: 500 }
    )
  }
}