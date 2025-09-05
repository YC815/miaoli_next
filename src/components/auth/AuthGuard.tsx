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
  const [syncError, setSyncError] = useState<string | null>(null);

  const syncUserToDatabase = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 seconds timeout

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
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const userData = await response.json();
        setDbUser(userData);
        
        if (userData.isFirstLogin || !userData.nickname) {
          setIsOnboardingOpen(true);
        }
      } else {
        throw new Error('Failed to sync user');
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error('Error syncing user: Timeout');
        setSyncError('使用者資料同步失敗，請稍後再試');
        toast.error("使用者資料同步失敗，請稍後再試");
      } else {
        console.error('Error syncing user:', error);
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

  if (isSignedIn && (dbUser || syncError)) {
    return (
      <>
        {React.cloneElement(children as React.ReactElement, { dbUser })}
        <OnboardingFlow 
          open={isOnboardingOpen}
          onComplete={handleOnboardingComplete}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        <p className="text-muted-foreground">正在同步使用者資料...</p>
      </div>
    </div>
  );
}