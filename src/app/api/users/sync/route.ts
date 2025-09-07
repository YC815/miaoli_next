import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { Role } from '@prisma/client';

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const cUser = await currentUser();
    if (!cUser) return NextResponse.json({ error: 'No Clerk user' }, { status: 401 });

    const userEmail = cUser.emailAddresses?.[0]?.emailAddress;
    const userNickname = `${cUser.firstName ?? ''} ${cUser.lastName ?? ''}`.trim() || cUser.username || null;

    console.log(`[/api/users/sync] Processing user sync for clerkId: ${userId}, email: ${userEmail}`);

    // Step 1: Check if user exists by clerkId
    const existingUser = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (existingUser) {
      // User exists, update their info
      console.log(`[/api/users/sync] Updating existing user: ${existingUser.id}`);
      const updatedUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          email: userEmail,
          nickname: userNickname,
          lastLoginAt: new Date(),
        },
      });
      return NextResponse.json({ ok: true, user: updatedUser });
    }

    // Step 2: User doesn't exist by clerkId, check if email is already used
    if (userEmail) {
      const userWithSameEmail = await prisma.user.findUnique({
        where: { email: userEmail },
      });

      if (userWithSameEmail) {
        // Email exists for another user - this could be a re-registration case
        console.log(`[/api/users/sync] Email ${userEmail} already exists for user ${userWithSameEmail.id}, updating clerkId`);
        const updatedUser = await prisma.user.update({
          where: { id: userWithSameEmail.id },
          data: {
            clerkId: userId,
            nickname: userNickname,
            lastLoginAt: new Date(),
          },
        });
        return NextResponse.json({ ok: true, user: updatedUser });
      }
    }

    // Step 3: Create new user
    console.log(`[/api/users/sync] Creating new user with clerkId: ${userId}`);
    const newUser = await prisma.user.create({
      data: {
        clerkId: userId,
        email: userEmail || '',
        nickname: userNickname,
        role: Role.VOLUNTEER,
        isFirstLogin: true,
      },
    });

    return NextResponse.json({ ok: true, user: newUser });
  } catch (err: unknown) {
    console.error('[/api/users/sync] ERROR:', err);
    const errorMessage = (err as Error)?.message ?? String(err);
    console.error('[/api/users/sync] ERROR DETAILS:', errorMessage);
    
    // Check if it's still a unique constraint error
    if (errorMessage.includes('Unique constraint failed')) {
      return NextResponse.json({ 
        error: 'User data conflict', 
        detail: 'Unable to sync user due to existing data conflicts. Please contact support.'
      }, { status: 409 });
    }
    
    return NextResponse.json({ 
      error: 'Internal server error', 
      detail: errorMessage
    }, { status: 500 });
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