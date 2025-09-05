import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { users } from '../../../users/sync/route'; // 臨時導入用戶存儲

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 驗證 Clerk 身份
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const targetUserId = params.id;
    const { nickname, role } = await request.json();

    // 檢查當前用戶是否為管理員
    const currentUser = Array.from(users.values()).find(user => user.clerkId === userId);
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Current user not found' }, { status: 404 });
    }

    if (currentUser.role !== 'admin') {
      return NextResponse.json({ 
        error: 'Access denied. Admin privileges required.' 
      }, { status: 403 });
    }

    // 查找目標用戶
    const targetUser = users.get(targetUserId);
    if (!targetUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }

    // 驗證輸入資料
    if (nickname && (typeof nickname !== 'string' || nickname.length > 20)) {
      return NextResponse.json({ 
        error: 'Invalid nickname. Must be a string with max 20 characters.' 
      }, { status: 400 });
    }

    if (role && !['admin', 'staff', 'volunteer'].includes(role)) {
      return NextResponse.json({ 
        error: 'Invalid role. Must be admin, staff, or volunteer.' 
      }, { status: 400 });
    }

    // 檢查暱稱是否已被其他用戶使用
    if (nickname && nickname.trim()) {
      const nicknameExists = Array.from(users.values()).some(
        user => user.id !== targetUserId && 
                user.nickname?.toLowerCase() === nickname.trim().toLowerCase()
      );

      if (nicknameExists) {
        return NextResponse.json({
          error: '此暱稱已被其他用戶使用'
        }, { status: 409 });
      }
    }

    // 防止管理員降級自己（除非還有其他管理員）
    if (role && role !== 'admin' && currentUser.id === targetUserId) {
      const otherAdmins = Array.from(users.values()).filter(
        user => user.role === 'admin' && user.id !== targetUserId
      );

      if (otherAdmins.length === 0) {
        return NextResponse.json({
          error: '無法降級，系統至少需要一位管理員'
        }, { status: 400 });
      }
    }

    // 更新用戶資料
    const updatedUser = {
      ...targetUser,
      nickname: nickname !== undefined ? (nickname.trim() || undefined) : targetUser.nickname,
      role: role || targetUser.role,
      updatedAt: new Date(),
    };

    users.set(targetUserId, updatedUser);

    // 記錄操作日誌
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
    // 驗證 Clerk 身份
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const targetUserId = params.id;

    // 檢查當前用戶權限
    const currentUser = Array.from(users.values()).find(user => user.clerkId === userId);
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Current user not found' }, { status: 404 });
    }

    // 查找目標用戶
    const targetUser = users.get(targetUserId);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 只有管理員可以查看其他用戶資料，或用戶查看自己的資料
    if (currentUser.role !== 'admin' && currentUser.id !== targetUserId) {
      return NextResponse.json({ 
        error: 'Access denied. Cannot view other users.' 
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