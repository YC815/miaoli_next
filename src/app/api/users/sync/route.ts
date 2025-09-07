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

    const user = await prisma.user.upsert({
      where: { clerkId: userId },
      update: {
        email: cUser.emailAddresses?.[0]?.emailAddress ?? null,
        nickname: `${cUser.firstName ?? ''} ${cUser.lastName ?? ''}`.trim() || cUser.username || null,
        lastLoginAt: new Date(),
      },
      create: {
        clerkId: userId,
        email: cUser.emailAddresses?.[0]?.emailAddress ?? '',
        nickname: `${cUser.firstName ?? ''} ${cUser.lastName ?? ''}`.trim() || cUser.username || null,
        role: Role.VOLUNTEER,
        isFirstLogin: true,
      },
    });

    return NextResponse.json({ ok: true, user });
  } catch (err: unknown) {
    console.error('[/api/users/sync] ERROR:', err);
    return NextResponse.json({ 
      error: 'Internal server error', 
      detail: String((err as Error)?.message ?? err) 
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