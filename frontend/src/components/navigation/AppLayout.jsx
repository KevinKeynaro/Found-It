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
        <header className="h-16 lg:h-20 border-b border-slate-200 bg-white">
          <div className="max-w-[80rem] mx-auto px-4 md:px-6 lg:px-8 h-full flex items-center justify-between">
            <Skeleton className="h-8 lg:h-10 w-32 lg:w-40" />
            <Skeleton className="h-8 lg:h-10 w-24 lg:w-32 rounded-full" />
          </div>
        </header>
        <main className="flex-1 max-w-[80rem] w-full mx-auto px-4 md:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
          <Skeleton className="h-10 lg:h-12 w-48 lg:w-64" />
          <Skeleton className="h-32 lg:h-40 w-full rounded-lg lg:rounded-xl" />
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
        <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Suspense fallback={<div className="h-16 lg:h-20 border-b border-slate-200 bg-white" />}>
        <TopBar />
      </Suspense>
      <main className="flex-1 max-w-[80rem] w-full mx-auto px-4 md:px-6 lg:px-8 py-6 lg:py-8 pb-20 lg:pb-12">
        {children}
      </main>
      <Suspense fallback={null}>
        <BottomTabBar />
      </Suspense>
    </div>
  );
}
