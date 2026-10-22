import { PackageSearch } from "lucide-react";
import Link from "next/link";
import { MESSAGES } from "@/lib/messages";

export function Logo({ href = "/items", className = "" }) {
  const schoolName = process.env.NEXT_PUBLIC_SCHOOL_NAME;

  const content = (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-white shadow-sm shrink-0">
        <PackageSearch className="w-6 h-6" aria-hidden="true" />
      </div>
      <div className="flex flex-col">
        <span className="font-bold text-lg leading-tight text-slate-900 tracking-tight">
          {MESSAGES.appName}
        </span>
        {schoolName && (
          <span className="text-xs font-normal text-slate-500 leading-none">
            {schoolName}
          </span>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="inline-flex items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 min-h-[44px]"
      >
        {content}
      </Link>
    );
  }

  return content;
}
