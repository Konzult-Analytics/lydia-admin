"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, RefreshCw, Upload, FileText } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { DocumentCard, type DocumentRow } from "@/components/documents/document-card";
import { HistoryModal } from "@/components/database/history-modal";
import type { Insurer } from "@/types/database";

const DOCUMENT_TYPES = [
  { value: "product_guide", label: "Product Guide" },
  { value: "brochure", label: "Brochure" },
  { value: "technical_guide", label: "Technical Guide" },
  { value: "benefit_schedule", label: "Benefit Schedule" },
];

const STATUSES = [
  { value: "processed", label: "Processed" },
  { value: "processing", label: "Processing" },
  { value: "uploaded", label: "Uploaded" },
  { value: "failed", label: "Failed" },
];

export default function DocumentsPage() {
  const supabase = createClient();
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [insurers, setInsurers] = useState<Insurer[]>([]);
  const [insurerFilter, setInsurerFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [historyTarget, setHistoryTarget] = useState<DocumentRow | null>(null);

  useEffect(() => {
    supabase
      .from("insurers")
      .select("id, name, short_name")
      .order("name")
      .then(({ data }) => setInsurers(data ?? []));
  }, [supabase]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (insurerFilter) params.set("insurerId", insurerFilter);
      if (typeFilter) params.set("documentType", typeFilter);
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/documents?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setDocuments(data.documents ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, [insurerFilter, typeFilter, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleReExtract(doc: DocumentRow) {
    if (!confirm(`Re-extract "${doc.file_name}"? This will create new pending benefits.`)) return;
    setActionLoading(doc.id);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: doc.id,
          settings: doc.extraction_settings ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success(`Re-extracted ${data.benefitsFound} benefits`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleMarkReviewed(doc: DocumentRow) {
    setActionLoading(doc.id);
    try {
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_reviewed" }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed");
      }
      toast.success("Marked as reviewed");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(doc: DocumentRow) {
    if (
      !confirm(
        `Delete "${doc.file_name}"? Benefits already extracted from it will be kept (their source link will be cleared).`
      )
    )
      return;
    setActionLoading(doc.id);
    try {
      const res = await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed");
      }
      toast.success("Document deleted");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-frankly-dark">Documents</h1>
          <p className="mt-1 text-sm text-frankly-gray">
            Track every uploaded document. Flag old ones for re-review and re-extract when products update.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" onClick={load} disabled={loading} className="gap-1.5">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Link
            href="/upload"
            className="inline-flex items-center gap-1.5 rounded-lg bg-frankly-green px-4 py-2 text-sm font-medium text-white hover:bg-frankly-green-hover transition-colors"
          >
            <Upload className="h-4 w-4" />
            Upload New
          </Link>
        </div>
      </div>

      <Card padding="sm">
        <div className="flex gap-2 flex-wrap">
          <Select
            value={insurerFilter}
            onChange={setInsurerFilter}
            options={insurers.map((i) => ({ value: i.id, label: i.name }))}
            placeholder="All insurers"
            className="w-48"
          />
          <Select
            value={typeFilter}
            onChange={setTypeFilter}
            options={DOCUMENT_TYPES}
            placeholder="All types"
            className="w-48"
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            options={STATUSES}
            placeholder="All statuses"
            className="w-44"
          />
        </div>
      </Card>

      {loading && documents.length === 0 ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 text-frankly-green animate-spin" />
        </div>
      ) : documents.length === 0 ? (
        <Card padding="lg">
          <div className="flex flex-col items-center text-center">
            <FileText className="h-12 w-12 text-border" />
            <h3 className="mt-4 text-lg font-semibold text-frankly-dark">No documents yet</h3>
            <p className="mt-2 text-sm text-frankly-gray">Upload your first product document to begin.</p>
            <Link
              href="/upload"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-frankly-green px-4 py-2 text-sm font-medium text-white hover:bg-frankly-green-hover transition-colors"
            >
              <Upload className="h-4 w-4" />
              Upload Document
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              onReExtract={handleReExtract}
              onMarkReviewed={handleMarkReviewed}
              onDelete={handleDelete}
              onHistory={(d) => setHistoryTarget(d)}
              disabled={actionLoading === doc.id}
            />
          ))}
        </div>
      )}

      {historyTarget && (
        <HistoryModal
          recordId={historyTarget.id}
          recordLabel={historyTarget.file_name}
          tableName="source_documents"
          onClose={() => setHistoryTarget(null)}
        />
      )}
    </div>
  );
}
