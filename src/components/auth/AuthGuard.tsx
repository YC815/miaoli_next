"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { OnboardingFlow } from "./OnboardingFlow";

interface User {
  id: string;
  clerkId: string;
  email: string;
  nickname?: string;
  role: "admin" | "staff" | "volunteer";
  isFirstLogin: boolean;
}

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isLoaded, isSignedIn, user: clerkUser } = useUser();
  const [dbUser, setDbUser] = useState<User | null>(null);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isLoaded && isSignedIn && clerkUser) {
      syncUserToDatabase();
    } else if (isLoaded && !isSignedIn) {
      setIsLoading(false);
    }
  }, [isLoaded, isSignedIn, clerkUser]);

  const syncUserToDatabase = async () => {
    try {
      const response = await fetch('/api/users/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clerkId: clerkUser?.id,
          email: clerkUser?.emailAddresses[0]?.emailAddress,
          avatarUrl: clerkUser?.imageUrl,
        }),
      });

      if (response.ok) {
        const userData = await response.json();
        setDbUser(userData);
        
        // 如果是首次登入且沒有暱稱，顯示 Onboarding
        if (userData.isFirstLogin || !userData.nickname) {
          setIsOnboardingOpen(true);
        }
      } else {
        throw new Error('Failed to sync user');
      }
    } catch (error) {
      console.error('Error syncing user:', error);
    } finally {
      setIsLoading(false);
    }
  };

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

  // Loading 狀態
  if (isLoading || !isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          <p className="text-muted-foreground">載入中...</p>
        </div>
      </div>
    );
  }

  // 未登入狀態 - Clerk 會自動重導向到登入頁面
  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center mb-4">
            <span className="text-primary-foreground font-bold text-lg">苗</span>
          </div>
          <h1 className="text-2xl font-bold">苗栗社福物資管理平台</h1>
          <p className="text-muted-foreground">請先登入以繼續使用</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {children}
      <OnboardingFlow 
        open={isOnboardingOpen}
        onComplete={handleOnboardingComplete}
      />
    </>
  );
}