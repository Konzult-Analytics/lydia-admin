"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  ClipboardCheck,
  Loader2,
  RefreshCw,
  CheckCheck,
  Clock,
  CheckCircle,
  XCircle,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import {
  BenefitCard,
  type BenefitWithDetails,
} from "@/components/review/benefit-card";
import { DetailPanel } from "@/components/review/detail-panel";
import { RejectModal } from "@/components/review/reject-modal";
import type { ReviewStatus, Insurer, BenefitType } from "@/types/database";

type FilterStatus = ReviewStatus | "all";

const STATUS_TABS: { value: FilterStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];

interface Stats {
  totalPending: number;
  approvedToday: number;
  rejectedToday: number;
}

export default function ReviewPage() {
  const supabase = createClient();

  const [benefits, setBenefits] = useState<BenefitWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("pending");
  const [insurerFilter, setInsurerFilter] = useState("");
  const [benefitTypeFilter, setBenefitTypeFilter] = useState("");
  const [insurers, setInsurers] = useState<Insurer[]>([]);
  const [benefitTypes, setBenefitTypes] = useState<BenefitType[]>([]);
  const [stats, setStats] = useState<Stats>({ totalPending: 0, approvedToday: 0, rejectedToday: 0 });
  const [selectedBenefit, setSelectedBenefit] = useState<BenefitWithDetails | null>(null);
  const [rejectTarget, setRejectTarget] = useState<BenefitWithDetails | null>(null);

  // Fetch filter dropdowns
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

  // Fetch benefits
  const fetchBenefits = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      // Always fetch all for stats, filter client-side
      params.set("status", "all");
      if (insurerFilter) params.set("insurerId", insurerFilter);

      const res = await fetch(`/api/review?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setBenefits(data.benefits ?? []);
      if (data.stats) setStats(data.stats);
    } catch {
      toast.error("Failed to load benefits");
    } finally {
      setLoading(false);
    }
  }, [insurerFilter]);

  useEffect(() => {
    fetchBenefits();
  }, [fetchBenefits]);

  // Filter benefits client-side
  const visibleBenefits = useMemo(() => {
    let filtered = benefits;
    if (statusFilter !== "all") {
      filtered = filtered.filter((b) => b.status === statusFilter);
    }
    if (benefitTypeFilter) {
      filtered = filtered.filter((b) => b.benefit_types?.id === benefitTypeFilter);
    }
    return filtered;
  }, [benefits, statusFilter, benefitTypeFilter]);

  const pendingCount = benefits.filter((b) => b.status === "pending").length;

  // Actions
  async function handleApprove(id: string) {
    setActionLoading(id);
    try {
      const res = await fetch("/api/review", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ benefitId: id, action: "approve" }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      setBenefits((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status: "approved" as const } : b))
      );
      setStats((s) => ({ ...s, totalPending: s.totalPending - 1, approvedToday: s.approvedToday + 1 }));
      if (selectedBenefit?.id === id) setSelectedBenefit(null);
      toast.success("Benefit approved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve");
    } finally {
      setActionLoading(null);
    }
  }

  function handleRejectClick(id: string) {
    const benefit = benefits.find((b) => b.id === id);
    if (benefit) setRejectTarget(benefit);
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
        body: JSON.stringify({ benefitId: id, action: "reject", rejectReason: reason || undefined }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      setBenefits((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status: "rejected" as const } : b))
      );
      setStats((s) => ({ ...s, totalPending: s.totalPending - 1, rejectedToday: s.rejectedToday + 1 }));
      if (selectedBenefit?.id === id) setSelectedBenefit(null);
      toast.success("Benefit rejected");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reject");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSaveEdit(
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
        body: JSON.stringify({ benefitId: id, action: "edit", edits }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      // Refresh to get correct attribute IDs back from server
      await fetchBenefits();
      setSelectedBenefit(null);
      toast.success("Benefit edited and approved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save edits");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleApproveAll() {
    const pendingIds = benefits
      .filter((b) => b.status === "pending")
      .map((b) => b.id);
    if (pendingIds.length === 0) return;

    setActionLoading("all");
    let approved = 0;
    for (const id of pendingIds) {
      try {
        const res = await fetch("/api/review", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ benefitId: id, action: "approve" }),
        });
        if (res.ok) approved++;
      } catch {
        // continue
      }
    }
    setBenefits((prev) =>
      prev.map((b) =>
        pendingIds.includes(b.id) ? { ...b, status: "approved" as const } : b
      )
    );
    setStats((s) => ({
      ...s,
      totalPending: 0,
      approvedToday: s.approvedToday + approved,
    }));
    toast.success(`${approved} benefit${approved === 1 ? "" : "s"} approved`);
    setActionLoading(null);
  }

  function openDetails(id: string) {
    const b = benefits.find((b) => b.id === id);
    if (b) setSelectedBenefit(b);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-frankly-dark">Review Extractions</h1>
          <p className="mt-1 text-sm text-frankly-gray">
            Review and approve AI-extracted benefits before they enter the knowledge base.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="ghost" onClick={fetchBenefits} disabled={loading} className="gap-1.5">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {pendingCount > 1 && statusFilter === "pending" && (
            <Button onClick={handleApproveAll} disabled={actionLoading === "all"} className="gap-1.5">
              <CheckCheck className="h-4 w-4" />
              Approve All ({pendingCount})
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          icon={<Clock className="h-5 w-5 text-amber-500" />}
          label="Pending Review"
          value={stats.totalPending}
          bg="bg-amber-50"
        />
        <StatCard
          icon={<CheckCircle className="h-5 w-5 text-frankly-green" />}
          label="Approved Today"
          value={stats.approvedToday}
          bg="bg-frankly-green-light"
        />
        <StatCard
          icon={<XCircle className="h-5 w-5 text-red-500" />}
          label="Rejected Today"
          value={stats.rejectedToday}
          bg="bg-red-50"
        />
      </div>

      {/* Filters row */}
      <div className="flex items-end gap-4 flex-wrap">
        {/* Status tabs */}
        <div className="flex gap-1 border-b border-gray-200 flex-1 min-w-0">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
                statusFilter === tab.value
                  ? "border-frankly-green text-frankly-green"
                  : "border-transparent text-frankly-gray hover:text-frankly-dark hover:border-gray-300"
              }`}
            >
              {tab.label}
              {tab.value === "pending" && pendingCount > 0 && (
                <Badge variant="pending" className="ml-2">{pendingCount}</Badge>
              )}
            </button>
          ))}
        </div>

        {/* Dropdown filters */}
        <Select
          label="Insurer"
          value={insurerFilter}
          onChange={(v) => setInsurerFilter(v)}
          options={insurers.map((i) => ({ value: i.id, label: i.name }))}
          placeholder="All insurers"
          className="w-48"
        />
        <Select
          label="Benefit Type"
          value={benefitTypeFilter}
          onChange={(v) => setBenefitTypeFilter(v)}
          options={benefitTypes.map((t) => ({ value: t.id, label: t.name }))}
          placeholder="All types"
          className="w-56"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 text-frankly-green animate-spin" />
        </div>
      ) : visibleBenefits.length === 0 ? (
        <Card padding="lg">
          <div className="flex flex-col items-center text-center">
            <ClipboardCheck className="h-12 w-12 text-gray-300" />
            <h3 className="mt-4 text-lg font-semibold text-frankly-dark">
              {statusFilter === "pending"
                ? "No extractions to review"
                : `No ${statusFilter} extractions`}
            </h3>
            <p className="mt-2 text-sm text-frankly-gray">
              {statusFilter === "pending"
                ? "Upload a document to get started."
                : "No benefits match these filters."}
            </p>
            {statusFilter === "pending" && (
              <Link
                href="/upload"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-frankly-green px-4 py-2 text-sm font-medium text-white hover:bg-frankly-green-hover transition-colors"
              >
                <Upload className="h-4 w-4" />
                Upload Document
              </Link>
            )}
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {visibleBenefits.map((benefit) => (
            <BenefitCard
              key={benefit.id}
              benefit={benefit}
              onViewDetails={openDetails}
              onApprove={handleApprove}
              onReject={handleRejectClick}
              disabled={actionLoading === benefit.id || actionLoading === "all"}
            />
          ))}
        </div>
      )}

      {/* Detail slide-over panel */}
      {selectedBenefit && (
        <DetailPanel
          benefit={selectedBenefit}
          onClose={() => setSelectedBenefit(null)}
          onApprove={handleApprove}
          onReject={handleRejectClick}
          onSaveEdit={handleSaveEdit}
          disabled={actionLoading === selectedBenefit.id}
        />
      )}

      {/* Reject modal */}
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

function StatCard({
  icon,
  label,
  value,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  bg: string;
}) {
  return (
    <div className={`rounded-xl border border-gray-200 ${bg} px-5 py-4`}>
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <p className="text-2xl font-bold text-frankly-dark">{value}</p>
          <p className="text-xs text-frankly-gray">{label}</p>
        </div>
      </div>
    </div>
  );
}
