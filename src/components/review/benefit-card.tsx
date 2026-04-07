"use client";

import { Check, Eye, FileText, Gauge, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ReviewStatus } from "@/types/database";

export interface BenefitAttribute {
  id: string;
  product_benefit_id: string;
  attribute_name: string;
  attribute_value: string;
  attribute_unit: string | null;
  source_page: string | null;
}

export interface BenefitWithDetails {
  id: string;
  benefit_name: string;
  description: string | null;
  key_features: string[] | null;
  exclusions: string[] | null;
  source_page: string | null;
  extraction_confidence: number | null;
  status: ReviewStatus;
  reviewer_notes: string | null;
  reviewed_at: string | null;
  created_at?: string;
  benefit_attributes: BenefitAttribute[];
  benefit_types: { id: string; name: string; category_id: string | null } | null;
  source_documents: {
    id: string;
    file_name: string;
    document_type: string;
    insurer_id: string;
    created_at: string;
    insurers: { id: string; name: string; short_name: string } | null;
    products: { id: string; name: string; product_type: string } | null;
  } | null;
}

interface BenefitCardProps {
  benefit: BenefitWithDetails;
  onViewDetails: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  disabled?: boolean;
}

export function BenefitCard({
  benefit,
  onViewDetails,
  onApprove,
  onReject,
  disabled = false,
}: BenefitCardProps) {
  const doc = benefit.source_documents;
  const confidence = benefit.extraction_confidence;
  const confidencePercent = confidence !== null ? Math.round(confidence * 100) : null;
  const isPending = benefit.status === "pending";
  const attrCount = benefit.benefit_attributes.length;

  return (
    <div className="rounded-xl border border-border bg-surface shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4 px-5 py-4">
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-frankly-dark truncate">
              {benefit.benefit_name}
            </h3>
            <Badge variant={benefit.status}>{benefit.status}</Badge>
            {benefit.benefit_types && (
              <span className="text-xs text-frankly-gray bg-frankly-gray-light px-2 py-0.5 rounded-full">
                {benefit.benefit_types.name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-frankly-gray flex-wrap">
            {doc && (
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {doc.insurers?.short_name ?? doc.insurers?.name}
                {doc.products?.name && ` / ${doc.products.name}`}
              </span>
            )}
            {doc && (
              <span className="text-frankly-gray/50 truncate max-w-48">
                {doc.file_name}
              </span>
            )}
            {benefit.source_page && <span>p. {benefit.source_page}</span>}
            {attrCount > 0 && (
              <span>
                {attrCount} attr{attrCount === 1 ? "" : "s"}
              </span>
            )}
          </div>
        </div>

        {/* Confidence + actions */}
        <div className="flex items-center gap-3 shrink-0">
          {confidencePercent !== null && (
            <div className="flex items-center gap-1.5 mr-1">
              <Gauge className="h-4 w-4 text-frankly-gray" />
              <span
                className={cn(
                  "text-sm font-semibold tabular-nums",
                  confidencePercent >= 90
                    ? "text-frankly-green"
                    : confidencePercent >= 70
                      ? "text-amber-600"
                      : "text-red-500"
                )}
              >
                {confidencePercent}%
              </span>
            </div>
          )}

          {isPending && (
            <>
              <Button
                variant="ghost"
                onClick={() => onReject(benefit.id)}
                disabled={disabled}
                className="h-8 w-8 px-0 py-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                title="Reject"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                onClick={() => onApprove(benefit.id)}
                disabled={disabled}
                className="h-8 w-8 px-0 py-0 text-frankly-green hover:text-frankly-green-hover hover:bg-frankly-green-light"
                title="Approve"
              >
                <Check className="h-4 w-4" />
              </Button>
            </>
          )}

          <Button
            variant="outline"
            onClick={() => onViewDetails(benefit.id)}
            className="gap-1.5 text-xs px-3 py-1.5"
          >
            <Eye className="h-3.5 w-3.5" />
            Details
          </Button>
        </div>
      </div>
    </div>
  );
}
