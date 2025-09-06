import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { nickname } = await request.json();

    // 驗證暱稱
    if (!nickname || typeof nickname !== 'string' || nickname.trim().length === 0) {
      return NextResponse.json(
        { error: '暱稱不能為空' },
        { status: 400 }
      );
    }

    if (nickname.trim().length > 20) {
      return NextResponse.json(
        { error: '暱稱不能超過 20 個字符' },
        { status: 400 }
      );
    }

    // 查找當前用戶
    const currentUser = await prisma.user.findUnique({
      where: { clerkId },
    });
    
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 檢查暱稱是否已被使用（排除自己）
    const nicknameExists = await prisma.user.findFirst({
      where: {
        nickname: nickname.trim(),
        NOT: {
          id: currentUser.id
        }
      }
    });

    if (nicknameExists) {
      return NextResponse.json(
        { error: '此暱稱已被使用，請選擇其他暱稱' },
        { status: 409 }
      );
    }

    // 更新用戶資料
    const updatedUser = await prisma.user.update({
      where: { clerkId },
      data: {
        nickname: nickname.trim(),
        isFirstLogin: false,
        lastLoginAt: new Date(),
      },
    });

    return NextResponse.json({
      message: '暱稱設定成功',
      user: updatedUser
    });

  } catch (error) {
    console.error('Error completing onboarding:', error);
    return NextResponse.json(
      { error: '設定暱稱時發生錯誤' },
      { status: 500 }
    );
  }
}