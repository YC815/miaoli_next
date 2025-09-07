"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { OnboardingFlow } from "./OnboardingFlow";
import { toast } from "sonner";


export interface User {
  id: string;
  clerkId: string;
  email: string;
  nickname?: string;
  role: "ADMIN" | "STAFF" | "VOLUNTEER";
  isFirstLogin: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

interface AuthGuardProps {
  children: React.ReactElement<{ dbUser?: User | null }>;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isLoaded, isSignedIn, user: clerkUser } = useUser();
  const [dbUser, setDbUser] = useState<User | null>(null);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);

  // 調試信息
  console.log('🔍 AuthGuard Debug:', {
    isLoaded: isLoaded,
    isSignedIn: isSignedIn,
    clerkUser: clerkUser ? { 
      id: clerkUser.id, 
      email: clerkUser.emailAddresses[0]?.emailAddress,
      hasEmailAddress: !!clerkUser.emailAddresses[0]?.emailAddress
    } : null,
    dbUser: dbUser,
    isOnboardingOpen: isOnboardingOpen,
    isLoading: isLoading,
    syncError: syncError
  });
  
  console.log('🔍 Detailed Status:');
  console.log('  - Clerk loaded:', isLoaded);
  console.log('  - User signed in:', isSignedIn);
  console.log('  - DB User exists:', !!dbUser);
  console.log('  - Currently loading:', isLoading);
  console.log('  - Sync error:', syncError);

  const syncUserToDatabase = useCallback(async () => {
    console.log('🔄 開始同步用戶資料:', { clerkUser: clerkUser?.id });
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 seconds timeout

      const response = await fetch('/api/users/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: clerkUser?.emailAddresses[0]?.emailAddress,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log('📡 API 回應:', { status: response.status, ok: response.ok });

      if (response.ok) {
        const userData = await response.json();
        console.log('✅ 用戶資料同步成功:', userData);
        
        // API 回傳格式是 { ok: true, user: {...} }，所以我們需要取 userData.user
        const user = userData.user || userData; // 向後兼容
        console.log('🎯 設置 DB User:', user);
        setDbUser(user);
        
        if (user.isFirstLogin || !user.nickname) {
          console.log('🎯 顯示新用戶歡迎頁面');
          setIsOnboardingOpen(true);
        } else {
          console.log('✅ 用戶已完成入職流程 - isFirstLogin:', user.isFirstLogin, 'nickname:', user.nickname);
        }
      } else {
        const errorData = await response.text();
        console.error('❌ API 錯誤:', errorData);
        throw new Error('Failed to sync user');
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('⏰ 用戶同步超時');
        setSyncError('使用者資料同步失敗，請稍後再試');
        toast.error("使用者資料同步失敗，請稍後再試");
      } else {
        console.error('💥 用戶同步錯誤:', error);
        setSyncError('使用者資料同步失敗，請稍後再試');
        toast.error("使用者資料同步失敗，請稍後再試");
      }
    } finally {
      setIsLoading(false);
    }
  }, [clerkUser]);

  useEffect(() => {
    if (isLoaded && isSignedIn && clerkUser) {
      syncUserToDatabase();
    } else if (isLoaded && !isSignedIn) {
      setIsLoading(false);
    }
    
    // Add a timeout to handle cases where Clerk doesn't load properly
    const timeout = setTimeout(() => {
      if (!isLoaded) {
        console.warn('⚠️ Clerk 載入超時，強制停止載入狀態');
        setIsLoading(false);
        setSyncError('Clerk 載入超時，請重新整理頁面');
      }
    }, 10000); // 10 seconds timeout
    
    return () => clearTimeout(timeout);
  }, [isLoaded, isSignedIn, clerkUser, syncUserToDatabase]);

  const handleOnboardingComplete = (nickname: string) => {
    if (dbUser) {
      setDbUser({
        ...dbUser,
        nickname,
        isFirstLogin: false,
      });
    }
    setIsOnboardingOpen(false);
  };

  if (isLoading || !isLoaded) {
    console.log('🌀 顯示載入畫面 - isLoading:', isLoading, 'isLoaded:', isLoaded);
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          <p className="text-muted-foreground">載入中...</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    console.log('🚫 用戶未登入，顯示登入提示');
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4 text-center max-w-md">
          <div className="text-4xl mb-4">🔒</div>
          <h2 className="text-2xl font-semibold">需要登入</h2>
          <p className="text-muted-foreground mb-6">
            請登入您的帳戶以使用物資管理系統
          </p>
          <button 
            onClick={() => window.location.href = '/sign-in'}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-lg font-medium"
          >
            前往登入
          </button>
        </div>
      </div>
    );
  }

  if (isSignedIn && (dbUser || syncError)) {
    console.log('✅ 顯示主要應用程式 - dbUser:', !!dbUser, 'syncError:', !!syncError);
    return (
      <>
        {React.cloneElement(children, { dbUser })}
        <OnboardingFlow 
          open={isOnboardingOpen}
          onComplete={handleOnboardingComplete}
        />
      </>
    );
  }
  
  // Handle case where Clerk doesn't load properly
  if (syncError && syncError.includes('載入超時')) {
    console.log('⚠️ Clerk 載入超時，顯示手動登入選項');
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4 text-center max-w-md">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-2xl font-semibold">載入逾時</h2>
          <p className="text-muted-foreground mb-6">
            系統載入時間過長，請嘗試手動登入或重新整理頁面
          </p>
          <div className="flex gap-3">
            <button 
              onClick={() => window.location.href = '/sign-in'}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              前往登入頁面
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
            >
              重新整理
            </button>
          </div>
        </div>
      </div>
    );
  }

  console.log('⏳ 顯示同步畫面');
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        <p className="text-muted-foreground">正在同步使用者資料...</p>
      </div>
    </div>
  );
}
