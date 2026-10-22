import Link from "next/link";
import Image from "next/image";
import { MapPin, Calendar, PackageSearch } from "lucide-react";
import { formatDate } from "@/lib/format";
import { StatusBadge } from "./StatusBadge";

export function ItemCard({ item, showStatus = false }) {
  if (!item) return null;

  return (
    <Link
      href={`/items/${item.id}`}
      className="group flex flex-col bg-white rounded-lg sm:rounded-xl border border-slate-200 shadow-xs overflow-hidden transition-all hover:shadow-sm hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      {/* 4:3 Aspect Ratio Image Container */}
      <div className="relative aspect-[4/3] w-full bg-slate-100 overflow-hidden">
        {item.thumbnail_url ? (
          <Image
            src={item.thumbnail_url}
            alt={item.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-200 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
            <PackageSearch className="w-7 h-7 mb-1" aria-hidden="true" />
            <span className="text-xs">No image</span>
          </div>
        )}

        {showStatus && (
          <div className="absolute top-2 right-2">
            <StatusBadge item={item} />
          </div>
        )}
      </div>

      {/* Item Information */}
      <div className="flex-1 p-3 sm:p-3.5 flex flex-col justify-between gap-2">
        <h3
          title={item.title}
          className="font-semibold text-xs sm:text-sm text-slate-900 line-clamp-2 group-hover:text-primary transition-colors leading-snug"
        >
          {item.title}
        </h3>

        <div className="space-y-1 text-xs text-slate-500 pt-1.5 border-t border-slate-100">
          <div className="flex items-center gap-1.5 truncate">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" aria-hidden="true" />
            <span className="truncate">{item.location_found}</span>
          </div>

          <div className="flex items-center gap-1.5 truncate">
            <Calendar className="w-3.5 h-3.5 shrink-0 text-slate-400" aria-hidden="true" />
            <span>{formatDate(item.date_found)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
