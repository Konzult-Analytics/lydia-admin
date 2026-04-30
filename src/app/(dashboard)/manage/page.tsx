"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Building2,
  Package,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { InsurerForm } from "@/components/manage/insurer-form";
import { ProductForm } from "@/components/manage/product-form";
import type { Insurer } from "@/types/database";
import { cn } from "@/lib/utils";

interface ManagedInsurer extends Insurer {
  product_count: number;
}

interface ManagedProduct {
  id: string;
  insurer_id: string;
  name: string;
  product_type: string;
  insurers: { id: string; name: string; short_name: string } | null;
  benefit_count: number;
  approved_count: number;
}

type Tab = "insurers" | "products";

export default function ManagePage() {
  const [tab, setTab] = useState<Tab>("insurers");
  const [insurers, setInsurers] = useState<ManagedInsurer[]>([]);
  const [products, setProducts] = useState<ManagedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [insurerFilter, setInsurerFilter] = useState("");

  const [editingInsurer, setEditingInsurer] = useState<ManagedInsurer | null>(null);
  const [addingInsurer, setAddingInsurer] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ManagedProduct | null>(null);
  const [addingProduct, setAddingProduct] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [iRes, pRes] = await Promise.all([
        fetch("/api/insurers"),
        fetch("/api/products"),
      ]);
      const iData = await iRes.json();
      const pData = await pRes.json();
      setInsurers(iData.insurers ?? []);
      setProducts(pData.products ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function deleteInsurer(insurer: ManagedInsurer) {
    if (insurer.product_count > 0) {
      toast.error("Remove this insurer's products first");
      return;
    }
    if (!confirm(`Delete insurer "${insurer.name}"?`)) return;
    setBusy(insurer.id);
    try {
      const res = await fetch(`/api/insurers/${insurer.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed");
      }
      toast.success("Insurer deleted");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  async function deleteProduct(product: ManagedProduct) {
    if (product.benefit_count > 0) {
      toast.error("This product has benefits — reject or reassign them first");
      return;
    }
    if (!confirm(`Delete product "${product.name}"?`)) return;
    setBusy(product.id);
    try {
      const res = await fetch(`/api/products/${product.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed");
      }
      toast.success("Product deleted");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  const filteredProducts = useMemo(
    () => (insurerFilter ? products.filter((p) => p.insurer_id === insurerFilter) : products),
    [products, insurerFilter]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-frankly-dark">Manage</h1>
          <p className="mt-1 text-sm text-frankly-gray">
            Add insurers and products before uploading their documents.
          </p>
        </div>
        <Button variant="ghost" onClick={load} disabled={loading} className="gap-1.5">
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <div className="flex border-b border-border">
        <TabButton active={tab === "insurers"} onClick={() => setTab("insurers")} icon={<Building2 className="h-4 w-4" />}>
          Insurers ({insurers.length})
        </TabButton>
        <TabButton active={tab === "products"} onClick={() => setTab("products")} icon={<Package className="h-4 w-4" />}>
          Products ({products.length})
        </TabButton>
      </div>

      {tab === "insurers" ? (
        <Card padding="sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-frankly-gray">All insurers in the database</p>
            <Button onClick={() => setAddingInsurer(true)} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Add Insurer
            </Button>
          </div>
          {loading ? (
            <Loader2 className="mx-auto my-8 h-6 w-6 animate-spin text-frankly-green" />
          ) : insurers.length === 0 ? (
            <p className="py-8 text-center text-sm text-frankly-gray">
              No insurers yet. Add your first one to begin.
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-frankly-gray-light">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-frankly-gray uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-frankly-gray uppercase tracking-wider">
                      Short
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-frankly-gray uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-frankly-gray uppercase tracking-wider">
                      Products
                    </th>
                    <th className="w-32" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {insurers.map((i) => (
                    <tr key={i.id}>
                      <td className="px-3 py-2 text-frankly-dark font-medium">{i.name}</td>
                      <td className="px-3 py-2 text-frankly-gray">{i.short_name}</td>
                      <td className="px-3 py-2 font-mono text-xs text-frankly-gray">{i.id}</td>
                      <td className="px-3 py-2 text-right text-frankly-dark">{i.product_count}</td>
                      <td className="px-2 py-2 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => setEditingInsurer(i)}
                            disabled={busy === i.id}
                            className="rounded p-1 text-frankly-gray hover:bg-frankly-gray-light hover:text-frankly-dark"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteInsurer(i)}
                            disabled={busy === i.id || i.product_count > 0}
                            className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
                            title={i.product_count > 0 ? "Has products" : "Delete"}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : (
        <Card padding="sm">
          <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
            <Select
              value={insurerFilter}
              onChange={setInsurerFilter}
              options={insurers.map((i) => ({ value: i.id, label: i.name }))}
              placeholder="All insurers"
              className="w-56"
            />
            <Button
              onClick={() => setAddingProduct(true)}
              className="gap-1.5"
              disabled={insurers.length === 0}
            >
              <Plus className="h-4 w-4" />
              Add Product
            </Button>
          </div>
          {loading ? (
            <Loader2 className="mx-auto my-8 h-6 w-6 animate-spin text-frankly-green" />
          ) : filteredProducts.length === 0 ? (
            <p className="py-8 text-center text-sm text-frankly-gray">
              {insurers.length === 0
                ? "Add at least one insurer first."
                : "No products yet."}
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-frankly-gray-light">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-frankly-gray uppercase tracking-wider">
                      Insurer
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-frankly-gray uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-frankly-gray uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-frankly-gray uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-frankly-gray uppercase tracking-wider">
                      Benefits
                    </th>
                    <th className="w-32" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {filteredProducts.map((p) => (
                    <tr key={p.id}>
                      <td className="px-3 py-2 text-frankly-gray">
                        {p.insurers?.name ?? p.insurer_id}
                      </td>
                      <td className="px-3 py-2 text-frankly-dark font-medium">{p.name}</td>
                      <td className="px-3 py-2 text-frankly-gray capitalize">
                        {p.product_type.replace(/_/g, " ")}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-frankly-gray">{p.id}</td>
                      <td className="px-3 py-2 text-right text-frankly-dark">
                        {p.benefit_count}
                        {p.approved_count > 0 && (
                          <span className="text-frankly-green ml-1.5 text-xs">
                            ({p.approved_count} ✓)
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => setEditingProduct(p)}
                            disabled={busy === p.id}
                            className="rounded p-1 text-frankly-gray hover:bg-frankly-gray-light hover:text-frankly-dark"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteProduct(p)}
                            disabled={busy === p.id || p.benefit_count > 0}
                            className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
                            title={p.benefit_count > 0 ? "Has benefits" : "Delete"}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {addingInsurer && (
        <InsurerForm
          onClose={() => setAddingInsurer(false)}
          onSaved={() => {
            setAddingInsurer(false);
            load();
            toast.success("Insurer added");
          }}
        />
      )}
      {editingInsurer && (
        <InsurerForm
          initial={editingInsurer}
          onClose={() => setEditingInsurer(null)}
          onSaved={() => {
            setEditingInsurer(null);
            load();
            toast.success("Insurer saved");
          }}
        />
      )}
      {addingProduct && (
        <ProductForm
          insurers={insurers}
          defaultInsurerId={insurerFilter}
          onClose={() => setAddingProduct(false)}
          onSaved={() => {
            setAddingProduct(false);
            load();
            toast.success("Product added");
          }}
        />
      )}
      {editingProduct && (
        <ProductForm
          insurers={insurers}
          initial={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSaved={() => {
            setEditingProduct(null);
            load();
            toast.success("Product saved");
          }}
        />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
        active
          ? "border-frankly-green text-frankly-green"
          : "border-transparent text-frankly-gray hover:text-frankly-dark"
      )}
    >
      {icon}
      {children}
    </button>
  );
}
