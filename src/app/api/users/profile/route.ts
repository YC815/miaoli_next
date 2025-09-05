import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { users } from '../sync/route'; // 臨時導入用戶存儲

export async function GET(request: NextRequest) {
  try {
    // 驗證 Clerk 身份
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 查找當前用戶
    const currentUser = Array.from(users.values()).find(user => user.clerkId === userId);
    
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 更新最後登入時間
    currentUser.lastLoginAt = new Date();
    users.set(currentUser.id, currentUser);

    return NextResponse.json(currentUser);

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
    // 驗證 Clerk 身份
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { nickname } = await request.json();

    // 查找當前用戶
    const currentUser = Array.from(users.values()).find(user => user.clerkId === userId);
    
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 驗證暱稱
    if (nickname && (typeof nickname !== 'string' || nickname.length > 20)) {
      return NextResponse.json({ 
        error: '暱稱格式不正確，最多 20 個字符' 
      }, { status: 400 });
    }

    // 檢查暱稱是否已被其他用戶使用
    if (nickname && nickname.trim()) {
      const nicknameExists = Array.from(users.values()).some(
        user => user.id !== currentUser.id && 
                user.nickname?.toLowerCase() === nickname.trim().toLowerCase()
      );

      if (nicknameExists) {
        return NextResponse.json({
          error: '此暱稱已被其他用戶使用，請選擇其他暱稱'
        }, { status: 409 });
      }
    }

    // 更新用戶資料
    const updatedUser = {
      ...currentUser,
      nickname: nickname !== undefined ? (nickname.trim() || undefined) : currentUser.nickname,
      updatedAt: new Date(),
    };

    users.set(currentUser.id, updatedUser);

    // 記錄操作日誌
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