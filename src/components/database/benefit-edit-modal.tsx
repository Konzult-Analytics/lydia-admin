"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BenefitWithDetails, BenefitAttribute } from "@/components/review/benefit-card";

interface BenefitEditModalProps {
  benefit: BenefitWithDetails;
  onClose: () => void;
  onSaved: () => void;
}

interface EditableAttr extends BenefitAttribute {
  _new?: boolean;
}

export function BenefitEditModal({ benefit, onClose, onSaved }: BenefitEditModalProps) {
  const [name, setName] = useState(benefit.benefit_name);
  const [description, setDescription] = useState(benefit.description ?? "");
  const [features, setFeatures] = useState<string[]>(benefit.key_features ?? []);
  const [exclusions, setExclusions] = useState<string[]>(benefit.exclusions ?? []);
  const [attrs, setAttrs] = useState<EditableAttr[]>(
    benefit.benefit_attributes.map((a) => ({ ...a }))
  );
  const [deletedAttrIds, setDeletedAttrIds] = useState<string[]>([]);
  const [reviewerNotes, setReviewerNotes] = useState(benefit.reviewer_notes ?? "");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateList(list: string[], i: number, v: string, set: (l: string[]) => void) {
    set(list.map((it, idx) => (idx === i ? v : it)));
  }
  function addToList(list: string[], set: (l: string[]) => void) {
    set([...list, ""]);
  }
  function removeFromList(list: string[], i: number, set: (l: string[]) => void) {
    set(list.filter((_, idx) => idx !== i));
  }

  function updateAttr(i: number, field: keyof BenefitAttribute, value: string) {
    setAttrs((prev) =>
      prev.map((a, idx) => (idx === i ? { ...a, [field]: value || null } : a))
    );
  }
  function addAttr() {
    setAttrs((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        product_benefit_id: benefit.id,
        attribute_name: "",
        attribute_value: "",
        attribute_unit: null,
        source_page: null,
        _new: true,
      },
    ]);
  }
  function removeAttr(i: number) {
    const a = attrs[i];
    if (!a._new) setDeletedAttrIds((prev) => [...prev, a.id]);
    setAttrs((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/review", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          benefitId: benefit.id,
          action: "edit",
          sourcePage: "database",
          reason: reason || undefined,
          edits: {
            benefit_name: name,
            description,
            key_features: features.filter(Boolean),
            exclusions: exclusions.filter(Boolean),
            reviewer_notes: reviewerNotes,
            attributes: attrs.map((a) => ({
              id: a._new ? undefined : a.id,
              attribute_name: a.attribute_name,
              attribute_value: a.attribute_value,
              attribute_unit: a.attribute_unit,
            })),
            deletedAttributeIds: deletedAttrIds,
          },
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to save");
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} size="xl" className="max-w-3xl">
      <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
        <div>
          <h3 className="text-lg font-bold text-frankly-dark">Edit Benefit</h3>
          <p className="text-xs text-frankly-gray mt-0.5">
            Changes are logged to the activity history.
          </p>
        </div>

        <Field label="Benefit Name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-frankly-green focus:outline-none focus:ring-1 focus:ring-frankly-green"
          />
        </Field>

        <Field label="Description">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-frankly-green focus:outline-none focus:ring-1 focus:ring-frankly-green resize-none"
          />
        </Field>

        <Field
          label="Attributes"
          action={
            <button
              onClick={addAttr}
              className="text-xs font-medium text-frankly-green hover:text-frankly-green-hover inline-flex items-center gap-1"
            >
              <Plus className="h-3.5 w-3.5" /> Add Row
            </button>
          }
        >
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-frankly-gray-light text-xs">
                <tr>
                  <th className="px-3 py-2 text-left">Attribute</th>
                  <th className="px-3 py-2 text-left">Value</th>
                  <th className="px-3 py-2 text-left">Unit</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {attrs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-3 text-center text-frankly-gray/60 text-xs">
                      No attributes
                    </td>
                  </tr>
                ) : (
                  attrs.map((a, i) => (
                    <tr key={a.id}>
                      <td className="px-3 py-1.5">
                        <input
                          value={a.attribute_name}
                          onChange={(e) => updateAttr(i, "attribute_name", e.target.value)}
                          className="w-full rounded border border-border px-2 py-1 text-sm focus:border-frankly-green focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          value={a.attribute_value}
                          onChange={(e) => updateAttr(i, "attribute_value", e.target.value)}
                          className="w-full rounded border border-border px-2 py-1 text-sm focus:border-frankly-green focus:outline-none"
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          value={a.attribute_unit ?? ""}
                          onChange={(e) => updateAttr(i, "attribute_unit", e.target.value)}
                          placeholder="—"
                          className="w-full rounded border border-border px-2 py-1 text-sm focus:border-frankly-green focus:outline-none"
                        />
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <button
                          onClick={() => removeAttr(i)}
                          className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field
            label="Key Features"
            action={
              <button
                onClick={() => addToList(features, setFeatures)}
                className="text-xs font-medium text-frankly-green hover:text-frankly-green-hover inline-flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </button>
            }
          >
            <EditableList
              items={features}
              onChange={(i, v) => updateList(features, i, v, setFeatures)}
              onRemove={(i) => removeFromList(features, i, setFeatures)}
              empty="No features"
            />
          </Field>
          <Field
            label="Exclusions"
            action={
              <button
                onClick={() => addToList(exclusions, setExclusions)}
                className="text-xs font-medium text-frankly-green hover:text-frankly-green-hover inline-flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </button>
            }
          >
            <EditableList
              items={exclusions}
              onChange={(i, v) => updateList(exclusions, i, v, setExclusions)}
              onRemove={(i) => removeFromList(exclusions, i, setExclusions)}
              empty="No exclusions"
            />
          </Field>
        </div>

        <Field label="Reviewer Notes">
          <textarea
            value={reviewerNotes}
            onChange={(e) => setReviewerNotes(e.target.value)}
            rows={2}
            placeholder="Optional"
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-frankly-green focus:outline-none focus:ring-1 focus:ring-frankly-green resize-none"
          />
        </Field>

        <Field label="Reason for change (optional)">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Updated survival period per 2026 product update"
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-frankly-green focus:outline-none focus:ring-1 focus:ring-frankly-green"
          />
        </Field>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function Field({
  label,
  action,
  children,
}: {
  label: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-xs font-semibold text-frankly-gray uppercase tracking-wider">
          {label}
        </label>
        {action}
      </div>
      {children}
    </div>
  );
}

function EditableList({
  items,
  onChange,
  onRemove,
  empty,
}: {
  items: string[];
  onChange: (i: number, v: string) => void;
  onRemove: (i: number) => void;
  empty: string;
}) {
  if (items.length === 0) {
    return <p className="text-xs text-frankly-gray/60 py-2">{empty}</p>;
  }
  return (
    <div className={cn("space-y-1.5")}>
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <input
            value={item}
            onChange={(e) => onChange(i, e.target.value)}
            className="flex-1 rounded border border-border px-2 py-1 text-sm focus:border-frankly-green focus:outline-none"
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
