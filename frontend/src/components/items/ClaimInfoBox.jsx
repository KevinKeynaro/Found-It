import { Info } from "lucide-react";
import { MESSAGES } from "@/lib/messages";

export function ClaimInfoBox({ className = "" }) {
  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 ${className}`}
    >
      <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
      <div className="space-y-1 text-sm">
        <h4 className="font-semibold">{MESSAGES.items.claimInfoTitle}</h4>
        <p className="leading-relaxed text-blue-800">
          {MESSAGES.items.claimInfoDescription}
        </p>
      </div>
    </div>
  );
}
