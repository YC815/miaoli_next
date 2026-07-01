import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { Role } from '@prisma/client'; // Import Role enum

// 停用帳號的共用防呆：不能停用自己、系統至少保留一位啟用中的管理員
// 回傳錯誤訊息字串，或 null 表示可停用
async function checkDisableGuard(
  currentUserId: string,
  targetUser: { id: string; role: Role }
): Promise<string | null> {
  if (currentUserId === targetUser.id) {
    return '無法停用自己的帳號';
  }
  if (targetUser.role === Role.ADMIN) {
    const otherActiveAdmins = await prisma.user.count({
      where: { role: Role.ADMIN, isActive: true, id: { not: targetUser.id } },
    });
    if (otherActiveAdmins === 0) {
      return '無法停用，系統至少需要一位啟用中的管理員';
    }
  }
  return null;
}

// 在 Clerk 端封鎖 / 解除封鎖帳號，讓停用直接擋在認證層
async function setClerkBanned(clerkId: string, banned: boolean) {
  const client = await clerkClient();
  if (banned) {
    await client.users.banUser(clerkId);
  } else {
    await client.users.unbanUser(clerkId);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: targetUserId } = await params;
    const { nickname, role, isActive } = await request.json();

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

    if (isActive !== undefined && typeof isActive !== 'boolean') {
      return NextResponse.json({
        error: 'Invalid isActive. Must be a boolean.',
      }, { status: 400 });
    }

    // 停用帳號時套用防呆
    if (isActive === false && targetUser.isActive) {
      const disableError = await checkDisableGuard(currentUser.id, targetUser);
      if (disableError) {
        return NextResponse.json({ error: disableError }, { status: 400 });
      }
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

    // 啟用狀態有變動時，先同步 Clerk 端封鎖狀態，成功後再更新 DB
    if (isActive !== undefined && isActive !== targetUser.isActive) {
      await setClerkBanned(targetUser.clerkId, !isActive);
    }

    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        nickname: nickname !== undefined ? (nickname.trim() || null) : targetUser.nickname,
        role: role || targetUser.role,
        isActive: isActive !== undefined ? isActive : targetUser.isActive,
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: targetUserId } = await params;

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

// 停用帳號（soft delete）：Clerk 端封鎖 + 本地 isActive=false，保留稽核軌跡
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: targetUserId } = await params;

    const currentUser = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'Current user not found' }, { status: 404 });
    }

    if (currentUser.role !== Role.ADMIN) {
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

    if (!targetUser.isActive) {
      return NextResponse.json({ error: '帳號已是停用狀態' }, { status: 400 });
    }

    const disableError = await checkDisableGuard(currentUser.id, targetUser);
    if (disableError) {
      return NextResponse.json({ error: disableError }, { status: 400 });
    }

    // 先封鎖 Clerk，成功後再更新 DB
    await setClerkBanned(targetUser.clerkId, true);

    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: { isActive: false, updatedAt: new Date() },
    });

    console.log(`Admin ${currentUser.email} disabled user ${targetUser.email}`);

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error disabling user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
