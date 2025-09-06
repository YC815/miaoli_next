"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useUser } from "@clerk/nextjs";
import Image from "next/image";

interface OnboardingFlowProps {
  open: boolean;
  onComplete: (nickname: string) => void;
}

export function OnboardingFlow({ open, onComplete }: OnboardingFlowProps) {
  const { user } = useUser();
  const [nickname, setNickname] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!nickname.trim()) return;
    
    setIsSubmitting(true);
    try {
      // 調用 API 更新用戶資料
      const response = await fetch('/api/users/complete-onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nickname: nickname.trim() }),
      });

      if (response.ok) {
        onComplete(nickname);
      } else {
        throw new Error('Failed to update user profile');
      }
    } catch (error) {
      console.error('Error completing onboarding:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && nickname.trim() && !isSubmitting) {
      handleSubmit();
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-center">
            歡迎加入苗栗社福！
          </DialogTitle>
          <DialogDescription className="text-center">
            請設定您的暱稱，方便在操作記錄中識別
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* 用戶資訊預覽 */}
          <div className="flex flex-col items-center space-y-3">
            <div className="h-16 w-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
              {user?.imageUrl ? (
                <Image 
                  src={user.imageUrl} 
                  alt="用戶頭像" 
                  width={64}
                  height={64}
                  className="h-16 w-16 rounded-full object-cover"
                />
              ) : (
                <span className="text-white font-medium text-lg">
                  {user?.firstName?.charAt(0) || user?.emailAddresses[0]?.emailAddress?.charAt(0) || "用"}
                </span>
              )}
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">登入帳號</p>
              <p className="font-medium">
                {user?.emailAddresses[0]?.emailAddress}
              </p>
            </div>
          </div>

          {/* 暱稱輸入 */}
          <div className="space-y-2">
            <Label htmlFor="nickname">暱稱設定</Label>
            <Input
              id="nickname"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="請輸入您的暱稱（如：小明、志工阿華）"
              maxLength={20}
              className="text-base"
              disabled={isSubmitting}
            />
            <div className="flex justify-between items-center">
              <p className="text-xs text-muted-foreground">
                暱稱將顯示在操作記錄中，之後可隨時修改
              </p>
              <span className="text-xs text-muted-foreground">
                {nickname.length}/20
              </span>
            </div>
          </div>

          {/* 角色說明 */}
          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
            <div className="flex items-start space-x-2">
              <div className="flex-shrink-0 mt-0.5">
                <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
              </div>
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  您的初始角色：志工
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-200 mt-1">
                  可以查看物資清單、協助登記捐贈。如需更多權限，請聯絡管理員。
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4">
          <Button 
            onClick={handleSubmit}
            disabled={!nickname.trim() || isSubmitting}
            className="w-full"
            size="lg"
          >
            {isSubmitting ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                <span>設定中...</span>
              </div>
            ) : (
              "完成設定，開始使用"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}