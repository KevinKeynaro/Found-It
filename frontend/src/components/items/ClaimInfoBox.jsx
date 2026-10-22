import { Info } from "lucide-react";
import { MESSAGES } from "@/lib/messages";

export function ClaimInfoBox({ className = "" }) {
  return (
    <div
      className={`flex items-start gap-3 lg:gap-3.5 p-4 lg:p-5 rounded-lg lg:rounded-xl bg-blue-50 border border-blue-200 text-blue-900 ${className}`}
    >
      <Info className="w-5 h-5 lg:w-6 lg:h-6 text-primary shrink-0 mt-0.5" aria-hidden="true" />
      <div className="space-y-1 text-sm lg:text-base">
        <h4 className="font-semibold">{MESSAGES.items.claimInfoTitle}</h4>
        <p className="leading-relaxed text-blue-800">
          {MESSAGES.items.claimInfoDescription}
        </p>
      </div>
    </div>
  );
}
