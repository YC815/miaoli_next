import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { Role } from '@prisma/client';
import { randomUUID } from 'crypto';

export async function POST() {
  console.log('[/api/users/sync] ===== START USER SYNC =====');
  
  try {
    // Step 0: Test database connection
    console.log('[/api/users/sync] Testing database connection...');
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log('[/api/users/sync] ✅ Database connection successful');
    } catch (dbError) {
      console.error('[/api/users/sync] ❌ Database connection failed:', dbError);
      throw new Error('Database connection failed');
    }

    const { userId } = await auth();
    console.log('[/api/users/sync] ClerkId from auth:', userId ? `${userId.substring(0, 8)}...` : 'null');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const cUser = await currentUser();
    console.log('[/api/users/sync] Clerk user info:', {
      id: cUser?.id ? `${cUser.id.substring(0, 8)}...` : 'null',
      hasEmails: !!cUser?.emailAddresses?.length,
      firstName: cUser?.firstName,
      lastName: cUser?.lastName,
      username: cUser?.username
    });
    if (!cUser) return NextResponse.json({ error: 'No Clerk user' }, { status: 401 });

    const userEmail = cUser.emailAddresses?.[0]?.emailAddress;
    const userNickname = `${cUser.firstName ?? ''} ${cUser.lastName ?? ''}`.trim() || cUser.username || null;

    console.log(`[/api/users/sync] Processing user sync for clerkId: ${userId}, email: ${userEmail}, nickname: ${userNickname}`);

    // Step 1: Check if user exists by clerkId
    console.log('[/api/users/sync] Step 1: Checking if user exists by clerkId...');
    const existingUser = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (existingUser) {
      // User exists, update their info
      console.log(`[/api/users/sync] Found existing user:`, {
        id: existingUser.id,
        email: existingUser.email,
        nickname: existingUser.nickname,
        isFirstLogin: existingUser.isFirstLogin
      });
      
      console.log(`[/api/users/sync] Updating existing user: ${existingUser.id}`);
      
      // 決定是否更新暱稱：永遠不自動設定暱稱，讓用戶在 onboarding 流程中自己設定
      // 如果用戶已經有自定義暱稱，保持不變；如果沒有暱稱，也保持 null 狀態
      const shouldUpdateNickname = false; // 永遠不在同步時自動更新暱稱
      const finalNickname = existingUser.nickname; // 保持現有暱稱狀態
      
      console.log(`[/api/users/sync] Nickname update logic:`, {
        currentNickname: existingUser.nickname,
        clerkNickname: userNickname,
        shouldUpdate: shouldUpdateNickname,
        finalNickname: finalNickname
      });
      
      // 只更新 email 和 lastLoginAt，暱稱只在需要時更新
      const updateData: {
        email: string;
        lastLoginAt: Date;
        updatedAt: Date;
        nickname?: string | null;
      } = {
        email: userEmail,
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      };
      
      // 只有在需要更新暱稱時才加入 nickname 欄位
      if (shouldUpdateNickname) {
        updateData.nickname = finalNickname;
      }
      
      const updatedUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: updateData,
      });
      
      console.log(`[/api/users/sync] ✅ User updated:`, {
        id: updatedUser.id,
        email: updatedUser.email,
        oldNickname: existingUser.nickname,
        newNickname: updatedUser.nickname,
        isFirstLogin: updatedUser.isFirstLogin
      });
      
      console.log('[/api/users/sync] ===== END USER SYNC (UPDATE) =====');
      return NextResponse.json({ ok: true, user: updatedUser });
    }

    // Step 2: User doesn't exist by clerkId, check if email is already used
    console.log('[/api/users/sync] Step 2: User not found by clerkId, checking email...');
    if (userEmail) {
      const userWithSameEmail = await prisma.user.findUnique({
        where: { email: userEmail },
      });

      if (userWithSameEmail) {
        // Email exists for another user - this could be a re-registration case
        console.log(`[/api/users/sync] Email ${userEmail} already exists for user ${userWithSameEmail.id}, updating clerkId`);
        // 對於通過 email 找到的用戶，也保護已有的暱稱，永遠不自動設定
        const emailUpdateData: {
          clerkId: string;
          lastLoginAt: Date;
          updatedAt: Date;
        } = {
          clerkId: userId,
          lastLoginAt: new Date(),
          updatedAt: new Date(),
        };
        
        // 永遠不在同步時更新暱稱，保持現有狀態
        // 如果沒有暱稱，會透過 onboarding 流程讓用戶設定
        
        const updatedUser = await prisma.user.update({
          where: { id: userWithSameEmail.id },
          data: emailUpdateData,
        });
        
        console.log(`[/api/users/sync] ✅ Email user updated with new clerkId:`, {
          id: updatedUser.id,
          email: updatedUser.email,
          nickname: updatedUser.nickname,
          isFirstLogin: updatedUser.isFirstLogin
        });
        
        console.log('[/api/users/sync] ===== END USER SYNC (EMAIL UPDATE) =====');
        return NextResponse.json({ ok: true, user: updatedUser });
      }
    }

    // Step 3: Create new user
    console.log(`[/api/users/sync] Step 3: Creating new user with clerkId: ${userId}`);
    const newUser = await prisma.user.create({
      data: {
        id: randomUUID(),
        clerkId: userId,
        email: userEmail || '',
        nickname: null, // 新用戶暱稱為空，強制進入 onboarding 流程
        role: Role.VOLUNTEER,
        isFirstLogin: true,
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      },
    });

    console.log(`[/api/users/sync] ✅ New user created:`, {
      id: newUser.id,
      email: newUser.email,
      nickname: newUser.nickname,
      isFirstLogin: newUser.isFirstLogin
    });

    console.log('[/api/users/sync] ===== END USER SYNC (CREATE) =====');
    return NextResponse.json({ ok: true, user: newUser });
  } catch (err: unknown) {
    console.error('[/api/users/sync] ❌ ERROR:', err);
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
  console.log('[/api/users/sync] ===== START USER FETCH =====');
  
  try {
    // Test database connection
    console.log('[/api/users/sync] Testing database connection...');
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log('[/api/users/sync] ✅ Database connection successful');
    } catch (dbError) {
      console.error('[/api/users/sync] ❌ Database connection failed:', dbError);
      throw new Error('Database connection failed');
    }

    const { userId: clerkId } = await auth();
    console.log('[/api/users/sync] GET - ClerkId from auth:', clerkId ? `${clerkId.substring(0, 8)}...` : 'null');
    
    if (!clerkId) {
      console.log('[/api/users/sync] ❌ GET - No clerkId found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[/api/users/sync] Fetching user from database...');
    const currentUser = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!currentUser) {
      console.log('[/api/users/sync] ❌ User not found in database');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('[/api/users/sync] ✅ User found:', {
      id: currentUser.id,
      email: currentUser.email,
      nickname: currentUser.nickname,
      isFirstLogin: currentUser.isFirstLogin,
      lastLoginAt: currentUser.lastLoginAt
    });

    console.log('[/api/users/sync] ===== END USER FETCH =====');
    return NextResponse.json(currentUser);
  } catch (error) {
    console.error('[/api/users/sync] ❌ GET ERROR:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
