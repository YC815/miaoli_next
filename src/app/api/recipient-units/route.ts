import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { Role } from '@prisma/client';

export async function GET() {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const recipientUnits = await prisma.recipientUnit.findMany({
      where: { isActive: true },
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

    const { name, phone, sortOrder } = await request.json();

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
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
        name: name.trim(),
        phone: phone ? phone.trim() : null,
        sortOrder: finalSortOrder,
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