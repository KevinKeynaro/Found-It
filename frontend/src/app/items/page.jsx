"use client";

import { PackageSearch } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { MESSAGES } from "@/lib/messages";
import { AppLayout } from "@/components/navigation/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card } from "@/components/ui/Card";

export default function ItemsPage() {
  const { user } = useAuth();

  const roleLabel = user?.role ? MESSAGES.roles[user.role] || user.role : "";

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title={MESSAGES.items.title}
          description={
            user ? `Signed in as ${user.name} (${roleLabel})` : undefined
          }
        />

        <Card className="p-0 border-0 shadow-none bg-transparent">
          <EmptyState
            icon={PackageSearch}
            title={MESSAGES.items.placeholderTitle}
            description={MESSAGES.items.placeholderDescription}
          />
        </Card>
      </div>
    </AppLayout>
  );
}
