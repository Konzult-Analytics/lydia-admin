"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2,
  RefreshCw,
  Activity as ActivityIcon,
  User as UserIcon,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { AuditLogEntry } from "@/types/database";

const ACTION_OPTIONS = [
  { value: "create", label: "Created" },
  { value: "update", label: "Updated" },
  { value: "approve", label: "Approved" },
  { value: "reject", label: "Rejected" },
  { value: "reconsider", label: "Reconsidered" },
  { value: "extract", label: "Extracted" },
  { value: "delete", label: "Deleted" },
  { value: "mark_reviewed", label: "Marked reviewed" },
];

const SOURCE_OPTIONS = [
  { value: "upload", label: "Upload" },
  { value: "review", label: "Review" },
  { value: "database", label: "Database" },
  { value: "documents", label: "Documents" },
  { value: "train", label: "Train" },
  { value: "system", label: "System" },
];

const TABLE_OPTIONS = [
  { value: "product_benefits", label: "Benefits" },
  { value: "source_documents", label: "Documents" },
  { value: "benefit_attributes", label: "Attributes" },
  { value: "domain_rules", label: "Domain rules" },
  { value: "approved_outputs", label: "Approved outputs" },
];

export default function ActivityPage() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState<string | null>(null);

  const [actionFilter, setActionFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [tableFilter, setTableFilter] = useState("");
  const [userEmailFilter, setUserEmailFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (actionFilter) params.set("action", actionFilter);
      if (sourceFilter) params.set("sourcePage", sourceFilter);
      if (tableFilter) params.set("tableName", tableFilter);
      params.set("limit", "300");
      const res = await fetch(`/api/audit?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setEntries(data.entries ?? []);
      setNote(data.note ?? null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load activity");
    } finally {
      setLoading(false);
    }
  }, [actionFilter, sourceFilter, tableFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredEntries = useMemo(() => {
    if (!userEmailFilter.trim()) return entries;
    const q = userEmailFilter.toLowerCase().trim();
    return entries.filter((e) => (e.user_email ?? "").toLowerCase().includes(q));
  }, [entries, userEmailFilter]);

  const grouped = useMemo(() => groupByDay(filteredEntries), [filteredEntries]);
  const userOptions = useMemo(() => {
    const seen = new Set<string>();
    const items: { value: string; label: string }[] = [];
    for (const e of entries) {
      if (!e.user_email) continue;
      if (seen.has(e.user_email)) continue;
      seen.add(e.user_email);
      items.push({ value: e.user_email, label: e.user_email });
    }
    return items;
  }, [entries]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-frankly-dark">Activity</h1>
          <p className="mt-1 text-sm text-frankly-gray">
            Every change made across the platform — who, what, and when.
          </p>
        </div>
        <Button variant="ghost" onClick={load} disabled={loading} className="gap-1.5">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Card padding="sm">
        <div className="flex gap-2 flex-wrap">
          <Select
            value={actionFilter}
            onChange={setActionFilter}
            options={ACTION_OPTIONS}
            placeholder="All actions"
            className="w-44"
          />
          <Select
            value={sourceFilter}
            onChange={setSourceFilter}
            options={SOURCE_OPTIONS}
            placeholder="All sources"
            className="w-44"
          />
          <Select
            value={tableFilter}
            onChange={setTableFilter}
            options={TABLE_OPTIONS}
            placeholder="All entities"
            className="w-44"
          />
          <Select
            value={userEmailFilter}
            onChange={setUserEmailFilter}
            options={userOptions}
            placeholder="All users"
            className="w-56"
          />
        </div>
      </Card>

      {note && (
        <Card padding="sm" className="bg-amber-50 border-amber-200 dark:bg-amber-900/20">
          <p className="text-sm text-amber-800 dark:text-amber-300">{note}</p>
        </Card>
      )}

      {loading && entries.length === 0 ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 text-frankly-green animate-spin" />
        </div>
      ) : filteredEntries.length === 0 ? (
        <Card padding="lg">
          <div className="flex flex-col items-center text-center">
            <ActivityIcon className="h-10 w-10 text-border" />
            <h3 className="mt-4 text-lg font-semibold text-frankly-dark">No activity</h3>
            <p className="mt-2 text-sm text-frankly-gray">
              No events match your filters yet.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-5">
          {grouped.map(([day, items]) => (
            <div key={day}>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-3.5 w-3.5 text-frankly-gray" />
                <h2 className="text-xs font-semibold text-frankly-gray uppercase tracking-wider">
                  {day}
                </h2>
              </div>
              <div className="space-y-1.5">
                {items.map((entry) => (
                  <ActivityRow key={entry.id} entry={entry} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ActivityRow({ entry }: { entry: AuditLogEntry }) {
  const time = new Date(entry.created_at).toLocaleTimeString("en-ZA", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2.5">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-mono text-frankly-gray w-12 shrink-0">{time}</span>
        <ActionBadge action={entry.action} />
        <span className="text-sm text-frankly-dark inline-flex items-center gap-1.5">
          <UserIcon className="h-3.5 w-3.5 text-frankly-gray" />
          {entry.user_email ?? "System"}
        </span>
        <span className="text-xs text-frankly-gray">on</span>
        <span className="text-xs text-frankly-dark font-medium">
          {entityLabel(entry.table_name)}
        </span>
        {entry.source_page && (
          <span className="text-[10px] uppercase tracking-wider text-frankly-gray bg-frankly-gray-light px-1.5 py-0.5 rounded">
            {entry.source_page}
          </span>
        )}
        {entry.changed_fields && entry.changed_fields.length > 0 && (
          <span className="text-xs text-frankly-gray">
            ({entry.changed_fields.length} field
            {entry.changed_fields.length === 1 ? "" : "s"})
          </span>
        )}
      </div>
      {entry.reason && (
        <p className="mt-1.5 text-xs italic text-frankly-gray ml-14">
          &ldquo;{entry.reason}&rdquo;
        </p>
      )}
    </div>
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
  };
  return <Badge variant={map[action] ?? "uploaded"}>{action}</Badge>;
}

function entityLabel(tableName: string): string {
  switch (tableName) {
    case "product_benefits":
      return "benefit";
    case "source_documents":
      return "document";
    case "benefit_attributes":
      return "attribute";
    case "domain_rules":
      return "rule";
    case "approved_outputs":
      return "output";
    case "corrections":
      return "correction";
    default:
      return tableName;
  }
}

function groupByDay(entries: AuditLogEntry[]): [string, AuditLogEntry[]][] {
  const groups = new Map<string, AuditLogEntry[]>();
  const todayKey = dayKey(new Date());
  const yesterdayKey = dayKey(new Date(Date.now() - 86400000));

  for (const entry of entries) {
    const key = dayKey(new Date(entry.created_at));
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(entry);
  }

  return Array.from(groups.entries()).map(([key, items]) => {
    let label = key;
    if (key === todayKey) label = "Today";
    else if (key === yesterdayKey) label = "Yesterday";
    else
      label = new Date(key).toLocaleDateString("en-ZA", {
        weekday: "long",
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    return [label, items];
  });
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
