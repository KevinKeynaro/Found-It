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
      className="group flex flex-col bg-white rounded-lg lg:rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      {/* 4:3 Aspect Ratio Image Container */}
      <div className="relative aspect-[4/3] w-full bg-slate-100 overflow-hidden">
        {item.thumbnail_url ? (
          <Image
            src={item.thumbnail_url}
            alt={item.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1536px) 33vw, 25vw"
            className="object-cover transition-transform duration-200 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
            <PackageSearch className="w-8 h-8 lg:w-10 lg:h-10 mb-1" aria-hidden="true" />
            <span className="text-xs lg:text-sm">No image</span>
          </div>
        )}

        {showStatus && (
          <div className="absolute top-2 right-2 lg:top-3 lg:right-3">
            <StatusBadge item={item} />
          </div>
        )}
      </div>

      {/* Item Information */}
      <div className="flex-1 p-3 sm:p-4 lg:p-5 flex flex-col justify-between gap-2.5 lg:gap-3">
        <h3
          title={item.title}
          className="font-semibold text-sm sm:text-base lg:text-xl text-slate-900 line-clamp-2 group-hover:text-primary transition-colors leading-snug"
        >
          {item.title}
        </h3>

        <div className="space-y-1.5 lg:space-y-2 text-xs lg:text-base text-slate-500 pt-1.5 lg:pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5 lg:gap-2 truncate">
            <MapPin className="w-3.5 h-3.5 lg:w-4.5 lg:h-4.5 shrink-0 text-slate-400" aria-hidden="true" />
            <span className="truncate">{item.location_found}</span>
          </div>

          <div className="flex items-center gap-1.5 lg:gap-2 truncate">
            <Calendar className="w-3.5 h-3.5 lg:w-4.5 lg:h-4.5 shrink-0 text-slate-400" aria-hidden="true" />
            <span>{formatDate(item.date_found)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
