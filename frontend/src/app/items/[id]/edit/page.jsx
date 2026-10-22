"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, PackageSearch, RotateCcw, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { AppLayout } from "@/components/navigation/AppLayout";
import { NoAccess } from "@/components/NoAccess";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Skeleton } from "@/components/ui/Skeleton";
import { ItemForm } from "@/components/items/ItemForm";
import { getItem, updateItem } from "@/lib/itemsApi";
import { useToast } from "@/context/ToastContext";
import { MESSAGES, getErrorMessage } from "@/lib/messages";

function EditItemContent({ params }) {
  const unwrappedParams = use(params);
  const itemId = unwrappedParams.id;

  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [serverFieldErrors, setServerFieldErrors] = useState({});

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    async function load() {
      try {
        const data = await getItem(itemId, { signal: controller.signal });
        if (!ignore) {
          setItem(data.item);
          setError(null);
          setNotFound(false);
        }
      } catch (err) {
        if (!ignore) {
          if (err.name === "AbortError" || err.code === 20) {
            return;
          }
          if (err.status === 404 || err.code === "ITEM_NOT_FOUND") {
            setNotFound(true);
          } else {
            setError(err.message || MESSAGES.DEFAULT);
          }
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [itemId, retryKey]);

  if (!user) {
    return null;
  }

  // Students cannot access edit page
  if (user.role === "student") {
    return <NoAccess />;
  }

  const handleSubmit = async (formData) => {
    if (submitting) return;
    setSubmitting(true);
    setServerError(null);
    setServerFieldErrors({});

    try {
      await updateItem(itemId, formData);
      showToast(MESSAGES.items.itemUpdatedSuccess);
      router.push(`/items/${itemId}`);
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
    <div className="max-w-xl mx-auto space-y-5 sm:space-y-6">
      {/* Navigation / Back */}
      <div className="flex items-center justify-between">
        <Link
          href={`/items/${itemId}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 min-h-[40px] px-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>{MESSAGES.items.backToItems}</span>
        </Link>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <Card className="p-5 sm:p-6 space-y-5 rounded-xl border-slate-200">
          <Skeleton className="h-7 w-40" />
          <div className="space-y-3.5">
            <Skeleton className="aspect-[4/3] w-full max-w-sm rounded-xl" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        </Card>
      )}

      {/* Not Found View */}
      {!loading && notFound && (
        <Card className="text-center py-10 px-4 space-y-3.5 max-w-xl mx-auto">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 text-slate-500 mb-1">
            <PackageSearch className="w-6 h-6" aria-hidden="true" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">
            {MESSAGES.items.notFoundTitle}
          </h2>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            {MESSAGES.items.notFoundDescription}
          </p>
          <div className="pt-2">
            <Link href="/items">
              <Button variant="primary">
                {MESSAGES.items.backToItems}
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* Error View */}
      {!loading && error && !notFound && (
        <Alert variant="error" className="flex items-center justify-between">
          <span>{error}</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setLoading(true);
              setRetryKey((k) => k + 1);
            }}
            className="gap-1.5 ml-4 bg-white text-danger border-red-200 hover:bg-red-50"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{MESSAGES.items.retry}</span>
          </Button>
        </Alert>
      )}

      {/* Returned item hint view */}
      {!loading && item && !notFound && item.status === "returned" && (
        <Card className="p-5 sm:p-6 space-y-3.5 text-center rounded-xl border-slate-200">
          <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
            <AlertCircle className="w-5 h-5" aria-hidden="true" />
          </div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            {MESSAGES.items.editItemTitle}
          </h2>
          <p className="text-sm text-slate-600 max-w-sm mx-auto">
            {MESSAGES.items.reopenToEditHint}
          </p>
          <div className="pt-2">
            <Link href={`/items/${itemId}`}>
              <Button variant="secondary" className="gap-2">
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                <span>View item details</span>
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* No edit permission view */}
      {!loading && item && !notFound && item.status !== "returned" && !item.permissions?.can_edit && (
        <NoAccess />
      )}

      {/* Editable Form View */}
      {!loading && item && !notFound && item.status !== "returned" && item.permissions?.can_edit && (
        <>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              {MESSAGES.items.editItemTitle}
            </h1>
          </div>

          <Card className="p-5 sm:p-6 rounded-xl shadow-xs border-slate-200">
            <ItemForm
              mode="edit"
              initialValues={{
                title: item.title,
                description: item.description,
                location_found: item.location_found,
                date_found: item.date_found,
                image_url: item.image_url,
              }}
              onSubmit={handleSubmit}
              isSubmitting={submitting}
              serverError={serverError}
              serverFieldErrors={serverFieldErrors}
            />
          </Card>
        </>
      )}
    </div>
  );
}

export default function EditItemPage({ params }) {
  return (
    <AppLayout>
      <EditItemContent params={params} />
    </AppLayout>
  );
}
