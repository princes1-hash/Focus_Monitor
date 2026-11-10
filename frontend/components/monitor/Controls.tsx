import React from "react";
import { Play, Pause, Square, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ControlsProps {
  status: "idle" | "active" | "paused" | "completed";
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  loading?: boolean;
}

export function Controls({
  status,
  onStart,
  onPause,
  onResume,
  onStop,
  loading = false,
}: ControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {status === "idle" || status === "completed" ? (
        <Button
          variant="primary"
          size="md"
          icon={<Play className="w-4 h-4 fill-current" />}
          onClick={onStart}
          loading={loading}
        >
          Start Monitoring
        </Button>
      ) : (
        <>
          {status === "active" ? (
            <Button
              variant="secondary"
              size="md"
              icon={<Pause className="w-4 h-4" />}
              onClick={onPause}
              loading={loading}
            >
              Pause Session
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="md"
              icon={<Play className="w-4 h-4 fill-current text-[#239B68]" />}
              onClick={onResume}
              loading={loading}
            >
              Resume Session
            </Button>
          )}

          <Button
            variant="danger"
            size="md"
            icon={<Square className="w-4 h-4 fill-current" />}
            onClick={onStop}
            loading={loading}
          >
            Stop Session
          </Button>
        </>
      )}
    </div>
  );
}

