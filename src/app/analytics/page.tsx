"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/theme-toggle";
import { AuthGuard, User } from "@/components/auth/AuthGuard";
import { SignOutButton } from "@clerk/nextjs";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

interface AnalyticsPageProps {
  dbUser?: User | null;
}

function AnalyticsPage({ dbUser = null }: AnalyticsPageProps) {
  const router = useRouter();

  const roleMapping = {
    ADMIN: '管理員',
    STAFF: '工作人員',
    VOLUNTEER: '志工',
  };

  return (
    <div className="h-screen bg-gradient-to-br from-background via-background to-muted/20 flex flex-col">
      {/* Navigation Bar */}
      <nav className="border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 flex-shrink-0">
        <div className="container flex h-14 sm:h-16 items-center justify-between px-2 sm:px-4 lg:px-6 xl:px-8">
          {/* Left: Back Button + Brand */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/')}
              className="h-7 w-7 sm:h-8 sm:w-8 p-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs sm:text-sm">苗</span>
            </div>
            <h1 className="hidden sm:block text-lg sm:text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              資料圖表
            </h1>
          </div>

          {/* Right: User Info & Settings */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <ModeToggle />

            {dbUser && (
              <>
                {/* Divider */}
                <div className="hidden md:block h-6 w-px bg-border" />

                <div className="flex items-center gap-1 sm:gap-2 lg:gap-3">
                  {/* Role Badge */}
                  <span className="hidden sm:inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border">
                    {roleMapping[dbUser.role]}
                  </span>

                  {/* User Avatar */}
                  <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                    <span className="text-white font-medium text-xs sm:text-sm">{dbUser.nickname?.[0]}</span>
                  </div>

                  {/* User Name */}
                  <span className="hidden lg:block text-sm font-medium text-foreground">
                    {dbUser.nickname}
                  </span>

                  {/* Sign Out Button */}
                  <SignOutButton>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="hidden md:block text-sm text-muted-foreground hover:text-foreground px-4"
                    >
                      登出
                    </Button>
                  </SignOutButton>
                </div>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content - Full Screen Iframe */}
      <main className="flex-1 overflow-hidden">
        <iframe
          src="https://lookerstudio.google.com/embed/reporting/9965dcaa-d77d-4e34-9ed4-80342731e830/page/ibvbF"
          className="w-full h-full border-0"
          allowFullScreen
        />
      </main>
    </div>
  );
}

// Wrap with AuthGuard
export default function App() {
  return (
    <AuthGuard>
      <AnalyticsPage />
    </AuthGuard>
  );
}
