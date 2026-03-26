"use client";

import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";

export type UploadStatusType =
  | "idle"
  | "uploading"
  | "processing"
  | "complete"
  | "failed";

interface UploadStatusProps {
  status: UploadStatusType;
  errorMessage?: string;
  benefitsCount?: number;
  onRetry?: () => void;
}

const STEPS = [
  { key: "uploading", label: "Uploading to storage" },
  { key: "processing", label: "Extracting benefits with Claude AI" },
  { key: "complete", label: "Extraction complete" },
] as const;

const ORDER: Record<string, number> = {
  uploading: 0,
  processing: 1,
  complete: 2,
};

export function UploadStatus({
  status,
  errorMessage,
  benefitsCount,
  onRetry,
}: UploadStatusProps) {
  if (status === "idle") return null;

  if (status === "failed") {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 p-4 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
        <div>
          <p className="font-medium text-red-800">Extraction Failed</p>
          {errorMessage && (
            <p className="text-sm text-red-600 mt-1">{errorMessage}</p>
          )}
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 text-sm font-medium text-red-700 underline hover:text-red-800"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    );
  }

  const currentOrder = ORDER[status] ?? 0;

  return (
    <div className="rounded-lg bg-frankly-green-light border border-frankly-green/20 p-4">
      <div className="space-y-3">
        {STEPS.map((step) => {
          const stepOrder = ORDER[step.key] ?? 0;
          if (stepOrder > currentOrder) return null;

          const isDone = stepOrder < currentOrder;
          const isCurrent = step.key === status;

          let label: string = step.label;
          if (step.key === "complete" && benefitsCount !== undefined) {
            label = `Extraction complete — ${benefitsCount} benefit${benefitsCount === 1 ? "" : "s"} found`;
          }

          return (
            <div key={step.key} className="flex items-center gap-2">
              {isDone ? (
                <CheckCircle className="h-5 w-5 text-frankly-green shrink-0" />
              ) : isCurrent && status !== "complete" ? (
                <Loader2 className="h-5 w-5 text-frankly-green animate-spin shrink-0" />
              ) : (
                <CheckCircle className="h-5 w-5 text-frankly-green shrink-0" />
              )}
              <span
                className={`text-sm ${
                  isDone
                    ? "text-frankly-green"
                    : "text-frankly-dark font-medium"
                }`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
