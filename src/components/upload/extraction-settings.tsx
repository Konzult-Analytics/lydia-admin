"use client";

import { useState } from "react";
import { ChevronDown, Sparkles, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  ExtractionSettings,
  ExtractionSensitivity,
  AttributeDetail,
} from "@/types/database";

interface ExtractionSettingsPanelProps {
  settings: ExtractionSettings;
  onChange: (settings: ExtractionSettings) => void;
  disabled?: boolean;
}

const SENSITIVITY_OPTIONS: {
  value: ExtractionSensitivity;
  label: string;
  description: string;
}[] = [
  {
    value: "conservative",
    label: "Conservative",
    description: "Only clearly defined benefits. Fewer extractions, higher accuracy.",
  },
  {
    value: "balanced",
    label: "Balanced",
    description: "Recommended. Good balance of coverage and accuracy.",
  },
  {
    value: "thorough",
    label: "Thorough",
    description: "Extract everything possible. May need more review.",
  },
];

const ATTRIBUTE_DETAIL_OPTIONS: { value: AttributeDetail; label: string }[] = [
  { value: "basic", label: "Basic" },
  { value: "detailed", label: "Detailed" },
  { value: "comprehensive", label: "Comprehensive" },
];

export function ExtractionSettingsPanel({
  settings,
  onChange,
  disabled = false,
}: ExtractionSettingsPanelProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  function update<K extends keyof ExtractionSettings>(key: K, value: ExtractionSettings[K]) {
    onChange({ ...settings, [key]: value });
  }

  return (
    <div className="rounded-xl border border-border bg-surface-secondary px-5 py-4 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-frankly-green" />
        <h3 className="text-sm font-semibold text-frankly-dark">Extraction Settings</h3>
      </div>

      <div>
        <label className="block text-xs font-medium text-frankly-gray mb-2">
          How thorough should the AI be?
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {SENSITIVITY_OPTIONS.map((opt) => {
            const selected = settings.sensitivity === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={disabled}
                onClick={() => update("sensitivity", opt.value)}
                className={cn(
                  "rounded-lg border px-3 py-2.5 text-left transition-colors",
                  selected
                    ? "border-frankly-green bg-frankly-green-light text-frankly-dark"
                    : "border-border bg-surface text-frankly-gray hover:border-frankly-green/50",
                  disabled && "opacity-50 cursor-not-allowed"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-frankly-dark">{opt.label}</span>
                  {opt.value === "balanced" && !selected && (
                    <span className="text-[10px] uppercase tracking-wider text-frankly-gray/70">
                      Default
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-frankly-gray leading-snug">{opt.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <Toggle
          label="Include sub-benefits"
          checked={settings.includeSubBenefits}
          onChange={(v) => update("includeSubBenefits", v)}
          disabled={disabled}
        />
        <Toggle
          label="Flag uncertain fields"
          checked={settings.flagUncertainties}
          onChange={(v) => update("flagUncertainties", v)}
          disabled={disabled}
        />
      </div>

      <button
        type="button"
        onClick={() => setAdvancedOpen((v) => !v)}
        disabled={disabled}
        className="flex items-center gap-1 text-xs font-medium text-frankly-gray hover:text-frankly-dark transition-colors"
      >
        Advanced options
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", advancedOpen && "rotate-180")} />
      </button>

      {advancedOpen && (
        <div className="rounded-lg border border-border bg-surface px-3 py-3">
          <label className="block text-xs font-medium text-frankly-gray mb-1.5">
            Attribute detail
          </label>
          <div className="flex gap-1.5">
            {ATTRIBUTE_DETAIL_OPTIONS.map((opt) => {
              const selected = settings.attributeDetail === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={disabled}
                  onClick={() => update("attributeDetail", opt.value)}
                  className={cn(
                    "rounded-md border px-3 py-1 text-xs font-medium transition-colors",
                    selected
                      ? "border-frankly-green bg-frankly-green-light text-frankly-green"
                      : "border-border bg-surface text-frankly-gray hover:text-frankly-dark",
                    disabled && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          <p className="mt-2 flex items-start gap-1.5 text-[11px] text-frankly-gray/80">
            <Info className="h-3 w-3 mt-0.5 shrink-0" />
            Comprehensive captures every limit and sub-limit; basic captures only headline values.
          </p>
        </div>
      )}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "inline-flex items-center gap-2 text-sm text-frankly-dark cursor-pointer",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-border text-frankly-green focus:ring-frankly-green"
      />
      <span>{label}</span>
    </label>
  );
}
