import { ShieldAlert, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { MESSAGES } from "@/lib/messages";
import { Button } from "@/components/ui/Button";

export function NoAccess({
  title = MESSAGES.noAccess.title,
  description = MESSAGES.noAccess.description,
  backHref = "/items",
  backLabel = MESSAGES.noAccess.backToItems,
}) {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-full bg-red-100 text-danger flex items-center justify-center mb-4">
        <ShieldAlert className="w-8 h-8" aria-hidden="true" />
      </div>
      <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">{title}</h2>
      <p className="text-sm sm:text-base text-slate-600 max-w-md mb-6">{description}</p>
      <Link href={backHref}>
        <Button variant="secondary" className="gap-2">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>{backLabel}</span>
        </Button>
      </Link>
    </div>
  );
}
