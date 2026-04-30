"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

interface InsurerFormProps {
  initial?: { id: string; name: string; short_name: string };
  onClose: () => void;
  onSaved: () => void;
}

export function InsurerForm({ initial, onClose, onSaved }: InsurerFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [shortName, setShortName] = useState(initial?.short_name ?? "");
  const [id, setId] = useState(initial?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!initial;

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const url = isEdit ? `/api/insurers/${initial.id}` : "/api/insurers";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isEdit
            ? { name, short_name: shortName }
            : { id: id || undefined, name, short_name: shortName }
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
          {isEdit ? "Edit insurer" : "Add insurer"}
        </h3>

        <Field label="Name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Discovery"
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-frankly-green focus:outline-none focus:ring-1 focus:ring-frankly-green"
          />
        </Field>

        <Field label="Short name">
          <input
            value={shortName}
            onChange={(e) => setShortName(e.target.value)}
            placeholder="e.g. Discovery"
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-frankly-green focus:outline-none focus:ring-1 focus:ring-frankly-green"
          />
        </Field>

        {!isEdit && (
          <Field label="ID (optional — auto-generated from name)">
            <input
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="e.g. discovery"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm font-mono focus:border-frankly-green focus:outline-none focus:ring-1 focus:ring-frankly-green"
            />
          </Field>
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
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? "Saving..." : isEdit ? "Save" : "Add"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-frankly-gray uppercase tracking-wider mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}
