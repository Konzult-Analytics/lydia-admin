"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type { Insurer } from "@/types/database";

interface ProductFormProps {
  insurers: Insurer[];
  initial?: { id: string; insurer_id: string; name: string; product_type: string };
  defaultInsurerId?: string;
  onClose: () => void;
  onSaved: () => void;
}

const PRODUCT_TYPES = [
  { value: "life", label: "Life" },
  { value: "health", label: "Health" },
  { value: "investment", label: "Investment" },
  { value: "retirement", label: "Retirement" },
  { value: "short_term", label: "Short-term" },
];

export function ProductForm({
  insurers,
  initial,
  defaultInsurerId,
  onClose,
  onSaved,
}: ProductFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [insurerId, setInsurerId] = useState(initial?.insurer_id ?? defaultInsurerId ?? "");
  const [productType, setProductType] = useState(initial?.product_type ?? "life");
  const [id, setId] = useState(initial?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!initial;

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const url = isEdit ? `/api/products/${initial.id}` : "/api/products";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isEdit
            ? { name, product_type: productType }
            : { id: id || undefined, name, insurer_id: insurerId, product_type: productType }
        ),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed");
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} size="md">
      <div className="space-y-3">
        <h3 className="text-lg font-bold text-frankly-dark">
          {isEdit ? "Edit product" : "Add product"}
        </h3>

        {!isEdit && (
          <div>
            <label className="block text-xs font-semibold text-frankly-gray uppercase tracking-wider mb-1.5">
              Insurer
            </label>
            <Select
              value={insurerId}
              onChange={setInsurerId}
              options={insurers.map((i) => ({ value: i.id, label: i.name }))}
              placeholder="Select insurer..."
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-frankly-gray uppercase tracking-wider mb-1.5">
            Name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Essential Life Plan"
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-frankly-green focus:outline-none focus:ring-1 focus:ring-frankly-green"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-frankly-gray uppercase tracking-wider mb-1.5">
            Type
          </label>
          <Select value={productType} onChange={setProductType} options={PRODUCT_TYPES} />
        </div>

        {!isEdit && (
          <div>
            <label className="block text-xs font-semibold text-frankly-gray uppercase tracking-wider mb-1.5">
              ID (optional — auto-generated from insurer + name)
            </label>
            <input
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="e.g. discovery_essential_life"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm font-mono focus:border-frankly-green focus:outline-none focus:ring-1 focus:ring-frankly-green"
            />
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !name.trim() || (!isEdit && !insurerId)}
          >
            {saving ? "Saving..." : isEdit ? "Save" : "Add"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
