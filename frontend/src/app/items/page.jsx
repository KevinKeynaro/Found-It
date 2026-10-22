"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, RotateCcw, PackageSearch } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { MESSAGES } from "@/lib/messages";
import { listItems } from "@/lib/itemsApi";
import { parseListParams, buildListUrl } from "@/lib/listParams";
import { AppLayout } from "@/components/navigation/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tabs } from "@/components/ui/Tabs";
import { Pagination } from "@/components/ui/Pagination";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchBar } from "@/components/items/SearchBar";
import { ItemCard } from "@/components/items/ItemCard";
import { ItemCardSkeleton } from "@/components/items/ItemCardSkeleton";
import { ItemGrid } from "@/components/items/ItemGrid";

const TABS = [
  { id: "active", label: MESSAGES.items.tabs.active },
  { id: "overdue", label: MESSAGES.items.tabs.overdue },
  { id: "archive", label: MESSAGES.items.tabs.archive },
];

function ItemsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  const isStaff = user && user.role !== "student";
  const { q, view, page } = parseListParams(searchParams, user?.role);

  // Clean URL if a student manually enters ?view=overdue or ?view=archive
  useEffect(() => {
    if (user && user.role === "student") {
      const rawView = searchParams.get("view");
      if (rawView && rawView !== "active") {
        router.replace(buildListUrl({ q, view: "active", page }));
      }
    }
  }, [user, searchParams, q, page, router]);

  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, total_pages: 1 });
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryKey, setRetryKey] = useState(0);

  // Sync loading state during render when URL params change (prevents stuck dimmed states on redundant clicks)
  const [prevParams, setPrevParams] = useState({ q, view, page });
  if (
    prevParams.q !== q ||
    prevParams.view !== view ||
    prevParams.page !== page
  ) {
    setPrevParams({ q, view, page });
    setLoading(true);
  }

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    async function load() {
      try {
        const data = await listItems(
          { q, view, page, limit: 12 },
          { signal: controller.signal }
        );
        if (!ignore) {
          setItems(data.items || []);
          setPagination(data.pagination || { page: 1, limit: 12, total: 0, total_pages: 1 });
          setError(null);
        }
      } catch (err) {
        if (!ignore) {
          if (err.name === "AbortError" || err.code === 20) {
            return;
          }
          setError(err.message || MESSAGES.DEFAULT);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
          setInitialLoading(false);
        }
      }
    }

    load();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [q, view, page, retryKey]);

  const handleSearchChange = (newQ) => {
    const trimmed = (newQ || "").trim().slice(0, 100);
    if (trimmed === q) return;
    const url = buildListUrl({ q: trimmed, view, page: 1 });
    router.replace(url);
  };

  const handleTabChange = (newTab) => {
    if (newTab === view && !q) return;
    const url = buildListUrl({ q: "", view: newTab, page: 1 });
    router.push(url);
  };

  const handlePageChange = (newPage) => {
    if (newPage === page) return;
    const url = buildListUrl({ q, view, page: newPage });
    router.push(url);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        title={MESSAGES.items.title}
        description="Browse and search items reported found on campus."
      />

      {/* Controls: Search and Role-Based Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-6">
        <div className="w-full sm:max-w-md lg:max-w-xl xl:max-w-2xl 2xl:max-w-3xl">
          <SearchBar
            value={q}
            onChange={handleSearchChange}
            placeholder={MESSAGES.items.searchPlaceholder}
          />
        </div>

        {isStaff && (
          <div className="shrink-0">
            <Tabs
              tabs={TABS}
              activeTab={view}
              onChange={handleTabChange}
              ariaLabel="Item status views"
            />
          </div>
        )}
      </div>

      {/* Error state */}
      {error && !loading && (
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

      {/* Initial Loading Skeleton */}
      {initialLoading && (
        <ItemGrid>
          {Array.from({ length: 12 }).map((_, i) => (
            <ItemCardSkeleton key={i} />
          ))}
        </ItemGrid>
      )}

      {/* Empty State */}
      {!initialLoading && !error && items.length === 0 && (
        <div className="pt-6">
          {q ? (
            <EmptyState
              icon={Search}
              title={MESSAGES.items.emptySearchTitle}
              description={MESSAGES.items.emptySearchDescription(q)}
            />
          ) : (
            <EmptyState
              icon={PackageSearch}
              title={MESSAGES.items.emptyListTitle}
              description={
                isStaff
                  ? MESSAGES.items.emptyListDescriptionStaff
                  : MESSAGES.items.emptyListDescriptionStudent
              }
            />
          )}
        </div>
      )}

      {/* Items Grid & Pagination */}
      {!initialLoading && items.length > 0 && (
        <div className="space-y-6">
          <div
            className={
              loading
                ? "opacity-50 transition-opacity duration-200 pointer-events-none"
                : "transition-opacity duration-200"
            }
          >
            <ItemGrid>
              {items.map((item) => (
                <ItemCard key={item.id} item={item} showStatus={isStaff} />
              ))}
            </ItemGrid>
          </div>

          {pagination.total_pages > 1 && (
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.total_pages}
              onPageChange={handlePageChange}
              disabled={loading}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default function ItemsPage() {
  return (
    <AppLayout>
      <Suspense
        fallback={
          <div className="space-y-6">
            <div className="h-10 w-48 bg-slate-200 rounded animate-pulse" />
            <ItemGrid>
              {Array.from({ length: 12 }).map((_, i) => (
                <ItemCardSkeleton key={i} />
              ))}
            </ItemGrid>
          </div>
        }
      >
        <ItemsContent />
      </Suspense>
    </AppLayout>
  );
}
