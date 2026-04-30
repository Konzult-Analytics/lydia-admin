"use client";

import { useMemo, useState } from "react";
import { ChevronRight, FileText, Building2, Package, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { BenefitWithDetails } from "@/components/review/benefit-card";

interface ExplorerTreeProps {
  benefits: BenefitWithDetails[];
  onSelect: (benefit: BenefitWithDetails) => void;
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

export function ExplorerTree({ benefits, onSelect }: ExplorerTreeProps) {
  const tree = useMemo(() => buildTree(benefits), [benefits]);
  const [openInsurers, setOpenInsurers] = useState<Set<string>>(() => new Set(tree.map((t) => t.id)));
  const [openProducts, setOpenProducts] = useState<Set<string>>(() => new Set());

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
        return (
          <div key={insurer.id} className="rounded-xl border border-border bg-surface overflow-hidden">
            <button
              onClick={() => toggleInsurer(insurer.id)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-frankly-gray-light transition-colors"
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
            {open && (
              <div className="border-t border-border-subtle">
                {productList.map((product) => {
                  const productOpen = openProducts.has(product.id);
                  return (
                    <div key={product.id}>
                      <button
                        onClick={() => toggleProduct(product.id)}
                        className="w-full flex items-center gap-3 pl-10 pr-4 py-2 text-left hover:bg-frankly-gray-light transition-colors border-b border-border-subtle"
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
                      {productOpen && (
                        <div className="bg-surface-secondary">
                          {product.benefits.map((b) => (
                            <BenefitRow key={b.id} benefit={b} onSelect={onSelect} />
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
}: {
  benefit: BenefitWithDetails;
  onSelect: (b: BenefitWithDetails) => void;
}) {
  const attrCount = benefit.benefit_attributes?.length ?? 0;
  const uncertainCount = (benefit as unknown as { uncertain_fields: string[] | null })
    .uncertain_fields?.length ?? 0;

  return (
    <button
      onClick={() => onSelect(benefit)}
      className="w-full flex items-center gap-3 pl-16 pr-4 py-2 text-left hover:bg-frankly-gray-light transition-colors border-b border-border-subtle last:border-0"
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
      {uncertainCount > 0 && (
        <span
          title={`${uncertainCount} uncertain field${uncertainCount === 1 ? "" : "s"}`}
          className="inline-flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded shrink-0"
        >
          <AlertTriangle className="h-3 w-3" />
          {uncertainCount}
        </span>
      )}
      <span className="ml-auto text-[11px] text-frankly-gray">
        {attrCount} attr{attrCount === 1 ? "" : "s"}
      </span>
    </button>
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
