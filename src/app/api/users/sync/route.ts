import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { Role } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth(); // clerkId can be null if not authenticated

    const { email } = await request.json();

    if (!clerkId || !email) { // Ensure we have at least clerkId and email
      return NextResponse.json({ error: 'Missing user information' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (existingUser) {
      const updatedUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          lastLoginAt: new Date(),
          email: email, // Update email in case it changed in Clerk
        },
      });
      return NextResponse.json(updatedUser);
    } else {
      const newUser = await prisma.user.create({
        data: {
          clerkId,
          email,
          role: Role.VOLUNTEER, // Default role for new users
          isFirstLogin: true, // Mark as first login
        },
      });
      return NextResponse.json(newUser, { status: 201 });
    }
  } catch (error) {
    console.error('Error syncing user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(currentUser);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}