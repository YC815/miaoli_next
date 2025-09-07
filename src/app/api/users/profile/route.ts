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
  console.log('[/api/users/profile] ===== START PROFILE UPDATE =====');
  
  try {
    // Step 1: Test database connection
    console.log('[/api/users/profile] Testing database connection...');
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log('[/api/users/profile] ✅ Database connection successful');
    } catch (dbError) {
      console.error('[/api/users/profile] ❌ Database connection failed:', dbError);
      throw new Error('Database connection failed');
    }

    // Step 2: Authenticate user
    const { userId: clerkId } = await auth();
    console.log('[/api/users/profile] ClerkId from auth:', clerkId ? `${clerkId.substring(0, 8)}...` : 'null');
    
    if (!clerkId) {
      console.log('[/api/users/profile] ❌ No clerkId found - unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Step 3: Parse request body
    const { nickname } = await request.json();
    console.log('[/api/users/profile] Received nickname update request:', {
      nickname: nickname,
      type: typeof nickname,
      length: nickname?.length
    });

    // Step 4: Find current user
    console.log('[/api/users/profile] Finding user in database...');
    const currentUser = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!currentUser) {
      console.log('[/api/users/profile] ❌ User not found in database');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('[/api/users/profile] Found current user:', {
      id: currentUser.id,
      email: currentUser.email,
      currentNickname: currentUser.nickname,
      isFirstLogin: currentUser.isFirstLogin
    });

    // Step 5: Validate nickname
    if (nickname && (typeof nickname !== 'string' || nickname.length > 20)) {
      console.log('[/api/users/profile] ❌ Invalid nickname format');
      return NextResponse.json({
        error: '暱稱格式不正確，最多 20 個字符',
      }, { status: 400 });
    }

    // Step 6: Check nickname availability
    if (nickname && nickname.trim()) {
      console.log('[/api/users/profile] Checking nickname availability...');
      const nicknameExists = await prisma.user.findFirst({
        where: {
          id: { not: currentUser.id },
          nickname: { equals: nickname.trim(), mode: 'insensitive' },
        },
      });

      if (nicknameExists) {
        console.log('[/api/users/profile] ❌ Nickname already exists for user:', nicknameExists.id);
        return NextResponse.json({
          error: '此暱稱已被其他用戶使用，請選擇其他暱稱',
        }, { status: 409 });
      }
      console.log('[/api/users/profile] ✅ Nickname is available');
    }

    // Step 7: Prepare update data
    const newNickname = nickname !== undefined ? (nickname.trim() || null) : currentUser.nickname;
    console.log('[/api/users/profile] Update data prepared:', {
      oldNickname: currentUser.nickname,
      newNickname: newNickname,
      isChanging: currentUser.nickname !== newNickname
    });

    // Step 8: Update user data
    console.log('[/api/users/profile] Updating user in database...');
    const updatedUser = await prisma.user.update({
      where: { id: currentUser.id },
      data: {
        nickname: newNickname,
        updatedAt: new Date(),
      },
    });

    console.log('[/api/users/profile] ✅ User updated successfully:', {
      id: updatedUser.id,
      email: updatedUser.email,
      oldNickname: currentUser.nickname,
      newNickname: updatedUser.nickname,
      updatedAt: updatedUser.updatedAt
    });

    // Step 9: Verify update in database
    console.log('[/api/users/profile] Verifying update in database...');
    const verifyUser = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: { nickname: true, updatedAt: true }
    });
    
    console.log('[/api/users/profile] Database verification result:', verifyUser);

    console.log('[/api/users/profile] ===== END PROFILE UPDATE =====');
    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('[/api/users/profile] ❌ ERROR:', error);
    console.error('[/api/users/profile] Error details:', (error as Error)?.message);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
