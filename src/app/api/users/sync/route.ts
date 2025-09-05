import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// 注意：這裡暫時使用內存存儲，實際應用中應該使用 Prisma
// 這是為了展示 API 結構，待資料庫設定完成後再替換

interface User {
  id: string;
  clerkId: string;
  email: string;
  nickname?: string;
  avatarUrl?: string;
  role: "admin" | "staff" | "volunteer";
  isFirstLogin: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

// 臨時的內存用戶存儲（實際應用中會使用資料庫）
const users = new Map<string, User>();

export async function POST(request: NextRequest) {
  try {
    // 驗證 Clerk 身份
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clerkId, email, avatarUrl } = await request.json();

    // 檢查資料庫中是否已存在此用戶
    let existingUser = Array.from(users.values()).find(user => user.clerkId === clerkId);

    if (existingUser) {
      // 更新最後登入時間和頭像
      existingUser.lastLoginAt = new Date();
      existingUser.avatarUrl = avatarUrl;
      existingUser.updatedAt = new Date();
      users.set(existingUser.id, existingUser);
      
      return NextResponse.json(existingUser);
    } else {
      // 建立新用戶
      const newUser: User = {
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        clerkId,
        email,
        avatarUrl,
        role: "volunteer", // 預設為志工
        isFirstLogin: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date(),
      };

      users.set(newUser.id, newUser);
      
      return NextResponse.json(newUser, { status: 201 });
    }
  } catch (error) {
    console.error('Error syncing user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
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

    return NextResponse.json(currentUser);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 導出用戶數據（用於其他 API 路由，實際應用中會通過資料庫查詢）
export { users };