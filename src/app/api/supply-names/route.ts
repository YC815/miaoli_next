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

    const supplyNames = await prisma.supplyName.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json(supplyNames);
  } catch (error) {
    console.error('Error fetching supply names:', error);
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

    if (!currentUser || (currentUser.role !== Role.ADMIN && currentUser.role !== Role.STAFF && currentUser.role !== Role.VOLUNTEER)) {
      return NextResponse.json({ 
        error: 'Access denied. Admin, Staff or Volunteer privileges required.' 
      }, { status: 403 });
    }

    const { name } = await request.json();

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Check if supply name already exists
    const existingSupplyName = await prisma.supplyName.findUnique({
      where: { name: name.trim() },
    });

    if (existingSupplyName) {
      return NextResponse.json({ 
        error: 'Supply name with this name already exists' 
      }, { status: 409 });
    }

    // Get the next sort order
    const lastSupplyName = await prisma.supplyName.findFirst({
      orderBy: { sortOrder: 'desc' },
    });
    
    const newSortOrder = (lastSupplyName?.sortOrder || 0) + 1;

    const newSupplyName = await prisma.supplyName.create({
      data: {
        name: name.trim(),
        sortOrder: newSortOrder,
      },
    });

    return NextResponse.json(newSupplyName, { status: 201 });
  } catch (error) {
    console.error('Error creating supply name:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}