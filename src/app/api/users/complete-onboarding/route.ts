import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  console.log('[/api/users/complete-onboarding] ===== START ONBOARDING COMPLETION =====');
  
  try {
    // Step 1: Verify database connection
    console.log('[/api/users/complete-onboarding] Testing database connection...');
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log('[/api/users/complete-onboarding] ✅ Database connection successful');
    } catch (dbError) {
      console.error('[/api/users/complete-onboarding] ❌ Database connection failed:', dbError);
      throw new Error('Database connection failed');
    }

    // Step 2: Authenticate user
    const { userId: clerkId } = await auth();
    console.log('[/api/users/complete-onboarding] ClerkId from auth:', clerkId ? `${clerkId.substring(0, 8)}...` : 'null');
    
    if (!clerkId) {
      console.log('[/api/users/complete-onboarding] ❌ No clerkId found - unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Step 3: Parse request body
    const { nickname } = await request.json();
    console.log('[/api/users/complete-onboarding] Received nickname:', nickname);

    // 驗證暱稱
    if (!nickname || typeof nickname !== 'string' || nickname.trim().length === 0) {
      console.log('[/api/users/complete-onboarding] ❌ Invalid nickname - empty');
      return NextResponse.json(
        { error: '暱稱不能為空' },
        { status: 400 }
      );
    }

    if (nickname.trim().length > 20) {
      console.log('[/api/users/complete-onboarding] ❌ Invalid nickname - too long');
      return NextResponse.json(
        { error: '暱稱不能超過 20 個字符' },
        { status: 400 }
      );
    }

    // Step 4: Find current user
    console.log('[/api/users/complete-onboarding] Finding user with clerkId:', clerkId);
    const currentUser = await prisma.user.findUnique({
      where: { clerkId },
    });
    
    if (!currentUser) {
      console.log('[/api/users/complete-onboarding] ❌ User not found in database');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    console.log('[/api/users/complete-onboarding] Found user:', {
      id: currentUser.id,
      email: currentUser.email,
      currentNickname: currentUser.nickname,
      isFirstLogin: currentUser.isFirstLogin
    });

    // Step 5: Check nickname availability
    console.log('[/api/users/complete-onboarding] Checking nickname availability...');
    const nicknameExists = await prisma.user.findFirst({
      where: {
        nickname: nickname.trim(),
        NOT: {
          id: currentUser.id
        }
      }
    });

    if (nicknameExists) {
      console.log('[/api/users/complete-onboarding] ❌ Nickname already exists for user:', nicknameExists.id);
      return NextResponse.json(
        { error: '此暱稱已被使用，請選擇其他暱稱' },
        { status: 409 }
      );
    }

    // Step 6: Update user data
    console.log('[/api/users/complete-onboarding] Updating user data...');
    const updatedUser = await prisma.user.update({
      where: { clerkId },
      data: {
        nickname: nickname.trim(),
        isFirstLogin: false,
        lastLoginAt: new Date(),
      },
    });

    console.log('[/api/users/complete-onboarding] ✅ User updated successfully:', {
      id: updatedUser.id,
      nickname: updatedUser.nickname,
      isFirstLogin: updatedUser.isFirstLogin,
      lastLoginAt: updatedUser.lastLoginAt
    });

    console.log('[/api/users/complete-onboarding] ===== END ONBOARDING COMPLETION =====');
    return NextResponse.json({
      message: '暱稱設定成功',
      user: updatedUser
    });

  } catch (error) {
    console.error('[/api/users/complete-onboarding] ❌ ERROR:', error);
    console.error('[/api/users/complete-onboarding] Error details:', (error as Error)?.message);
    return NextResponse.json(
      { error: '設定暱稱時發生錯誤' },
      { status: 500 }
    );
  }
}