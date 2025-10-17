import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { randomUUID } from 'crypto';

export async function GET() {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { clerkId },
      include: { seal: true },
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update last login time
    const updatedUser = await prisma.user.update({
      where: { id: currentUser.id },
      data: {
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      },
      include: { seal: true },
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
    const { nickname, sealImageDataUrl } = await request.json();
    console.log('[/api/users/profile] Received update request:', {
      nickname: nickname,
      hasSealImage: Boolean(sealImageDataUrl),
    });

    // Step 4: Find current user
    console.log('[/api/users/profile] Finding user in database...');
    const currentUser = await prisma.user.findUnique({
      where: { clerkId },
      include: { seal: true },
    });

    if (!currentUser) {
      console.log('[/api/users/profile] ❌ User not found in database');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('[/api/users/profile] Found current user:', {
      id: currentUser.id,
      email: currentUser.email,
      currentNickname: currentUser.nickname,
      hasSeal: Boolean(currentUser.seal),
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

    // Step 8: Handle seal image update
    if (sealImageDataUrl) {
      console.log('[/api/users/profile] Processing seal image...');

      // Validate image data URL format
      const match = sealImageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) {
        return NextResponse.json({ error: '無效的圖片格式' }, { status: 400 });
      }

      const mimeType = match[1];
      const base64Data = match[2];

      // Validate MIME type
      if (!['image/png', 'image/jpeg', 'image/jpg'].includes(mimeType)) {
        return NextResponse.json({ error: '僅支援 PNG 或 JPEG 格式' }, { status: 400 });
      }

      // Validate size (2MB limit)
      const buffer = Buffer.from(base64Data, 'base64');
      if (buffer.length > 2 * 1024 * 1024) {
        return NextResponse.json({ error: '圖片大小不得超過 2MB' }, { status: 400 });
      }

      // Ensure nickname is set before creating seal
      const sealNickname = newNickname || currentUser.email.split('@')[0];

      // Upsert seal
      if (currentUser.seal) {
        console.log('[/api/users/profile] Updating existing seal...');
        await prisma.receiptSeal.update({
          where: { userId: currentUser.id },
          data: {
            nickname: sealNickname,
            imageData: base64Data,
            mimeType,
            updatedAt: new Date(),
          },
        });
      } else {
        console.log('[/api/users/profile] Creating new seal...');
        await prisma.receiptSeal.create({
          data: {
            id: randomUUID(),
            userId: currentUser.id,
            nickname: sealNickname,
            imageData: base64Data,
            mimeType,
            updatedAt: new Date(),
          },
        });
      }
      console.log('[/api/users/profile] ✅ Seal updated successfully');
    }

    // Step 9: Update user data
    console.log('[/api/users/profile] Updating user in database...');
    const updatedUser = await prisma.user.update({
      where: { id: currentUser.id },
      data: {
        nickname: newNickname,
        updatedAt: new Date(),
      },
      include: { seal: true },
    });

    console.log('[/api/users/profile] ✅ User updated successfully');

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
