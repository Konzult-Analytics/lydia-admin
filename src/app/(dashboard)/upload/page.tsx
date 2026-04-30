"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dropzone } from "@/components/upload/dropzone";
import {
  UploadStatus,
  type UploadStatusType,
} from "@/components/upload/upload-status";
import { ExtractionSettingsPanel } from "@/components/upload/extraction-settings";
import type { Insurer, Product, ExtractionSettings } from "@/types/database";

const DEFAULT_EXTRACTION_SETTINGS: ExtractionSettings = {
  sensitivity: "balanced",
  includeSubBenefits: true,
  flagUncertainties: true,
  attributeDetail: "detailed",
};

const DOCUMENT_TYPES = [
  { value: "product_guide", label: "Product Guide" },
  { value: "brochure", label: "Brochure" },
  { value: "technical_guide", label: "Technical Guide" },
  { value: "benefit_schedule", label: "Benefit Schedule" },
];

export default function UploadPage() {
  const supabase = createClient();

  const [insurers, setInsurers] = useState<Insurer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedInsurer, setSelectedInsurer] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatusType>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [benefitsCount, setBenefitsCount] = useState(0);
  const [settings, setSettings] = useState<ExtractionSettings>(DEFAULT_EXTRACTION_SETTINGS);

  useEffect(() => {
    async function fetchInsurers() {
      const { data, error } = await supabase
        .from("insurers")
        .select("id, name, short_name")
        .order("name");
      if (error) {
        toast.error("Failed to load insurers");
        return;
      }
      setInsurers(data ?? []);
    }
    fetchInsurers();
  }, [supabase]);

  useEffect(() => {
    if (!selectedInsurer) {
      setProducts([]);
      setSelectedProduct("");
      return;
    }
    async function fetchProducts() {
      const { data, error } = await supabase
        .from("products")
        .select("id, insurer_id, name, product_type")
        .eq("insurer_id", selectedInsurer)
        .order("name");
      if (error) {
        toast.error("Failed to load products");
        return;
      }
      setProducts(data ?? []);
      setSelectedProduct("");
    }
    fetchProducts();
  }, [selectedInsurer, supabase]);

  const handleFileSelect = useCallback((selected: File) => {
    setFile(selected);
    setStatus("idle");
    setErrorMessage("");
  }, []);

  const handleFileRemove = useCallback(() => {
    setFile(null);
    setStatus("idle");
    setErrorMessage("");
  }, []);

  const canUpload =
    selectedInsurer &&
    selectedProduct &&
    documentType &&
    file &&
    status === "idle";

  async function handleUpload() {
    if (!canUpload || !file) return;

    setStatus("uploading");
    setErrorMessage("");
    setBenefitsCount(0);

    try {
      const filePath = `${selectedInsurer}/${selectedProduct}/${file.name}`;
      const { error: storageError } = await supabase.storage
        .from("documents")
        .upload(filePath, file, { upsert: true });

      if (storageError)
        throw new Error(`Storage upload failed: ${storageError.message}`);

      const { data: doc, error: dbError } = await supabase
        .from("source_documents")
        .insert({
          product_id: selectedProduct,
          insurer_id: selectedInsurer,
          document_type: documentType,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          upload_status: "uploaded",
        })
        .select()
        .single();

      if (dbError)
        throw new Error(`Database insert failed: ${dbError.message}`);

      toast.success("File uploaded — starting extraction...");
      setStatus("processing");

      const response = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: doc.id, settings }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error ?? "Extraction failed");
      }

      const result = await response.json();
      setBenefitsCount(result.benefitsFound ?? 0);
      setStatus("complete");
      toast.success(
        `Extraction complete! ${result.benefitsFound} benefits found.`
      );
    } catch (err) {
      setStatus("failed");
      const msg =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setErrorMessage(msg);
      toast.error(msg);
    }
  }

  function resetForm() {
    setFile(null);
    setStatus("idle");
    setErrorMessage("");
    setBenefitsCount(0);
    setSelectedInsurer("");
    setSelectedProduct("");
    setDocumentType("");
  }

  const isLocked = status !== "idle";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-frankly-dark">
          Upload Document
        </h1>
        <p className="mt-1 text-sm text-frankly-gray">
          Upload insurance product documents for AI extraction
        </p>
      </div>

      <Card className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Select
            label="Insurer"
            value={selectedInsurer}
            onChange={setSelectedInsurer}
            options={insurers.map((i) => ({ value: i.id, label: i.name }))}
            placeholder="Select insurer..."
            disabled={isLocked}
          />
          <Select
            label="Product"
            value={selectedProduct}
            onChange={setSelectedProduct}
            options={products.map((p) => ({ value: p.id, label: p.name }))}
            placeholder={
              selectedInsurer ? "Select product..." : "Select insurer first"
            }
            disabled={!selectedInsurer || isLocked}
          />
          <Select
            label="Document Type"
            value={documentType}
            onChange={setDocumentType}
            options={DOCUMENT_TYPES}
            placeholder="Select type..."
            disabled={isLocked}
          />
        </div>

        <Dropzone
          file={file}
          onFileSelect={handleFileSelect}
          onFileRemove={handleFileRemove}
          disabled={isLocked}
        />

        <ExtractionSettingsPanel
          settings={settings}
          onChange={setSettings}
          disabled={isLocked}
        />

        <UploadStatus
          status={status}
          errorMessage={errorMessage}
          benefitsCount={benefitsCount}
          onRetry={resetForm}
        />

        <div className="flex justify-end gap-3">
          {(status === "complete" || status === "failed") && (
            <Button variant="outline" onClick={resetForm}>
              Upload Another
            </Button>
          )}
          {status === "complete" && (
            <Link
              href="/review"
              className="rounded-lg bg-frankly-green px-4 py-2 text-sm font-medium text-white hover:bg-frankly-green-hover transition-colors"
            >
              Go to Review
            </Link>
          )}
          {status === "idle" && (
            <Button onClick={handleUpload} disabled={!canUpload}>
              Upload &amp; Extract
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
