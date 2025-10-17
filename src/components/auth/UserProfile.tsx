"use client";

/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@clerk/nextjs";
import { Crown, UserCheck, Users, Edit2, Upload, Stamp } from "lucide-react";
import Image from "next/image";
import { User } from "./AuthGuard";
import { toast } from "sonner";
import { SealCropperDialog } from "@/components/receipt/SealCropperDialog";

interface UserProfileProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dbUser: User | null;
  onUserUpdate?: (updatedUser: User) => void;
}

interface UserWithSeal extends User {
  seal?: {
    id: string;
    imageData: string;
    mimeType: string;
    nickname: string;
  } | null;
}

export function UserProfile({ open, onOpenChange, dbUser, onUserUpdate }: UserProfileProps) {
  const { user: clerkUser } = useUser();
  const [nickname, setNickname] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [userWithSeal, setUserWithSeal] = useState<UserWithSeal | null>(null);
  const [cropState, setCropState] = useState<{ open: boolean; imageSrc?: string }>({
    open: false,
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (dbUser) {
      setNickname(dbUser.nickname || "");
      // Fetch user with seal info
      fetchUserProfile();
    }
  }, [dbUser]);

  const fetchUserProfile = async () => {
    try {
      const response = await fetch('/api/users/profile');
      if (response.ok) {
        const userData = await response.json();
        setUserWithSeal(userData);
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    }
  };

  const handleSubmit = async () => {
    if (!dbUser) return;

    setIsSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const requestData = {
        nickname: nickname.trim() || undefined,
      };

      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (response.ok) {
        const updatedUserData = await response.json();
        setSuccess('資料更新成功！');
        setUserWithSeal(updatedUserData);

        if (onUserUpdate) {
          onUserUpdate(updatedUserData);
        }

        setTimeout(() => {
          setSuccess("");
          onOpenChange(false);

          if (!onUserUpdate) {
            window.location.reload();
          }
        }, 1500);
      } else {
        const errorData = await response.json();
        setError(errorData.error || '更新失敗');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('更新資料時發生錯誤');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUploadSeal = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('請選擇圖片檔案');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCropState({
        open: true,
        imageSrc: reader.result as string,
      });
    };
    reader.onerror = () => toast.error('讀取圖片失敗');
    reader.readAsDataURL(file);
  };

  const handleCropConfirm = async (result: { dataUrl: string; name: string }) => {
    setCropState({ open: false });
    setIsSubmitting(true);

    try {
      const requestData = {
        nickname: nickname.trim() || undefined,
        sealImageDataUrl: result.dataUrl,
      };

      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (response.ok) {
        const updatedUserData = await response.json();
        toast.success('印章上傳成功！');
        setUserWithSeal(updatedUserData);

        if (onUserUpdate) {
          onUserUpdate(updatedUserData);
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || '上傳印章失敗');
      }
    } catch (error) {
      console.error('Error uploading seal:', error);
      toast.error('上傳印章時發生錯誤');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setError("");
      setSuccess("");
      if (dbUser) {
        setNickname(dbUser.nickname || "");
      }
    }
    onOpenChange(newOpen);
  };

  const getRoleInfo = (role: string) => {
    switch (role) {
      case "ADMIN":
        return {
          label: "管理員",
          icon: <Crown className="h-4 w-4" />,
          description: "系統完整管理權限",
          color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
        };
      case "STAFF":
        return {
          label: "工作人員",
          icon: <UserCheck className="h-4 w-4" />,
          description: "日常物資管理操作",
          color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
        };
      case "VOLUNTEER":
        return {
          label: "志工",
          icon: <Users className="h-4 w-4" />,
          description: "協助基本物資管理",
          color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
        };
      default:
        return {
          label: role,
          icon: <Users className="h-4 w-4" />,
          description: "",
          color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
        };
    }
  };

  const roleInfo = dbUser ? getRoleInfo(dbUser.role) : null;

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return "N/A";
    const d = new Date(date);
    return d.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSealImageUrl = () => {
    if (!userWithSeal?.seal) return null;
    return `/api/seals/${userWithSeal.seal.id}/image?t=${Date.now()}`;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              <Edit2 className="h-5 w-5" />
              個人資料設定
            </DialogTitle>
            <DialogDescription>
              查看和修改您的個人資料
            </DialogDescription>
          </DialogHeader>

          {dbUser ? (
            <div className="space-y-4">
              {/* 用戶基本資訊 */}
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                    {clerkUser?.imageUrl ? (
                      <Image
                        src={clerkUser.imageUrl}
                        alt="頭像"
                        width={48}
                        height={48}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-white font-medium text-lg">
                        {dbUser.nickname?.charAt(0) || dbUser.email.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{dbUser.email}</div>
                    <div className="text-sm text-muted-foreground">
                      {dbUser.nickname || "未設定暱稱"}
                    </div>
                  </div>
                  {roleInfo && (
                    <Badge className={roleInfo.color}>
                      {roleInfo.icon}
                      <span className="ml-1">{roleInfo.label}</span>
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">註冊時間</span>
                    <div className="font-medium">{formatDate(dbUser.createdAt)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">最後登入</span>
                    <div className="font-medium">
                      {formatDate(dbUser.lastLoginAt)}
                    </div>
                  </div>
                </div>
              </div>

              {/* 暱稱編輯 */}
              <div className="space-y-2">
                <Label htmlFor="nickname">暱稱設定</Label>
                <Input
                  id="nickname"
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="請輸入您的暱稱"
                  maxLength={20}
                  disabled={isSubmitting}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>暱稱將顯示在操作記錄和印章中</span>
                  <span>{nickname.length}/20</span>
                </div>
              </div>

              {/* 印章管理 */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Stamp className="h-4 w-4" />
                  個人印章
                </Label>
                <div className="p-4 border rounded-lg space-y-3">
                  {getSealImageUrl() ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="relative">
                        <img
                          src={getSealImageUrl()!}
                          alt="我的印章"
                          className="h-32 w-32 rounded border bg-white object-contain"
                        />
                      </div>
                      <div className="text-xs text-center text-muted-foreground">
                        {userWithSeal?.seal?.nickname && (
                          <div>印章暱稱：{userWithSeal.seal.nickname}</div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-32 text-sm text-muted-foreground">
                      尚未上傳印章
                    </div>
                  )}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleUploadSeal}
                    disabled={isSubmitting}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {userWithSeal?.seal ? '更換印章' : '上傳印章'}
                  </Button>
                  <div className="text-xs text-muted-foreground text-center">
                    支援 PNG、JPEG 格式，最大 2MB
                  </div>
                </div>
              </div>

              {/* 權限說明 */}
              {roleInfo && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <div className="flex-shrink-0 mt-0.5 text-blue-600">
                      {roleInfo.icon}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        您的角色：{roleInfo.label}
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-200 mt-1">
                        {roleInfo.description}。如需調整權限,請聯絡管理員。
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 成功訊息 */}
              {success && (
                <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                  <p className="text-sm text-green-800 dark:text-green-200">{success}</p>
                </div>
              )}

              {/* 錯誤訊息 */}
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">無法載入使用者資料</p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              關閉
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !dbUser || nickname === (dbUser?.nickname || "")}
            >
              {isSubmitting ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  <span>更新中...</span>
                </div>
              ) : (
                "更新暱稱"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Seal cropper dialog */}
      <SealCropperDialog
        open={cropState.open}
        imageSrc={cropState.imageSrc}
        defaultName={nickname || dbUser?.email.split('@')[0] || '我的印章'}
        onOpenChange={(open) => setCropState({ open, imageSrc: cropState.imageSrc })}
        onConfirm={handleCropConfirm}
      />
    </>
  );
}
