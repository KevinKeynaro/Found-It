"use client";

import { Suspense } from "react";
import { useAuth } from "@/context/AuthContext";
import { TopBar } from "./TopBar";
import { BottomTabBar } from "./BottomTabBar";
import { Skeleton } from "@/components/ui/Skeleton";

export function AppLayout({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <header className="h-16 border-b border-slate-200 bg-white px-4 sm:px-8 flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-24 rounded-full" />
        </header>
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </main>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Mandatory password change mode: no navigation bar
  if (user.must_change_password) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Suspense fallback={<div className="h-16 border-b border-slate-200 bg-white" />}>
        <TopBar />
      </Suspense>
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 lg:pb-8">
        {children}
      </main>
      <Suspense fallback={null}>
        <BottomTabBar />
      </Suspense>
    </div>
  );
}
