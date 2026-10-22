"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { AppLayout } from "@/components/navigation/AppLayout";
import { NoAccess } from "@/components/NoAccess";
import { Card } from "@/components/ui/Card";
import { ItemForm } from "@/components/items/ItemForm";
import { createItem } from "@/lib/itemsApi";
import { useToast } from "@/context/ToastContext";
import { MESSAGES, getErrorMessage } from "@/lib/messages";

export default function NewItemPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [serverFieldErrors, setServerFieldErrors] = useState({});

  if (!user) {
    return null;
  }

  // Teacher and admin only; students get NoAccess
  if (user.role === "student") {
    return (
      <AppLayout>
        <NoAccess />
      </AppLayout>
    );
  }

  const handleSubmit = async (formData) => {
    if (submitting) return;
    setSubmitting(true);
    setServerError(null);
    setServerFieldErrors({});

    try {
      const data = await createItem(formData);
      showToast(MESSAGES.items.itemPostedSuccess);
      const newItemId = data?.item?.id;
      if (newItemId) {
        router.push(`/items/${newItemId}`);
      } else {
        router.push("/items");
      }
    } catch (err) {
      if (err?.code === "VALIDATION_ERROR" && err?.details) {
        setServerFieldErrors(err.details);
      } else {
        setServerError(getErrorMessage(err?.code));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-xl mx-auto space-y-5 sm:space-y-6">
        {/* Navigation / Back */}
        <div className="flex items-center justify-between">
          <Link
            href="/items"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 min-h-[40px] px-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>{MESSAGES.items.backToItems}</span>
          </Link>
        </div>

        {/* Page Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            {MESSAGES.items.newItemTitle}
          </h1>
        </div>

        {/* Form Card */}
        <Card className="p-5 sm:p-6 rounded-xl shadow-xs border-slate-200">
          <ItemForm
            mode="create"
            onSubmit={handleSubmit}
            isSubmitting={submitting}
            serverError={serverError}
            serverFieldErrors={serverFieldErrors}
          />
        </Card>
      </div>
    </AppLayout>
  );
}
