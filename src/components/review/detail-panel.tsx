"use client";

import { useState } from "react";
import {
  Plus,
  Trash2,
  Check,
  Pencil,
  FileText,
  Gauge,
  Calendar,
  ExternalLink,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SlideOver } from "@/components/ui/slide-over";
import { cn } from "@/lib/utils";
import { getMissingTemplateAttributes } from "@/lib/benefit-templates";
import type { BenefitWithDetails, BenefitAttribute } from "./benefit-card";

interface DetailPanelProps {
  benefit: BenefitWithDetails;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onSaveEdit: (
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
  ) => void;
  disabled?: boolean;
}

export function DetailPanel({
  benefit,
  onClose,
  onApprove,
  onReject,
  onSaveEdit,
  disabled = false,
}: DetailPanelProps) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(benefit.benefit_name);
  const [editDescription, setEditDescription] = useState(benefit.description ?? "");
  const [editFeatures, setEditFeatures] = useState<string[]>(benefit.key_features ?? []);
  const [editExclusions, setEditExclusions] = useState<string[]>(benefit.exclusions ?? []);
  const [editAttrs, setEditAttrs] = useState<(BenefitAttribute & { _new?: boolean })[]>(
    benefit.benefit_attributes.map((a) => ({ ...a }))
  );
  const [deletedAttrIds, setDeletedAttrIds] = useState<string[]>([]);
  const [reviewerNotes, setReviewerNotes] = useState(benefit.reviewer_notes ?? "");

  const isPending = benefit.status === "pending";
  const doc = benefit.source_documents;
  const confidence = benefit.extraction_confidence;
  const confidencePercent = confidence !== null ? Math.round(confidence * 100) : null;

  function startEditing() {
    setEditName(benefit.benefit_name);
    setEditDescription(benefit.description ?? "");
    setEditFeatures([...(benefit.key_features ?? [])]);
    setEditExclusions([...(benefit.exclusions ?? [])]);
    setEditAttrs(benefit.benefit_attributes.map((a) => ({ ...a })));
    setDeletedAttrIds([]);
    setReviewerNotes(benefit.reviewer_notes ?? "");
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
  }

  function handleSave() {
    onSaveEdit(benefit.id, {
      benefit_name: editName,
      description: editDescription,
      key_features: editFeatures.filter(Boolean),
      exclusions: editExclusions.filter(Boolean),
      reviewer_notes: reviewerNotes,
      attributes: editAttrs.map((a) => ({
        id: a._new ? undefined : a.id,
        attribute_name: a.attribute_name,
        attribute_value: a.attribute_value,
        attribute_unit: a.attribute_unit,
      })),
      deletedAttributeIds: deletedAttrIds,
    });
    setEditing(false);
  }

  // List helpers
  function updateItem(list: string[], index: number, value: string, setter: (v: string[]) => void) {
    setter(list.map((item, i) => (i === index ? value : item)));
  }
  function addItem(list: string[], setter: (v: string[]) => void) {
    setter([...list, ""]);
  }
  function removeItem(list: string[], index: number, setter: (v: string[]) => void) {
    setter(list.filter((_, i) => i !== index));
  }

  // Attribute helpers
  function updateAttr(index: number, field: keyof BenefitAttribute, value: string) {
    setEditAttrs((prev) =>
      prev.map((a, i) => (i === index ? { ...a, [field]: value || null } : a))
    );
  }
  function addAttr(name = "", unit: string | null = null) {
    setEditAttrs((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}-${Math.random()}`,
        product_benefit_id: benefit.id,
        attribute_name: name,
        attribute_value: "",
        attribute_unit: unit,
        source_page: null,
        _new: true,
      },
    ]);
  }
  function removeAttr(index: number) {
    const attr = editAttrs[index];
    if (!attr._new) setDeletedAttrIds((prev) => [...prev, attr.id]);
    setEditAttrs((prev) => prev.filter((_, i) => i !== index));
  }

  async function openSourcePdf() {
    if (!doc) return;
    try {
      const res = await fetch(`/api/documents/${doc.id}/url`);
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? "Could not load PDF");
      const page = parsePageNumber(benefit.source_page);
      const url = page ? `${data.url}#page=${page}` : data.url;
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not open PDF");
    }
  }

  const missingTemplateAttrs = getMissingTemplateAttributes(
    benefit.benefit_types?.id,
    editing ? editAttrs : benefit.benefit_attributes
  );

  const uncertainFields =
    (benefit as unknown as { uncertain_fields: string[] | null }).uncertain_fields ?? [];

  const duplicateOf =
    (benefit as unknown as { possible_duplicate_of: string | null }).possible_duplicate_of;
  const duplicateScore =
    (benefit as unknown as { duplicate_score: number | null }).duplicate_score;

  const headerTitle = editing ? (
    <input
      value={editName}
      onChange={(e) => setEditName(e.target.value)}
      className="text-xl font-bold text-frankly-dark w-full rounded-lg border border-border px-3 py-1.5 focus:border-frankly-green focus:outline-none focus:ring-1 focus:ring-frankly-green"
    />
  ) : (
    benefit.benefit_name
  );

  const headerSubtitle = (
    <div className="flex items-center gap-2 flex-wrap">
      {doc?.insurers?.name && <span>{doc.insurers.name}</span>}
      {doc?.products?.name && (
        <>
          <span className="text-frankly-gray/40">&bull;</span>
          <span>{doc.products.name}</span>
        </>
      )}
      <Badge variant={benefit.status}>{benefit.status}</Badge>
      {benefit.benefit_types && (
        <span className="text-xs bg-frankly-gray-light px-2 py-0.5 rounded-full">
          {benefit.benefit_types.name}
        </span>
      )}
    </div>
  );

  const footer = isPending ? (
    <div className="flex justify-between">
      <Button
        variant="ghost"
        onClick={() => onReject(benefit.id)}
        disabled={disabled || editing}
        className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50"
      >
        <Trash2 className="h-4 w-4" />
        Reject
      </Button>
      <div className="flex gap-2">
        {editing ? (
          <>
            <Button variant="ghost" onClick={cancelEditing} disabled={disabled}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={disabled} className="gap-1.5">
              <Check className="h-4 w-4" />
              Save &amp; Approve
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={startEditing} disabled={disabled} className="gap-1.5">
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
            <Button onClick={() => onApprove(benefit.id)} disabled={disabled} className="gap-1.5">
              <Check className="h-4 w-4" />
              Approve
            </Button>
          </>
        )}
      </div>
    </div>
  ) : undefined;

  return (
    <SlideOver
      open
      onClose={onClose}
      title={headerTitle}
      subtitle={headerSubtitle}
      footer={footer}
    >
      <div className="space-y-6">
        {/* Description */}
        <Section label="Description">
          {editing ? (
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm text-frankly-dark focus:border-frankly-green focus:outline-none focus:ring-1 focus:ring-frankly-green resize-none"
            />
          ) : (
            <p className="text-sm text-frankly-dark leading-relaxed">
              {benefit.description || "No description provided."}
            </p>
          )}
        </Section>

        {/* Uncertain fields banner */}
        {uncertainFields.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900">
              <span className="font-semibold">AI flagged uncertain fields: </span>
              {uncertainFields.join(", ")}
            </div>
          </div>
        )}

        {duplicateOf && (
          <div className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-violet-600 shrink-0 mt-0.5" />
            <div className="text-xs text-violet-900">
              <span className="font-semibold">
                Possible duplicate
                {duplicateScore !== null && duplicateScore !== undefined
                  ? ` (${Math.round(duplicateScore * 100)}% similarity)`
                  : ""}
              </span>{" "}
              of an existing approved/pending benefit on the same product. Review before approving.
            </div>
          </div>
        )}

        {/* Attributes */}
        <Section
          label="Attributes"
          action={editing ? (
            <button onClick={() => addAttr()} className="flex items-center gap-1 text-xs font-medium text-frankly-green hover:text-frankly-green-hover">
              <Plus className="h-3.5 w-3.5" /> Add Row
            </button>
          ) : undefined}
        >
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-frankly-gray-light">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-frankly-gray">Attribute</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-frankly-gray">Value</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-frankly-gray">Unit</th>
                  {editing && <th className="px-3 py-2 w-10" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {(editing ? editAttrs : benefit.benefit_attributes).map((attr, i) => (
                  <tr key={attr.id}>
                    <td className="px-3 py-2">
                      {editing ? (
                        <input value={attr.attribute_name} onChange={(e) => updateAttr(i, "attribute_name", e.target.value)} className="w-full rounded border border-border px-2 py-1 text-sm focus:border-frankly-green focus:outline-none" />
                      ) : (
                        <span className="text-frankly-dark">{attr.attribute_name}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {editing ? (
                        <input value={attr.attribute_value} onChange={(e) => updateAttr(i, "attribute_value", e.target.value)} className="w-full rounded border border-border px-2 py-1 text-sm focus:border-frankly-green focus:outline-none" />
                      ) : (
                        <span className="font-medium text-frankly-dark">{attr.attribute_value}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {editing ? (
                        <input value={attr.attribute_unit ?? ""} onChange={(e) => updateAttr(i, "attribute_unit", e.target.value)} className="w-full rounded border border-border px-2 py-1 text-sm focus:border-frankly-green focus:outline-none" placeholder="—" />
                      ) : (
                        <span className="text-frankly-gray">{attr.attribute_unit ?? "—"}</span>
                      )}
                    </td>
                    {editing && (
                      <td className="px-2 py-2">
                        <button onClick={() => removeAttr(i)} className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {(editing ? editAttrs : benefit.benefit_attributes).length === 0 && (
                  <tr>
                    <td colSpan={editing ? 4 : 3} className="px-3 py-4 text-center text-sm text-frankly-gray/60">
                      No attributes
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {editing && missingTemplateAttrs.length > 0 && (
            <div className="mt-2 rounded-lg border border-frankly-green/20 bg-frankly-green-light/50 px-3 py-2">
              <p className="text-xs font-medium text-frankly-dark mb-1.5 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-frankly-green" />
                Suggested for {benefit.benefit_types?.name ?? "this type"}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {missingTemplateAttrs.map((t) => (
                  <button
                    key={t.attribute_name}
                    type="button"
                    onClick={() => addAttr(t.attribute_name, t.attribute_unit)}
                    title={t.example ? `e.g. ${t.example}` : undefined}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] font-medium text-frankly-dark hover:border-frankly-green hover:text-frankly-green transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    {t.attribute_name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </Section>

        {/* Key Features */}
        <Section
          label="Key Features"
          action={editing ? (
            <button onClick={() => addItem(editFeatures, setEditFeatures)} className="flex items-center gap-1 text-xs font-medium text-frankly-green hover:text-frankly-green-hover">
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          ) : undefined}
        >
          {editing ? (
            <EditableList
              items={editFeatures}
              onUpdate={(i, v) => updateItem(editFeatures, i, v, setEditFeatures)}
              onRemove={(i) => removeItem(editFeatures, i, setEditFeatures)}
              emptyText="No features. Click Add to create one."
            />
          ) : (
            <BulletList items={benefit.key_features ?? []} color="bg-frankly-green" emptyText="None listed" />
          )}
        </Section>

        {/* Exclusions */}
        <Section
          label="Exclusions"
          action={editing ? (
            <button onClick={() => addItem(editExclusions, setEditExclusions)} className="flex items-center gap-1 text-xs font-medium text-frankly-green hover:text-frankly-green-hover">
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          ) : undefined}
        >
          {editing ? (
            <EditableList
              items={editExclusions}
              onUpdate={(i, v) => updateItem(editExclusions, i, v, setEditExclusions)}
              onRemove={(i) => removeItem(editExclusions, i, setEditExclusions)}
              emptyText="No exclusions. Click Add to create one."
            />
          ) : (
            <BulletList items={benefit.exclusions ?? []} color="bg-red-400" emptyText="None listed" />
          )}
        </Section>

        {/* Reviewer Notes */}
        <Section label="Reviewer Notes">
          {editing ? (
            <textarea
              value={reviewerNotes}
              onChange={(e) => setReviewerNotes(e.target.value)}
              rows={3}
              placeholder="Add notes about this benefit (optional)"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm text-frankly-dark focus:border-frankly-green focus:outline-none focus:ring-1 focus:ring-frankly-green resize-none"
            />
          ) : (
            <p className="text-sm text-frankly-dark">
              {benefit.reviewer_notes || <span className="text-frankly-gray/60">No notes added.</span>}
            </p>
          )}
        </Section>

        {/* Source Information */}
        <Section label="Source Information">
          <div className="rounded-lg bg-frankly-gray-light p-4 space-y-3">
            {doc && (
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-frankly-gray" />
                <span className="text-frankly-dark font-medium truncate">{doc.file_name}</span>
                <Badge variant="uploaded" className="ml-auto shrink-0">
                  {doc.document_type.replace(/_/g, " ")}
                </Badge>
              </div>
            )}
            {benefit.source_page && (
              <div className="text-sm text-frankly-gray">
                Page reference: <span className="text-frankly-dark">{benefit.source_page}</span>
              </div>
            )}
            {doc && (
              <button
                onClick={openSourcePdf}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-frankly-green hover:text-frankly-green-hover"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {benefit.source_page
                  ? `Open PDF at page ${benefit.source_page}`
                  : "Open source PDF"}
              </button>
            )}
            {confidencePercent !== null && (
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-frankly-gray flex items-center gap-1">
                    <Gauge className="h-3.5 w-3.5" /> Extraction Confidence
                  </span>
                  <span className={cn(
                    "font-semibold",
                    confidencePercent >= 90 ? "text-frankly-green" : confidencePercent >= 70 ? "text-amber-600" : "text-red-500"
                  )}>
                    {confidencePercent}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-border overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      confidencePercent >= 90 ? "bg-frankly-green" : confidencePercent >= 70 ? "bg-amber-500" : "bg-red-500"
                    )}
                    style={{ width: `${confidencePercent}%` }}
                  />
                </div>
              </div>
            )}
            {benefit.created_at && (
              <div className="flex items-center gap-1.5 text-sm text-frankly-gray">
                <Calendar className="h-3.5 w-3.5" />
                Extracted: {new Date(benefit.created_at).toLocaleDateString("en-ZA", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            )}
          </div>
        </Section>
      </div>
    </SlideOver>
  );
}

function Section({ label, action, children }: { label: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center justify-between mb-1.5">
        <h4 className="text-xs font-semibold text-frankly-gray uppercase tracking-wider">{label}</h4>
        {action}
      </div>
      {children}
    </section>
  );
}

function parsePageNumber(ref: string | null | undefined): number | null {
  if (!ref) return null;
  const match = ref.match(/\d+/);
  if (!match) return null;
  const num = parseInt(match[0], 10);
  return Number.isFinite(num) && num > 0 ? num : null;
}

function BulletList({ items, color, emptyText }: { items: string[]; color: string; emptyText: string }) {
  if (items.length === 0) {
    return <p className="text-sm text-frankly-gray/60">{emptyText}</p>;
  }
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="text-sm text-frankly-dark flex items-start gap-2">
          <span className={cn("mt-1.5 h-1.5 w-1.5 rounded-full shrink-0", color)} />
          {item}
        </li>
      ))}
    </ul>
  );
}

function EditableList({
  items,
  onUpdate,
  onRemove,
  emptyText,
}: {
  items: string[];
  onUpdate: (index: number, value: string) => void;
  onRemove: (index: number) => void;
  emptyText: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-frankly-gray/60">{emptyText}</p>;
  }
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            value={item}
            onChange={(e) => onUpdate(i, e.target.value)}
            className="flex-1 rounded-lg border border-border px-3 py-1.5 text-sm focus:border-frankly-green focus:outline-none focus:ring-1 focus:ring-frankly-green"
          />
          <button
            onClick={() => onRemove(i)}
            className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
