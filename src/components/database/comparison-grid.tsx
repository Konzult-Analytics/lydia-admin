"use client";

import { useMemo } from "react";
import { Check, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BenefitWithDetails } from "@/components/review/benefit-card";

interface ComparisonGridProps {
  benefits: BenefitWithDetails[];
  onSelect: (benefit: BenefitWithDetails) => void;
}

interface BenefitTypeRow {
  id: string;
  name: string;
}

interface InsurerCol {
  id: string;
  name: string;
  shortName: string | null;
}

export function ComparisonGrid({ benefits, onSelect }: ComparisonGridProps) {
  const { typeRows, insurerCols, matrix } = useMemo(() => buildMatrix(benefits), [benefits]);

  if (typeRows.length === 0 || insurerCols.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-frankly-gray">
        Not enough data for comparison view yet.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-frankly-gray-light sticky top-0">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-frankly-gray uppercase tracking-wider sticky left-0 bg-frankly-gray-light z-10">
              Benefit Type
            </th>
            {insurerCols.map((c) => (
              <th
                key={c.id}
                className="px-3 py-3 text-center text-xs font-semibold text-frankly-gray uppercase tracking-wider whitespace-nowrap"
              >
                {c.shortName ?? c.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {typeRows.map((row) => (
            <tr key={row.id} className="hover:bg-frankly-gray-light/40 transition-colors">
              <td className="px-4 py-2 text-frankly-dark font-medium sticky left-0 bg-surface group-hover:bg-frankly-gray-light/40 z-10">
                {row.name}
              </td>
              {insurerCols.map((col) => {
                const cell = matrix.get(`${row.id}::${col.id}`);
                if (!cell) {
                  return (
                    <td key={col.id} className="px-3 py-2 text-center text-frankly-gray/40">
                      <X className="h-4 w-4 inline-block" />
                    </td>
                  );
                }
                const hasUncertain = cell.benefits.some(
                  (b) =>
                    (b as unknown as { uncertain_fields: string[] | null }).uncertain_fields?.length
                );
                return (
                  <td key={col.id} className="px-3 py-2 text-center">
                    <button
                      onClick={() => onSelect(cell.benefits[0])}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors",
                        cell.approved > 0
                          ? "bg-frankly-green-light text-frankly-green hover:bg-frankly-green/20"
                          : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                      )}
                      title={
                        cell.benefits.length === 1
                          ? cell.benefits[0].benefit_name
                          : `${cell.benefits.length} benefits — click to open first`
                      }
                    >
                      {cell.approved > 0 ? <Check className="h-3 w-3" /> : null}
                      {cell.benefits.length}
                      {hasUncertain && <AlertTriangle className="h-3 w-3 text-amber-600" />}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function buildMatrix(benefits: BenefitWithDetails[]) {
  const typeMap = new Map<string, BenefitTypeRow>();
  const insurerMap = new Map<string, InsurerCol>();
  const matrix = new Map<string, { benefits: BenefitWithDetails[]; approved: number }>();

  for (const b of benefits) {
    const type = b.benefit_types;
    const doc = b.source_documents;
    const insurer = doc?.insurers;
    if (!type || !insurer) continue;

    if (!typeMap.has(type.id)) {
      typeMap.set(type.id, { id: type.id, name: type.name });
    }
    if (!insurerMap.has(insurer.id)) {
      insurerMap.set(insurer.id, { id: insurer.id, name: insurer.name, shortName: insurer.short_name });
    }

    const key = `${type.id}::${insurer.id}`;
    let cell = matrix.get(key);
    if (!cell) {
      cell = { benefits: [], approved: 0 };
      matrix.set(key, cell);
    }
    cell.benefits.push(b);
    if (b.status === "approved") cell.approved++;
  }

  const typeRows = Array.from(typeMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  const insurerCols = Array.from(insurerMap.values()).sort((a, b) => a.name.localeCompare(b.name));

  return { typeRows, insurerCols, matrix };
}
