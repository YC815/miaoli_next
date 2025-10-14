import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    const donors = await prisma.donor.findMany({
      where: {
        isActive: true
      },
      orderBy: [
        { updatedAt: 'desc' }
      ]
    })

    return NextResponse.json({
      success: true,
      data: donors
    })
  } catch (error) {
    console.error('取得捐贈人清單失敗:', error)
    return NextResponse.json(
      { error: '取得捐贈人清單失敗' },
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

    const body = await request.json()
    const { name, phone, taxId, address } = body

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: '單位名稱為必填欄位' },
        { status: 400 }
      )
    }

    // 檢查是否已存在同名捐贈人
    const existingDonor = await prisma.donor.findUnique({
      where: { name: name.trim() }
    })

    if (existingDonor) {
      return NextResponse.json(
        { error: '此單位名稱已存在' },
        { status: 409 }
      )
    }

    const donor = await prisma.donor.create({
      data: {
        name: name.trim(),
        phone: phone?.trim() || null,
        taxId: taxId?.trim() || null,
        address: address?.trim() || null
      }
    })

    return NextResponse.json({
      success: true,
      data: donor,
      message: '捐贈人新增成功'
    })
  } catch (error) {
    console.error('新增捐贈人失敗:', error)
    return NextResponse.json(
      { error: '新增捐贈人失敗' },
      { status: 500 }
    )
  }
}
