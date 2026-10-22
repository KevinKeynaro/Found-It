"use client";

import { use, Suspense, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  User,
  PackageSearch,
  RotateCcw,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { MESSAGES } from "@/lib/messages";
import { getItem } from "@/lib/itemsApi";
import { formatDate, daysSince, formatDaysAgo } from "@/lib/format";
import { AppLayout } from "@/components/navigation/AppLayout";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/items/StatusBadge";
import { ClaimInfoBox } from "@/components/items/ClaimInfoBox";
import { ItemActions } from "@/components/items/ItemActions";

function ItemDetailContent({ params }) {
  const unwrappedParams = use(params);
  const itemId = unwrappedParams.id;

  const { user } = useAuth();
  const isStaff = user && user.role !== "student";

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Navigation / Back link */}
      <div className="flex items-center justify-between">
        <Link
          href="/items"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 min-h-[44px] px-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>{MESSAGES.items.backToItems}</span>
        </Link>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-6">
          <div className="aspect-[4/3] sm:aspect-[16/9] w-full bg-slate-200 rounded-lg animate-pulse" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-2/3" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Skeleton className="h-16 rounded-lg" />
              <Skeleton className="h-16 rounded-lg" />
              <Skeleton className="h-16 rounded-lg" />
            </div>
            <Skeleton className="h-28 w-full rounded-lg" />
          </div>
        </div>
      )}

      {/* Not Found View */}
      {!loading && notFound && (
        <Card className="text-center py-12 px-4 space-y-4">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-100 text-slate-500 mb-2">
            <PackageSearch className="w-7 h-7" aria-hidden="true" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            {MESSAGES.items.notFoundTitle}
          </h2>
          <p className="text-sm sm:text-base text-slate-500 max-w-md mx-auto">
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

      {/* Item Details View */}
      {!loading && item && !notFound && (
        <div className="space-y-6">
          {/* Main Item Image */}
          <div className="relative w-full aspect-[4/3] sm:aspect-[16/9] bg-slate-100 rounded-lg overflow-hidden border border-slate-200 shadow-sm flex items-center justify-center">
            {item.image_url ? (
              <Image
                src={item.image_url}
                alt={item.title}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 896px"
                className="object-contain p-2"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-400">
                <PackageSearch className="w-12 h-12 mb-2" aria-hidden="true" />
                <span className="text-sm">No photo available</span>
              </div>
            )}
          </div>

          {/* Header / Title / Status */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {isStaff && <StatusBadge item={item} />}
              {isStaff && item.is_overdue && (
                <span className="text-xs font-medium text-amber-800 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{formatDaysAgo(daysSince(item.date_found))}</span>
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 break-words">
              {item.title}
            </h1>
          </div>

          {/* Actions placeholder (Milestone 7) */}
          <ItemActions item={item} />

          {/* Returned Details Box (Staff only) */}
          {isStaff && item.status === "returned" && (
            <Card className="bg-slate-50 border-slate-300 space-y-3">
              <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
                <CheckCircle2 className="w-4 h-4 text-slate-600" aria-hidden="true" />
                <span>{MESSAGES.items.returnedDetails}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-slate-700">
                <div>
                  <span className="text-xs text-slate-500 block">
                    {MESSAGES.items.returnedAt}
                  </span>
                  <span className="font-medium">
                    {item.returned_at ? formatDate(item.returned_at) : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">
                    {MESSAGES.items.returnedBy}
                  </span>
                  <span className="font-medium">
                    {item.returned_by?.name || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">
                    {MESSAGES.items.returnedTo}
                  </span>
                  <span className="font-medium">
                    {item.returned_to || "—"}
                  </span>
                </div>
              </div>
            </Card>
          )}

          {/* Item Attributes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <Card className="flex items-center gap-3 p-4">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                <MapPin className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500">{MESSAGES.items.locationFound}</p>
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {item.location_found}
                </p>
              </div>
            </Card>

            <Card className="flex items-center gap-3 p-4">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                <Calendar className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500">{MESSAGES.items.dateFound}</p>
                <p className="text-sm font-semibold text-slate-900">
                  {formatDate(item.date_found)}
                </p>
              </div>
            </Card>

            <Card className="flex items-center gap-3 p-4">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                <User className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500">{MESSAGES.items.postedBy}</p>
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {item.posted_by?.name || "Staff"}
                </p>
              </div>
            </Card>
          </div>

          {/* Description (plain text preserving line breaks) */}
          <Card className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-900">Description</h3>
            {item.description ? (
              <p className="text-sm sm:text-base text-slate-700 whitespace-pre-wrap leading-relaxed">
                {item.description}
              </p>
            ) : (
              <p className="text-sm text-slate-400 italic">
                No description provided.
              </p>
            )}
          </Card>

          {/* Claim Info Box */}
          <ClaimInfoBox />
        </div>
      )}
    </div>
  );
}

export default function ItemDetailPage({ params }) {
  return (
    <AppLayout>
      <Suspense
        fallback={
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="aspect-[4/3] sm:aspect-[16/9] w-full bg-slate-200 rounded-lg animate-pulse" />
            <Skeleton className="h-8 w-2/3" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Skeleton className="h-16 rounded-lg" />
              <Skeleton className="h-16 rounded-lg" />
              <Skeleton className="h-16 rounded-lg" />
            </div>
          </div>
        }
      >
        <ItemDetailContent params={params} />
      </Suspense>
    </AppLayout>
  );
}
