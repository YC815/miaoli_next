"use client";

import { useMemo } from 'react';
import { getPermissions, hasPermission, type Permission, type UserRole } from '@/lib/permissions';
import type { User } from '@/components/auth/AuthGuard';

interface UsePermissionsReturn {
  permissions: Permission;
  hasPermission: (permission: keyof Permission) => boolean;
  role: UserRole | null;
}

/**
 * 權限檢查 Hook
 * 用於在組件中檢查當前用戶的權限
 */
export function usePermissions(dbUser: User | null): UsePermissionsReturn {
  const role = dbUser?.role || null;

  const permissions = useMemo(() => {
    if (!role) {
      // 如果沒有角色，返回所有權限為 false 的預設權限
      return getPermissions('VOLUNTEER' as UserRole); // 使用最低權限作為預設
    }
    return getPermissions(role);
  }, [role]);

  const checkPermission = (permission: keyof Permission): boolean => {
    if (!role) return false;
    return hasPermission(role, permission);
  };

  return {
    permissions,
    hasPermission: checkPermission,
    role,
  };
}

/**
 * 權限組件 - 只有當用戶有指定權限時才顯示子組件
 */
interface PermissionGateProps {
  children: React.ReactNode;
  permission: keyof Permission;
  dbUser: User | null;
  fallback?: React.ReactNode;
}

export function PermissionGate({ children, permission, dbUser, fallback = null }: PermissionGateProps) {
  const { hasPermission } = usePermissions(dbUser);
  
  if (!hasPermission(permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}