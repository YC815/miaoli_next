"use client";

import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Shield, 
  Users, 
  Crown,
  MoreHorizontal,
  UserCheck,
  Clock
} from "lucide-react";
import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserEditModal } from "./UserEditModal";

interface User {
  id: string;
  clerkId: string;
  email: string;
  nickname?: string;
  avatarUrl?: string;
  role: "ADMIN" | "STAFF" | "VOLUNTEER";
  isFirstLogin: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

export function StaffManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const filtered = users.filter(user => 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.nickname && user.nickname.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredUsers(filtered);
  }, [users, searchTerm]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const userData = await response.json();
        setUsers(userData);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };

  const handleUserUpdate = (updatedUser: User) => {
    setUsers(users.map(user => 
      user.id === updatedUser.id ? updatedUser : user
    ));
    setIsEditModalOpen(false);
    setSelectedUser(null);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "ADMIN":
        return (
          <Badge variant="default" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            <Crown className="h-3 w-3 mr-1" />
            管理員
          </Badge>
        );
      case "STAFF":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <UserCheck className="h-3 w-3 mr-1" />
            工作人員
          </Badge>
        );
      case "VOLUNTEER":
        return (
          <Badge variant="outline" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
            <Users className="h-3 w-3 mr-1" />
            志工
          </Badge>
        );
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatistics = () => {
    const total = users.length;
    const admins = users.filter(u => u.role === 'ADMIN').length;
    const staff = users.filter(u => u.role === 'STAFF').length;
    const volunteers = users.filter(u => u.role === 'VOLUNTEER').length;
    const newUsers = users.filter(u => u.isFirstLogin).length;

    return { total, admins, staff, volunteers, newUsers };
  };

  const stats = getStatistics();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-w-full mx-auto">
      {/* 頁面標題和統計 */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-8 w-8 rounded-lg bg-blue-500 flex items-center justify-center">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">人員管理</h1>
            <p className="text-muted-foreground">管理系統用戶與權限設定</p>
          </div>
        </div>

        {/* 統計卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-card rounded-lg border p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">總用戶數</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <div className="flex items-center space-x-2">
              <Crown className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">管理員</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-blue-600">{stats.admins}</p>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <div className="flex items-center space-x-2">
              <UserCheck className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">工作人員</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-green-600">{stats.staff}</p>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-muted-foreground">志工</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-orange-600">{stats.volunteers}</p>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-muted-foreground">新用戶</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-purple-600">{stats.newUsers}</p>
          </div>
        </div>
      </div>

      {/* 搜尋欄 */}
      <div className="flex justify-between items-center mb-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜尋用戶信箱或暱稱..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          共 {filteredUsers.length} 位用戶
        </div>
      </div>

      {/* 用戶列表 */}
      <div className="flex-1 rounded-lg border bg-card shadow-sm overflow-hidden">
        <div className="overflow-auto h-full">
          <Table>
            <TableHeader className="sticky top-0 bg-muted/50 z-10">
              <TableRow>
                <TableHead className="font-semibold">用戶</TableHead>
                <TableHead className="font-semibold">暱稱</TableHead>
                <TableHead className="font-semibold">角色</TableHead>
                <TableHead className="font-semibold">註冊時間</TableHead>
                <TableHead className="font-semibold">最後登入</TableHead>
                <TableHead className="font-semibold">狀態</TableHead>
                <TableHead className="w-[80px] text-center font-semibold">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Users className="h-8 w-8" />
                      <p>找不到符合條件的用戶</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id} className="hover:bg-muted/20">
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                          {user.avatarUrl ? (
                            <Image 
                              src={user.avatarUrl} 
                              alt="頭像" 
                              width={32}
                              height={32}
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-white text-xs font-medium">
                              {user.nickname?.charAt(0) || user.email.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm truncate">{user.email}</div>
                          <div className="text-xs text-muted-foreground">ID: {user.id.slice(0, 8)}...</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {user.nickname || (
                          <span className="text-muted-foreground italic">未設定</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getRoleBadge(user.role)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatDate(user.createdAt)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {user.lastLoginAt ? (
                          formatDate(user.lastLoginAt)
                        ) : (
                          <span className="text-muted-foreground">從未登入</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.isFirstLogin ? (
                        <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                          首次登入
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                          已啟用
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => handleEditUser(user)}
                            className="cursor-pointer"
                          >
                            編輯用戶
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* 編輯用戶模態框 */}
      <UserEditModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        user={selectedUser}
        onUserUpdate={handleUserUpdate}
      />
    </div>
  );
}