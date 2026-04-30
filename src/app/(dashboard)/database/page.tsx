"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2,
  RefreshCw,
  Search,
  Download,
  Layers,
  Grid3x3,
  RotateCcw,
  Pencil,
  History as HistoryIcon,
  Undo2,
  Check,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { StatsCards, type DatabaseStats } from "@/components/database/stats-cards";
import { ExplorerTree } from "@/components/database/explorer-tree";
import { ComparisonGrid } from "@/components/database/comparison-grid";
import { BenefitEditModal } from "@/components/database/benefit-edit-modal";
import { HistoryModal } from "@/components/database/history-modal";
import { DetailPanel } from "@/components/review/detail-panel";
import { RejectModal } from "@/components/review/reject-modal";
import type { BenefitWithDetails } from "@/components/review/benefit-card";
import type { Insurer, BenefitType, ReviewStatus } from "@/types/database";
import { cn } from "@/lib/utils";

type ViewMode = "tree" | "grid";
type StatusFilter = ReviewStatus | "all";

export default function DatabasePage() {
  const supabase = createClient();
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [benefits, setBenefits] = useState<BenefitWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>("tree");

  const [insurers, setInsurers] = useState<Insurer[]>([]);
  const [benefitTypes, setBenefitTypes] = useState<BenefitType[]>([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [insurerFilter, setInsurerFilter] = useState("");
  const [benefitTypeFilter, setBenefitTypeFilter] = useState("");

  const [selected, setSelected] = useState<BenefitWithDetails | null>(null);
  const [editTarget, setEditTarget] = useState<BenefitWithDetails | null>(null);
  const [historyTarget, setHistoryTarget] = useState<BenefitWithDetails | null>(null);
  const [rejectTarget, setRejectTarget] = useState<BenefitWithDetails | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("insurers")
      .select("id, name, short_name")
      .order("name")
      .then(({ data }) => setInsurers(data ?? []));
    supabase
      .from("benefit_types")
      .select("id, name, category_id")
      .order("name")
      .then(({ data }) => setBenefitTypes(data ?? []));
  }, [supabase]);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch("/api/database/stats");
      const data = await res.json();
      if (data.stats) setStats(data.stats);
    } catch {
      /* noop */
    }
  }, []);

  const loadBenefits = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (insurerFilter) params.set("insurerId", insurerFilter);
      if (benefitTypeFilter) params.set("benefitTypeId", benefitTypeFilter);
      if (search.trim()) params.set("q", search.trim());
      const res = await fetch(`/api/database/benefits?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setBenefits(data.benefits ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load benefits");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, insurerFilter, benefitTypeFilter, search]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    const t = setTimeout(loadBenefits, 200);
    return () => clearTimeout(t);
  }, [loadBenefits]);

  function refresh() {
    loadStats();
    loadBenefits();
  }

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setInsurerFilter("");
    setBenefitTypeFilter("");
  }

  async function handleApprove(id: string, fromDetail = true) {
    setActionLoading(id);
    try {
      const res = await fetch("/api/review", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ benefitId: id, action: "approve", sourcePage: "database" }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed");
      }
      toast.success("Approved");
      refresh();
      if (fromDetail) setSelected(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReconsider(b: BenefitWithDetails) {
    setActionLoading(b.id);
    try {
      const res = await fetch("/api/review", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          benefitId: b.id,
          action: "reconsider",
          sourcePage: "database",
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed");
      }
      toast.success("Moved back to pending");
      refresh();
      setSelected(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRejectConfirm(reason: string) {
    if (!rejectTarget) return;
    const id = rejectTarget.id;
    setRejectTarget(null);
    setActionLoading(id);
    try {
      const res = await fetch("/api/review", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          benefitId: id,
          action: "reject",
          rejectReason: reason || undefined,
          sourcePage: "database",
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed");
      }
      toast.success("Rejected");
      refresh();
      setSelected(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDetailEdit(
    id: string,
    edits: {
      benefit_name: string;
      description: string;
      key_features: string[];
      exclusions: string[];
      reviewer_notes: string;
      attributes: { id?: string; attribute_name: string; attribute_value: string; attribute_unit: string | null }[];
      deletedAttributeIds: string[];
    }
  ) {
    setActionLoading(id);
    try {
      const res = await fetch("/api/review", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          benefitId: id,
          action: "edit",
          edits,
          sourcePage: "database",
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed");
      }
      toast.success("Saved");
      refresh();
      setSelected(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setActionLoading(null);
    }
  }

  function openDetailFor(b: BenefitWithDetails) {
    setSelected(b);
  }

  function exportCsv() {
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (insurerFilter) params.set("insurerId", insurerFilter);
    window.open(`/api/database/export?${params}`, "_blank");
  }

  const visibleBenefits = useMemo(() => benefits, [benefits]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-frankly-dark">Database Explorer</h1>
          <p className="mt-1 text-sm text-frankly-gray">
            Browse, search, and edit the full benefit knowledge base.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" onClick={refresh} disabled={loading} className="gap-1.5">
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="outline" onClick={exportCsv} className="gap-1.5">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {stats && <StatsCards stats={stats} />}

      <Card padding="sm" className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-frankly-gray" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search benefits by name or description..."
              className="w-full rounded-lg border border-border bg-surface pl-9 pr-3 py-2 text-sm focus:border-frankly-green focus:outline-none focus:ring-1 focus:ring-frankly-green"
            />
          </div>
          <Select
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as StatusFilter)}
            options={[
              { value: "all", label: "All statuses" },
              { value: "approved", label: "Approved" },
              { value: "pending", label: "Pending" },
              { value: "rejected", label: "Rejected" },
            ]}
            className="w-44"
          />
          <Select
            value={insurerFilter}
            onChange={setInsurerFilter}
            options={insurers.map((i) => ({ value: i.id, label: i.name }))}
            placeholder="All insurers"
            className="w-48"
          />
          <Select
            value={benefitTypeFilter}
            onChange={setBenefitTypeFilter}
            options={benefitTypes.map((t) => ({ value: t.id, label: t.name }))}
            placeholder="All types"
            className="w-56"
          />
          {(search || statusFilter !== "all" || insurerFilter || benefitTypeFilter) && (
            <Button variant="ghost" onClick={clearFilters} className="gap-1.5 text-xs">
              <RotateCcw className="h-3.5 w-3.5" />
              Clear
            </Button>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            <ViewTab active={view === "tree"} onClick={() => setView("tree")} icon={<Layers className="h-3.5 w-3.5" />}>
              Tree
            </ViewTab>
            <ViewTab active={view === "grid"} onClick={() => setView("grid")} icon={<Grid3x3 className="h-3.5 w-3.5" />}>
              Comparison
            </ViewTab>
          </div>
          <div className="text-xs text-frankly-gray">
            {visibleBenefits.length} benefit{visibleBenefits.length === 1 ? "" : "s"}
          </div>
        </div>
      </Card>

      {loading && benefits.length === 0 ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 text-frankly-green animate-spin" />
        </div>
      ) : view === "tree" ? (
        <ExplorerTree benefits={visibleBenefits} onSelect={openDetailFor} />
      ) : (
        <ComparisonGrid benefits={visibleBenefits} onSelect={openDetailFor} />
      )}

      {selected && (
        <DetailPanel
          benefit={selected}
          onClose={() => setSelected(null)}
          onApprove={(id) => handleApprove(id)}
          onReject={() => setRejectTarget(selected)}
          onSaveEdit={handleDetailEdit}
          disabled={actionLoading === selected.id}
        />
      )}

      {selected && selected.status !== "pending" && (
        <NonPendingActionsBar
          benefit={selected}
          onEdit={() => setEditTarget(selected)}
          onHistory={() => setHistoryTarget(selected)}
          onApprove={() => handleApprove(selected.id)}
          onReject={() => setRejectTarget(selected)}
          onReconsider={() => handleReconsider(selected)}
          disabled={actionLoading === selected.id}
        />
      )}

      {editTarget && (
        <BenefitEditModal
          benefit={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => {
            setEditTarget(null);
            refresh();
          }}
        />
      )}

      {historyTarget && (
        <HistoryModal
          recordId={historyTarget.id}
          recordLabel={historyTarget.benefit_name}
          onClose={() => setHistoryTarget(null)}
        />
      )}

      {rejectTarget && (
        <RejectModal
          benefitName={rejectTarget.benefit_name}
          onConfirm={handleRejectConfirm}
          onCancel={() => setRejectTarget(null)}
        />
      )}
    </div>
  );
}

function ViewTab({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-frankly-green bg-frankly-green-light text-frankly-green"
          : "border-border bg-surface text-frankly-gray hover:text-frankly-dark"
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function NonPendingActionsBar({
  benefit,
  onEdit,
  onHistory,
  onApprove,
  onReject,
  onReconsider,
  disabled,
}: {
  benefit: BenefitWithDetails;
  onEdit: () => void;
  onHistory: () => void;
  onApprove: () => void;
  onReject: () => void;
  onReconsider: () => void;
  disabled?: boolean;
}) {
  // The DetailPanel already shows pending action footer. For approved/rejected
  // we show a floating action bar attached to the slide-over.
  return (
    <div className="fixed bottom-6 right-6 z-[60] flex items-center gap-2 rounded-xl border border-border bg-surface-elevated px-3 py-2 shadow-2xl">
      <Badge variant={benefit.status}>{benefit.status}</Badge>
      <Button variant="outline" onClick={onEdit} disabled={disabled} className="gap-1.5 text-xs px-3 py-1.5">
        <Pencil className="h-3.5 w-3.5" />
        Edit
      </Button>
      <Button variant="ghost" onClick={onHistory} disabled={disabled} className="gap-1.5 text-xs px-3 py-1.5">
        <HistoryIcon className="h-3.5 w-3.5" />
        History
      </Button>
      {benefit.status === "rejected" ? (
        <Button onClick={onReconsider} disabled={disabled} className="gap-1.5 text-xs px-3 py-1.5">
          <Undo2 className="h-3.5 w-3.5" />
          Reconsider
        </Button>
      ) : (
        <Button
          variant="ghost"
          onClick={onReject}
          disabled={disabled}
          className="gap-1.5 text-xs px-3 py-1.5 text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <XCircle className="h-3.5 w-3.5" />
          Reject
        </Button>
      )}
      {benefit.status === "rejected" && (
        <Button onClick={onApprove} disabled={disabled} className="gap-1.5 text-xs px-3 py-1.5">
          <Check className="h-3.5 w-3.5" />
          Approve
        </Button>
      )}
    </div>
  );
}
