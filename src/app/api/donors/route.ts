import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import prisma from '@/lib/prisma'
import { randomUUID } from 'crypto'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    const url = new URL(request.url)
    const includeInactive = url.searchParams.get('includeInactive') === 'true'
    const searchKeyword = url.searchParams.get('search')?.trim() || ''

    const whereClause: {
      isActive?: boolean
      OR?: Array<{
        name?: { contains: string; mode: 'insensitive' }
        phone?: { contains: string; mode: 'insensitive' }
        taxId?: { contains: string; mode: 'insensitive' }
      }>
    } = {}

    if (!includeInactive) {
      whereClause.isActive = true
    }

    if (searchKeyword) {
      whereClause.OR = [
        { name: { contains: searchKeyword, mode: 'insensitive' } },
        { phone: { contains: searchKeyword, mode: 'insensitive' } },
        { taxId: { contains: searchKeyword, mode: 'insensitive' } }
      ]
    }

    const donors = await prisma.donor.findMany({
      where: whereClause,
      orderBy: [
        { isActive: 'desc' },
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
        id: randomUUID(),
        name: name.trim(),
        phone: phone?.trim() || null,
        taxId: taxId?.trim() || null,
        address: address?.trim() || null,
        updatedAt: new Date()
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

export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!user || (user.role !== 'ADMIN' && user.role !== 'STAFF')) {
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }

    const { id, name, phone, taxId, address, isActive } = await request.json()

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: '缺少捐贈人 ID' }, { status: 400 })
    }

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: '單位名稱為必填欄位' }, { status: 400 })
    }

    const donor = await prisma.donor.findUnique({
      where: { id },
    })

    if (!donor) {
      return NextResponse.json({ error: '找不到捐贈人資料' }, { status: 404 })
    }

    const duplicateDonor = await prisma.donor.findFirst({
      where: {
        name: name.trim(),
        NOT: { id },
      },
    })

    if (duplicateDonor) {
      return NextResponse.json({ error: '此單位名稱已存在' }, { status: 409 })
    }

    const updatedDonor = await prisma.donor.update({
      where: { id },
      data: {
        name: name.trim(),
        phone: phone?.trim() || null,
        taxId: taxId?.trim() || null,
        address: address?.trim() || null,
        isActive: typeof isActive === 'boolean' ? isActive : donor.isActive,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      data: updatedDonor,
      message: '捐贈人資料已更新',
    })
  } catch (error) {
    console.error('更新捐贈人失敗:', error)
    return NextResponse.json(
      { error: '更新捐贈人失敗' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: '僅限管理員停用捐贈人' }, { status: 403 })
    }

    const { id } = await request.json()

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: '缺少捐贈人 ID' }, { status: 400 })
    }

    const donor = await prisma.donor.findUnique({
      where: { id },
    })

    if (!donor) {
      return NextResponse.json({ error: '找不到捐贈人資料' }, { status: 404 })
    }

    const updatedDonor = await prisma.donor.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      data: updatedDonor,
      message: '捐贈人已停用',
    })
  } catch (error) {
    console.error('停用捐贈人失敗:', error)
    return NextResponse.json(
      { error: '停用捐贈人失敗' },
      { status: 500 }
    )
  }
}
