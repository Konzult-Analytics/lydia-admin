"use client";

import { useEffect, useState } from "react";
import { Loader2, History as HistoryIcon } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import type { AuditLogEntry } from "@/types/database";

interface HistoryModalProps {
  recordId: string;
  recordLabel: string;
  tableName?: string;
  onClose: () => void;
}

export function HistoryModal({
  recordId,
  recordLabel,
  tableName = "product_benefits",
  onClose,
}: HistoryModalProps) {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/audit?recordId=${recordId}&tableName=${tableName}&limit=200`
        );
        const data = await res.json();
        if (cancelled) return;
        setEntries(data.entries ?? []);
        setNote(data.note ?? null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [recordId, tableName]);

  return (
    <Modal open onClose={onClose} size="lg" className="max-w-2xl">
      <div className="space-y-3 max-h-[75vh] overflow-y-auto pr-1">
        <div className="flex items-center gap-2">
          <HistoryIcon className="h-5 w-5 text-frankly-green" />
          <div>
            <h3 className="text-lg font-bold text-frankly-dark">History</h3>
            <p className="text-xs text-frankly-gray">{recordLabel}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 text-frankly-green animate-spin" />
          </div>
        ) : note ? (
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
            {note}
          </div>
        ) : entries.length === 0 ? (
          <div className="text-sm text-frankly-gray/70 py-8 text-center">
            No history recorded yet.
          </div>
        ) : (
          <ul className="space-y-3">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="rounded-lg border border-border bg-surface px-3 py-2.5"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <ActionBadge action={entry.action} />
                  <span className="text-xs text-frankly-gray">
                    {formatDate(entry.created_at)}
                  </span>
                  <span className="text-xs text-frankly-dark">
                    {entry.user_email ?? "System"}
                  </span>
                  {entry.source_page && (
                    <span className="text-[10px] uppercase tracking-wider text-frankly-gray bg-frankly-gray-light px-1.5 py-0.5 rounded">
                      {entry.source_page}
                    </span>
                  )}
                </div>
                {entry.changed_fields && entry.changed_fields.length > 0 && (
                  <div className="mt-2 text-xs">
                    <span className="text-frankly-gray">Changed: </span>
                    {entry.changed_fields.map((f, i) => (
                      <span
                        key={f + i}
                        className="inline-block bg-frankly-gray-light px-1.5 py-0.5 rounded mr-1 mb-1 text-frankly-dark"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                )}
                {entry.reason && (
                  <p className="mt-1.5 text-xs italic text-frankly-gray">
                    &ldquo;{entry.reason}&rdquo;
                  </p>
                )}
                {(entry.old_values || entry.new_values) && (
                  <FieldDiff old={entry.old_values} next={entry.new_values} />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}

function ActionBadge({ action }: { action: string }) {
  const map: Record<string, "approved" | "rejected" | "pending" | "processing" | "uploaded"> = {
    approve: "approved",
    reject: "rejected",
    create: "uploaded",
    update: "processing",
    extract: "processing",
    reconsider: "pending",
    delete: "rejected",
    mark_reviewed: "approved",
    replace: "processing",
  };
  return <Badge variant={map[action] ?? "uploaded"}>{action}</Badge>;
}

function FieldDiff({
  old: oldVals,
  next,
}: {
  old: Record<string, unknown> | null;
  next: Record<string, unknown> | null;
}) {
  const fields = new Set([
    ...Object.keys(oldVals ?? {}),
    ...Object.keys(next ?? {}),
  ]);
  if (fields.size === 0) return null;

  return (
    <div className="mt-2 space-y-1 text-xs">
      {Array.from(fields).map((f) => {
        const before = oldVals?.[f];
        const after = next?.[f];
        if (JSON.stringify(before) === JSON.stringify(after)) return null;
        return (
          <div key={f} className="rounded bg-frankly-gray-light px-2 py-1">
            <span className="font-medium text-frankly-dark">{f}:</span>{" "}
            {before !== undefined && (
              <>
                <span className="text-red-600 line-through break-all">
                  {formatValue(before)}
                </span>{" "}
                <span className="text-frankly-gray">→</span>{" "}
              </>
            )}
            <span className="text-frankly-green break-all">{formatValue(after)}</span>
          </div>
        );
      })}
    </div>
  );
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return v.length > 80 ? v.slice(0, 77) + "..." : v;
  return JSON.stringify(v).slice(0, 80);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
