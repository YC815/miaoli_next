"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, UserCheck, Users } from "lucide-react";

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

interface UserEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onUserUpdate: (updatedUser: User) => void;
}

export function UserEditModal({ open, onOpenChange, user, onUserUpdate }: UserEditModalProps) {
  const [nickname, setNickname] = useState("");
  const [role, setRole] = useState<"admin" | "staff" | "volunteer">("volunteer");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      setNickname(user.nickname || "");
      setRole(user.role);
      setError("");
    }
  }, [user]);

  const handleSubmit = async () => {
    if (!user) return;

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nickname: nickname.trim() || undefined,
          role,
        }),
      });

      if (response.ok) {
        const updatedUser = await response.json();
        onUserUpdate(updatedUser);
        onOpenChange(false);
      } else {
        const errorData = await response.json();
        setError(errorData.error || '更新失敗');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      setError('更新用戶時發生錯誤');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setError("");
    }
    onOpenChange(newOpen);
  };

  const getRoleInfo = (roleValue: string) => {
    switch (roleValue) {
      case "admin":
        return {
          label: "管理員",
          icon: <Crown className="h-4 w-4" />,
          description: "系統完整管理權限，可以管理所有用戶和系統設定",
          color: "text-blue-600"
        };
      case "staff":
        return {
          label: "工作人員",
          icon: <UserCheck className="h-4 w-4" />,
          description: "可以執行日常物資管理操作，查看報表和記錄",
          color: "text-green-600"
        };
      case "volunteer":
        return {
          label: "志工",
          icon: <Users className="h-4 w-4" />,
          description: "協助基本物資登記和查看，部分操作需要審核",
          color: "text-orange-600"
        };
      default:
        return {
          label: roleValue,
          icon: <Users className="h-4 w-4" />,
          description: "",
          color: "text-gray-600"
        };
    }
  };

  const selectedRoleInfo = getRoleInfo(role);
  const currentRoleInfo = user ? getRoleInfo(user.role) : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">編輯用戶資料</DialogTitle>
          <DialogDescription>
            修改用戶的暱稱和角色權限
          </DialogDescription>
        </DialogHeader>
        
        {user && (
          <div className="space-y-4">
            {/* 用戶基本資訊 */}
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                  {user.avatarUrl ? (
                    <img 
                      src={user.avatarUrl} 
                      alt="頭像" 
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-white font-medium">
                      {user.nickname?.charAt(0) || user.email.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{user.email}</div>
                  <div className="text-xs text-muted-foreground">
                    註冊時間：{new Date(user.createdAt).toLocaleDateString('zh-TW')}
                  </div>
                </div>
                {currentRoleInfo && (
                  <Badge variant="outline" className={`${currentRoleInfo.color} border-current`}>
                    {currentRoleInfo.icon}
                    <span className="ml-1">{currentRoleInfo.label}</span>
                  </Badge>
                )}
              </div>
            </div>

            {/* 暱稱編輯 */}
            <div className="space-y-2">
              <Label htmlFor="nickname">暱稱</Label>
              <Input
                id="nickname"
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="請輸入暱稱"
                maxLength={20}
                disabled={isSubmitting}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>留空則顯示信箱前綴</span>
                <span>{nickname.length}/20</span>
              </div>
            </div>

            {/* 角色選擇 */}
            <div className="space-y-2">
              <Label>角色權限</Label>
              <Select value={role} onValueChange={(value: "admin" | "staff" | "volunteer") => setRole(value)}>
                <SelectTrigger disabled={isSubmitting}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="volunteer">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-orange-600" />
                      <span>志工</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="staff">
                    <div className="flex items-center space-x-2">
                      <UserCheck className="h-4 w-4 text-green-600" />
                      <span>工作人員</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex items-center space-x-2">
                      <Crown className="h-4 w-4 text-blue-600" />
                      <span>管理員</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              
              {/* 角色說明 */}
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                <div className="flex items-start space-x-2">
                  <div className={`flex-shrink-0 mt-0.5 ${selectedRoleInfo.color}`}>
                    {selectedRoleInfo.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      {selectedRoleInfo.label}權限
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-200 mt-1">
                      {selectedRoleInfo.description}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 錯誤訊息 */}
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            取消
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !user}
          >
            {isSubmitting ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                <span>更新中...</span>
              </div>
            ) : (
              "確認更新"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}