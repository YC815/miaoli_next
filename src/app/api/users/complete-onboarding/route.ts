import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { users } from '../sync/route'; // 臨時導入用戶存儲

export async function POST(request: NextRequest) {
  try {
    // 驗證 Clerk 身份
    const { userId } = await auth();
    if (!userId) {
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
    const currentUser = Array.from(users.values()).find(user => user.clerkId === userId);
    
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 檢查暱稱是否已被使用（排除自己）
    const nicknameExists = Array.from(users.values()).some(
      user => user.id !== currentUser.id && user.nickname?.toLowerCase() === nickname.trim().toLowerCase()
    );

    if (nicknameExists) {
      return NextResponse.json(
        { error: '此暱稱已被使用，請選擇其他暱稱' },
        { status: 409 }
      );
    }

    // 更新用戶資料
    currentUser.nickname = nickname.trim();
    currentUser.isFirstLogin = false;
    currentUser.updatedAt = new Date();
    users.set(currentUser.id, currentUser);

    // 記錄操作日誌（實際應用中會存儲到資料庫）
    console.log(`User ${currentUser.email} completed onboarding with nickname: ${nickname.trim()}`);

    return NextResponse.json({
      message: '暱稱設定成功',
      user: currentUser
    });

  } catch (error) {
    console.error('Error completing onboarding:', error);
    return NextResponse.json(
      { error: '設定暱稱時發生錯誤' },
      { status: 500 }
    );
  }
}