import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { Role } from '@prisma/client'; // Import Role enum

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const targetUserId = params.id;
    const { nickname, role } = await request.json();

    const currentUser = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'Current user not found' }, { status: 404 });
    }

    if (currentUser.role !== Role.ADMIN) { // Use Role enum
      return NextResponse.json({
        error: 'Access denied. Admin privileges required.',
      }, { status: 403 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }

    if (nickname && (typeof nickname !== 'string' || nickname.length > 20)) {
      return NextResponse.json({
        error: 'Invalid nickname. Must be a string with max 20 characters.',
      }, { status: 400 });
    }

    if (role && !Object.values(Role).includes(role)) { // Validate role against enum
      return NextResponse.json({
        error: 'Invalid role. Must be ADMIN, STAFF, or VOLUNTEER.',
      }, { status: 400 });
    }

    if (nickname && nickname.trim()) {
      const nicknameExists = await prisma.user.findFirst({
        where: {
          id: { not: targetUserId },
          nickname: { equals: nickname.trim(), mode: 'insensitive' },
        },
      });

      if (nicknameExists) {
        return NextResponse.json({
          error: '此暱稱已被其他用戶使用',
        }, { status: 409 });
      }
    }

    // Prevent admin from demoting themselves (unless there are other admins)
    if (role && role !== Role.ADMIN && currentUser.id === targetUserId) {
      const otherAdmins = await prisma.user.count({
        where: {
          role: Role.ADMIN,
          id: { not: targetUserId },
        },
      });

      if (otherAdmins === 0) {
        return NextResponse.json({
          error: '無法降級，系統至少需要一位管理員',
        }, { status: 400 });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        nickname: nickname !== undefined ? (nickname.trim() || null) : targetUser.nickname,
        role: role || targetUser.role,
        updatedAt: new Date(),
      },
    });

    console.log(`Admin ${currentUser.email} updated user ${targetUser.email}:`, {
      oldNickname: targetUser.nickname,
      newNickname: updatedUser.nickname,
      oldRole: targetUser.role,
      newRole: updatedUser.role,
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const targetUserId = params.id;

    const currentUser = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'Current user not found' }, { status: 404 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (currentUser.role !== Role.ADMIN && currentUser.id !== targetUserId) { // Use Role enum
      return NextResponse.json({
        error: 'Access denied. Cannot view other users.',
      }, { status: 403 });
    }

    return NextResponse.json(targetUser);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
