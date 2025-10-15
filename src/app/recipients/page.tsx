"use client";

import React from "react";
import Link from "next/link";
import { AuthGuard, User } from "@/components/auth/AuthGuard";
import { RecipientUnitsManagement } from "@/components/recipient/RecipientUnitsManagement";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function RecipientsPageContent({ dbUser }: { dbUser?: User | null }) {
  if (!dbUser) {
    return null;
  }

  const hasAccess = dbUser.role === "ADMIN" || dbUser.role === "STAFF";

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container max-w-5xl py-10 space-y-6">
        <div className="flex items-center justify-between">
          <Button asChild variant="outline">
            <Link href="/">← 返回主控台</Link>
          </Button>
        </div>

        {hasAccess ? (
          <RecipientUnitsManagement />
        ) : (
          <Card>
            <CardContent className="py-12 text-center space-y-4">
              <h2 className="text-xl font-semibold">權限不足</h2>
              <p className="text-muted-foreground">
                僅有管理員與工作人員可以存取領取單位管理頁面。如需協助，請聯絡系統管理員。
              </p>
              <Button asChild>
                <Link href="/">返回主控台</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function RecipientsPage() {
  return (
    <AuthGuard>
      <RecipientsPageContent />
    </AuthGuard>
  );
}
