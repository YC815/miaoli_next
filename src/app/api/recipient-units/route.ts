import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { Role } from '@prisma/client';
import { randomUUID } from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const includeInactive = request.nextUrl.searchParams.get('includeInactive') === 'true';

    const recipientUnits = await prisma.recipientUnit.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json(recipientUnits);
  } catch (error) {
    console.error('Error fetching recipient units:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!currentUser || (currentUser.role !== Role.ADMIN && currentUser.role !== Role.STAFF)) {
      return NextResponse.json({ 
        error: 'Access denied. Admin or Staff privileges required.' 
      }, { status: 403 });
    }

    const { name, phone, address, sortOrder, serviceCount } = await request.json();

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    let parsedServiceCount: number | null = null;
    if (serviceCount !== undefined && serviceCount !== null) {
      const numericCount = Number(serviceCount);
      if (!Number.isInteger(numericCount) || numericCount < 0) {
        return NextResponse.json({ error: '服務人數必須是大於等於 0 的整數' }, { status: 400 });
      }
      parsedServiceCount = numericCount;
    }

    // Check if recipient unit name already exists
    const existingUnit = await prisma.recipientUnit.findUnique({
      where: { name },
    });

    if (existingUnit) {
      return NextResponse.json({ 
        error: 'Recipient unit with this name already exists' 
      }, { status: 409 });
    }

    // If no sortOrder provided, use the next available order
    let finalSortOrder = sortOrder;
    if (finalSortOrder === undefined) {
      const lastUnit = await prisma.recipientUnit.findFirst({
        orderBy: { sortOrder: 'desc' },
      });
      finalSortOrder = (lastUnit?.sortOrder || 0) + 1;
    }

    const newUnit = await prisma.recipientUnit.create({
      data: {
        id: randomUUID(),
        name: name.trim(),
        phone: phone ? phone.trim() : null,
        address: address ? address.trim() : null,
        serviceCount: parsedServiceCount,
        sortOrder: finalSortOrder,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(newUnit, { status: 201 });
  } catch (error) {
    console.error('Error creating recipient unit:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!currentUser || (currentUser.role !== Role.ADMIN && currentUser.role !== Role.STAFF)) {
      return NextResponse.json({ 
        error: 'Access denied. Admin or Staff privileges required.' 
      }, { status: 403 });
    }

    const { id, name, phone, address, sortOrder, serviceCount } = await request.json();

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Check if recipient unit exists
    const existingUnit = await prisma.recipientUnit.findUnique({
      where: { id },
    });

    if (!existingUnit) {
      return NextResponse.json({ 
        error: 'Recipient unit not found' 
      }, { status: 404 });
    }

    // Check if another recipient unit with the same name already exists (excluding current unit)
    const duplicateUnit = await prisma.recipientUnit.findFirst({
      where: { 
        name: name.trim(),
        NOT: { id }
      },
    });

    if (duplicateUnit) {
      return NextResponse.json({ 
        error: 'Recipient unit with this name already exists' 
      }, { status: 409 });
    }

    let parsedServiceCount: number | null | undefined = serviceCount;
    if (serviceCount !== undefined && serviceCount !== null) {
      const numericCount = Number(serviceCount);
      if (!Number.isInteger(numericCount) || numericCount < 0) {
        return NextResponse.json({ error: '服務人數必須是大於等於 0 的整數' }, { status: 400 });
      }
      parsedServiceCount = numericCount;
    }

    const updatedUnit = await prisma.recipientUnit.update({
      where: { id },
      data: {
        name: name.trim(),
        phone: phone ? phone.trim() : existingUnit.phone,
        address: address ? address.trim() : existingUnit.address,
        serviceCount:
          parsedServiceCount === undefined
            ? existingUnit.serviceCount
            : parsedServiceCount === null
              ? null
              : parsedServiceCount,
        sortOrder: sortOrder ?? existingUnit.sortOrder,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(updatedUnit);
  } catch (error) {
    console.error('Error updating recipient unit:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!currentUser || currentUser.role !== Role.ADMIN) {
      return NextResponse.json({ 
        error: 'Access denied. Admin privileges required.' 
      }, { status: 403 });
    }

    const { id } = await request.json();

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Check if recipient unit exists
    const existingUnit = await prisma.recipientUnit.findUnique({
      where: { id },
    });

    if (!existingUnit) {
      return NextResponse.json({ 
        error: 'Recipient unit not found' 
      }, { status: 404 });
    }

    // Soft delete by setting isActive to false
    const deletedUnit = await prisma.recipientUnit.update({
      where: { id },
      data: { isActive: false, updatedAt: new Date() },
    });

    return NextResponse.json({ 
      message: 'Recipient unit deleted successfully',
      recipientUnit: deletedUnit 
    });
  } catch (error) {
    console.error('Error deleting recipient unit:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
