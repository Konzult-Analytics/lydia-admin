"use client";

import {
  FileText,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  History as HistoryIcon,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface DocumentRow {
  id: string;
  file_name: string;
  document_type: string;
  upload_status: string;
  created_at: string;
  page_count: number | null;
  document_version: string | null;
  is_current: boolean | null;
  needs_review: boolean | null;
  last_reviewed_at: string | null;
  extraction_settings: { sensitivity?: string } | null;
  insurers: { id: string; name: string; short_name: string } | null;
  products: { id: string; name: string; product_type: string } | null;
  benefit_counts: { total: number; approved: number; pending: number; rejected: number };
}

interface DocumentCardProps {
  document: DocumentRow;
  onReExtract: (doc: DocumentRow) => void;
  onMarkReviewed: (doc: DocumentRow) => void;
  onDelete: (doc: DocumentRow) => void;
  onHistory: (doc: DocumentRow) => void;
  disabled?: boolean;
}

export function DocumentCard({
  document,
  onReExtract,
  onMarkReviewed,
  onDelete,
  onHistory,
  disabled,
}: DocumentCardProps) {
  const ageDays = daysSince(document.created_at);
  const ageWarning = ageDays >= 90;
  const counts = document.benefit_counts;
  const status = document.upload_status;

  return (
    <div
      className={cn(
        "rounded-xl border bg-surface px-4 py-3 shadow-sm",
        document.needs_review
          ? "border-amber-300"
          : ageWarning
            ? "border-amber-200"
            : "border-border"
      )}
    >
      <div className="flex items-start gap-3">
        <FileText className="h-5 w-5 text-frankly-gray shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-frankly-dark truncate" title={document.file_name}>
              {document.file_name}
            </h3>
            <DocumentStatusBadge status={status} />
            {ageWarning && (
              <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                <AlertTriangle className="h-3 w-3" />
                {ageDays}d old
              </span>
            )}
            {document.needs_review && (
              <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                Needs update
              </span>
            )}
            {document.is_current === false && (
              <span className="inline-flex items-center gap-1 text-[11px] text-frankly-gray bg-frankly-gray-light border border-border px-1.5 py-0.5 rounded">
                Superseded
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs text-frankly-gray flex-wrap">
            {document.insurers?.name && <span>{document.insurers.name}</span>}
            {document.products?.name && (
              <>
                <span className="text-frankly-gray/40">·</span>
                <span>{document.products.name}</span>
              </>
            )}
            <span className="text-frankly-gray/40">·</span>
            <span className="capitalize">{document.document_type.replace(/_/g, " ")}</span>
            {document.page_count !== null && (
              <>
                <span className="text-frankly-gray/40">·</span>
                <span>{document.page_count} pages</span>
              </>
            )}
            {document.extraction_settings?.sensitivity && (
              <>
                <span className="text-frankly-gray/40">·</span>
                <span className="inline-flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-frankly-green" />
                  {document.extraction_settings.sensitivity}
                </span>
              </>
            )}
          </div>
          <div className="mt-2 flex items-center gap-3 text-xs flex-wrap">
            <span className="text-frankly-gray inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Uploaded {formatDate(document.created_at)}
            </span>
            {counts.total > 0 && (
              <span className="text-frankly-gray">
                <span className="text-frankly-dark font-medium">{counts.total}</span> benefits
                {counts.approved > 0 && (
                  <span className="ml-1.5 text-frankly-green">{counts.approved} approved</span>
                )}
                {counts.pending > 0 && (
                  <span className="ml-1.5 text-amber-600">{counts.pending} pending</span>
                )}
              </span>
            )}
            {document.last_reviewed_at && (
              <span className="inline-flex items-center gap-1 text-[11px] text-frankly-green">
                <CheckCircle2 className="h-3 w-3" />
                Reviewed {formatDate(document.last_reviewed_at)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-1.5 flex-wrap">
        <Button
          variant="ghost"
          onClick={() => onHistory(document)}
          disabled={disabled}
          className="gap-1.5 text-xs px-2.5 py-1"
        >
          <HistoryIcon className="h-3.5 w-3.5" />
          History
        </Button>
        <Button
          variant="ghost"
          onClick={() => onMarkReviewed(document)}
          disabled={disabled}
          className="gap-1.5 text-xs px-2.5 py-1"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          Mark reviewed
        </Button>
        <Button
          variant="outline"
          onClick={() => onReExtract(document)}
          disabled={disabled || status === "processing"}
          className="gap-1.5 text-xs px-2.5 py-1"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", status === "processing" && "animate-spin")} />
          Re-extract
        </Button>
        <Button
          variant="ghost"
          onClick={() => onDelete(document)}
          disabled={disabled}
          className="gap-1.5 text-xs px-2.5 py-1 text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </Button>
      </div>
    </div>
  );
}

function DocumentStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "processed":
      return <Badge variant="approved">processed</Badge>;
    case "processing":
      return <Badge variant="processing">processing</Badge>;
    case "failed":
      return <Badge variant="failed">failed</Badge>;
    case "uploaded":
      return <Badge variant="uploaded">uploaded</Badge>;
    default:
      return <Badge variant="uploaded">{status}</Badge>;
  }
}

function daysSince(iso: string): number {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, days);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
