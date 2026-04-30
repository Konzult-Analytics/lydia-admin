"use client";

import { useMemo, useState } from "react";
import {
  ChevronRight,
  FileText,
  Building2,
  Package,
  AlertTriangle,
  Copy,
  Gauge,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { BenefitWithDetails } from "@/components/review/benefit-card";

interface ExplorerTreeProps {
  benefits: BenefitWithDetails[];
  onSelect: (benefit: BenefitWithDetails) => void;
  selectedIds?: Set<string>;
  onToggleSelected?: (id: string) => void;
  onToggleGroup?: (ids: string[]) => void;
}

interface InsurerNode {
  id: string;
  name: string;
  shortName: string | null;
  products: Map<string, ProductNode>;
}

interface ProductNode {
  id: string;
  name: string;
  benefits: BenefitWithDetails[];
}

export function ExplorerTree({
  benefits,
  onSelect,
  selectedIds,
  onToggleSelected,
  onToggleGroup,
}: ExplorerTreeProps) {
  const tree = useMemo(() => buildTree(benefits), [benefits]);
  const [openInsurers, setOpenInsurers] = useState<Set<string>>(() => new Set(tree.map((t) => t.id)));
  const [openProducts, setOpenProducts] = useState<Set<string>>(() => new Set());

  const selectionEnabled = !!selectedIds && !!onToggleSelected;

  function toggleInsurer(id: string) {
    setOpenInsurers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleProduct(id: string) {
    setOpenProducts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (tree.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-frankly-gray">
        No benefits match these filters.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tree.map((insurer) => {
        const open = openInsurers.has(insurer.id);
        const productList = Array.from(insurer.products.values());
        const totalBenefits = productList.reduce((sum, p) => sum + p.benefits.length, 0);
        const insurerIds = productList.flatMap((p) => p.benefits.map((b) => b.id));
        const insurerSelectedCount = selectedIds
          ? insurerIds.filter((id) => selectedIds.has(id)).length
          : 0;

        return (
          <div key={insurer.id} className="rounded-xl border border-border bg-surface overflow-hidden">
            <div className="flex items-center hover:bg-frankly-gray-light transition-colors">
              {selectionEnabled && (
                <GroupCheckbox
                  ids={insurerIds}
                  selectedCount={insurerSelectedCount}
                  total={insurerIds.length}
                  onToggle={(ids) => onToggleGroup?.(ids)}
                />
              )}
              <button
                onClick={() => toggleInsurer(insurer.id)}
                className={cn(
                  "flex-1 flex items-center gap-3 py-3 text-left",
                  selectionEnabled ? "pl-1 pr-4" : "px-4"
                )}
              >
                <ChevronRight
                  className={cn("h-4 w-4 text-frankly-gray transition-transform", open && "rotate-90")}
                />
                <Building2 className="h-4 w-4 text-frankly-green" />
                <span className="font-semibold text-frankly-dark">{insurer.name}</span>
                <span className="ml-auto text-xs text-frankly-gray">
                  {productList.length} product{productList.length === 1 ? "" : "s"} ·{" "}
                  {totalBenefits} benefit{totalBenefits === 1 ? "" : "s"}
                </span>
              </button>
            </div>
            {open && (
              <div className="border-t border-border-subtle">
                {productList.map((product) => {
                  const productOpen = openProducts.has(product.id);
                  const productIds = product.benefits.map((b) => b.id);
                  const productSelectedCount = selectedIds
                    ? productIds.filter((id) => selectedIds.has(id)).length
                    : 0;
                  return (
                    <div key={product.id}>
                      <div className="flex items-center hover:bg-frankly-gray-light transition-colors border-b border-border-subtle">
                        {selectionEnabled && (
                          <GroupCheckbox
                            ids={productIds}
                            selectedCount={productSelectedCount}
                            total={productIds.length}
                            onToggle={(ids) => onToggleGroup?.(ids)}
                            indent={6}
                          />
                        )}
                        <button
                          onClick={() => toggleProduct(product.id)}
                          className={cn(
                            "flex-1 flex items-center gap-3 py-2 text-left",
                            selectionEnabled ? "pl-1 pr-4" : "pl-10 pr-4"
                          )}
                        >
                          <ChevronRight
                            className={cn(
                              "h-3.5 w-3.5 text-frankly-gray transition-transform",
                              productOpen && "rotate-90"
                            )}
                          />
                          <Package className="h-3.5 w-3.5 text-frankly-gray" />
                          <span className="text-sm text-frankly-dark">{product.name}</span>
                          <span className="ml-auto text-xs text-frankly-gray">
                            {product.benefits.length} benefit{product.benefits.length === 1 ? "" : "s"}
                          </span>
                        </button>
                      </div>
                      {productOpen && (
                        <div className="bg-surface-secondary">
                          {product.benefits.map((b) => (
                            <BenefitRow
                              key={b.id}
                              benefit={b}
                              onSelect={onSelect}
                              selected={selectedIds?.has(b.id) ?? false}
                              onToggleSelected={selectionEnabled ? onToggleSelected : undefined}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function BenefitRow({
  benefit,
  onSelect,
  selected,
  onToggleSelected,
}: {
  benefit: BenefitWithDetails;
  onSelect: (b: BenefitWithDetails) => void;
  selected: boolean;
  onToggleSelected?: (id: string) => void;
}) {
  const attrCount = benefit.benefit_attributes?.length ?? 0;
  const uncertainCount =
    (benefit as unknown as { uncertain_fields: string[] | null }).uncertain_fields?.length ?? 0;
  const dupOf = (benefit as unknown as { possible_duplicate_of: string | null }).possible_duplicate_of;
  const conf = benefit.extraction_confidence;
  const lowConf = conf !== null && conf !== undefined && conf < 0.7;

  return (
    <div
      className={cn(
        "flex items-center transition-colors border-b border-border-subtle last:border-0",
        selected ? "bg-frankly-green-light/40" : "hover:bg-frankly-gray-light"
      )}
    >
      {onToggleSelected && (
        <label
          onClick={(e) => e.stopPropagation()}
          className="flex items-center justify-center pl-4 pr-2 py-2 cursor-pointer"
        >
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelected(benefit.id)}
            className="h-4 w-4 rounded border-border text-frankly-green focus:ring-frankly-green"
          />
        </label>
      )}
      <button
        onClick={() => onSelect(benefit)}
        className={cn(
          "flex-1 flex items-center gap-3 py-2 text-left",
          onToggleSelected ? "pl-2 pr-4" : "pl-16 pr-4"
        )}
      >
        <FileText className="h-3.5 w-3.5 text-frankly-gray shrink-0" />
        <span className="text-sm font-medium text-frankly-dark truncate">{benefit.benefit_name}</span>
        <Badge variant={benefit.status} className="shrink-0">
          {benefit.status}
        </Badge>
        {benefit.benefit_types && (
          <span className="text-[11px] text-frankly-gray bg-frankly-gray-light px-1.5 py-0.5 rounded shrink-0">
            {benefit.benefit_types.name}
          </span>
        )}
        {lowConf && (
          <span
            title={`Low confidence: ${Math.round((conf ?? 0) * 100)}%`}
            className="inline-flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded shrink-0"
          >
            <Gauge className="h-3 w-3" />
            {Math.round((conf ?? 0) * 100)}%
          </span>
        )}
        {uncertainCount > 0 && (
          <span
            title={`${uncertainCount} uncertain field${uncertainCount === 1 ? "" : "s"}`}
            className="inline-flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded shrink-0"
          >
            <AlertTriangle className="h-3 w-3" />
            {uncertainCount}
          </span>
        )}
        {dupOf && (
          <span
            title="Possible duplicate of an existing benefit"
            className="inline-flex items-center gap-1 text-[11px] text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded shrink-0"
          >
            <Copy className="h-3 w-3" />
            duplicate?
          </span>
        )}
        <span className="ml-auto text-[11px] text-frankly-gray">
          {attrCount} attr{attrCount === 1 ? "" : "s"}
        </span>
      </button>
    </div>
  );
}

function GroupCheckbox({
  ids,
  selectedCount,
  total,
  onToggle,
  indent = 4,
}: {
  ids: string[];
  selectedCount: number;
  total: number;
  onToggle: (ids: string[]) => void;
  indent?: number;
}) {
  const allSelected = total > 0 && selectedCount === total;
  const partial = selectedCount > 0 && selectedCount < total;

  return (
    <label
      onClick={(e) => e.stopPropagation()}
      className="flex items-center justify-center py-2 cursor-pointer"
      style={{ paddingLeft: `${indent * 4}px`, paddingRight: 4 }}
    >
      <input
        type="checkbox"
        checked={allSelected}
        ref={(el) => {
          if (el) el.indeterminate = partial;
        }}
        onChange={() => onToggle(ids)}
        className="h-4 w-4 rounded border-border text-frankly-green focus:ring-frankly-green"
      />
    </label>
  );
}

function buildTree(benefits: BenefitWithDetails[]): InsurerNode[] {
  const insurers = new Map<string, InsurerNode>();

  for (const benefit of benefits) {
    const doc = benefit.source_documents;
    const insurer = doc?.insurers;
    const product = doc?.products;
    const insurerId = insurer?.id ?? doc?.insurer_id ?? "unknown";
    const insurerName = insurer?.name ?? "(Unknown insurer)";
    const insurerShort = insurer?.short_name ?? null;
    const productId = product?.id ?? "unknown";
    const productName = product?.name ?? "(Unknown product)";

    let insurerNode = insurers.get(insurerId);
    if (!insurerNode) {
      insurerNode = {
        id: insurerId,
        name: insurerName,
        shortName: insurerShort,
        products: new Map(),
      };
      insurers.set(insurerId, insurerNode);
    }

    let productNode = insurerNode.products.get(productId);
    if (!productNode) {
      productNode = { id: productId, name: productName, benefits: [] };
      insurerNode.products.set(productId, productNode);
    }

    productNode.benefits.push(benefit);
  }

  return Array.from(insurers.values()).sort((a, b) => a.name.localeCompare(b.name));
}
