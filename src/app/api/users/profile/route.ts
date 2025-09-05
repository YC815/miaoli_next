import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

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

    // Update last login time
    const updatedUser = await prisma.user.update({
      where: { id: currentUser.id },
      data: {
        lastLoginAt: new Date(),
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error fetching user profile:', error);
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

    const { nickname } = await request.json();

    const currentUser = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Validate nickname
    if (nickname && (typeof nickname !== 'string' || nickname.length > 20)) {
      return NextResponse.json({
        error: '暱稱格式不正確，最多 20 個字符',
      }, { status: 400 });
    }

    // Check if nickname is already used by another user
    if (nickname && nickname.trim()) {
      const nicknameExists = await prisma.user.findFirst({
        where: {
          id: { not: currentUser.id },
          nickname: { equals: nickname.trim(), mode: 'insensitive' },
        },
      });

      if (nicknameExists) {
        return NextResponse.json({
          error: '此暱稱已被其他用戶使用，請選擇其他暱稱',
        }, { status: 409 });
      }
    }

    // Update user data
    const updatedUser = await prisma.user.update({
      where: { id: currentUser.id },
      data: {
        nickname: nickname !== undefined ? (nickname.trim() || null) : currentUser.nickname,
        updatedAt: new Date(),
      },
    });

    console.log(`User ${currentUser.email} updated their profile:`, {
      oldNickname: currentUser.nickname,
      newNickname: updatedUser.nickname,
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
