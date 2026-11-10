import React from "react";
import { Info } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

export function SimulatedEegBadge() {
  return (
    <div className="inline-flex items-center gap-1.5" title="EEG signals are simulated replay data from benchmark recordings, not real-time hardware measurements.">
      <Badge variant="warning" size="sm" dot>
        Simulated EEG Stream
      </Badge>
      <span className="text-[11px] text-[#626873] dark:text-[#B8B8BE] hidden sm:inline flex items-center gap-1">
        <Info className="w-3 h-3 text-[#D99A27]" />
        Synthetic replay
      </span>
    </div>
  );
}

