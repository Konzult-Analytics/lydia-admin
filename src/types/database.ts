// Type definitions matching the Supabase schema.
// Regenerate with: npx supabase gen types typescript --project-id <your-project-id> > src/types/database.ts

export interface Insurer {
  id: string;
  name: string;
  short_name: string;
}

export interface Product {
  id: string;
  insurer_id: string;
  name: string;
  product_type: string;
}

export interface BenefitType {
  id: string;
  name: string;
  category_id: string | null;
}

export interface BenefitCategory {
  id: string;
  name: string;
}

export type DocumentType = "product_guide" | "brochure" | "technical_guide" | "benefit_schedule";
export type UploadStatus = "uploaded" | "processing" | "processed" | "failed";
export type ReviewStatus = "pending" | "approved" | "rejected";

export interface SourceDocument {
  id: string;
  insurer_id: string;
  product_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  document_type: DocumentType;
  upload_status: UploadStatus;
  uploaded_by: string | null;
  created_at: string;
}

export interface ProductBenefit {
  id: string;
  product_id: string;
  benefit_type_id: string | null;
  benefit_name: string;
  description: string | null;
  key_features: string[] | null;
  exclusions: string[] | null;
  source_document_id: string;
  source_page: string | null;
  extraction_confidence: number | null;
  status: ReviewStatus;
  rejection_reason: string | null;
  reviewer_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface BenefitAttribute {
  id: string;
  product_benefit_id: string;
  attribute_name: string;
  attribute_value: string;
  attribute_unit: string | null;
  source_page: string | null;
}

export interface Correction {
  id: string;
  product_benefit_id: string;
  field_name: string;
  original_value: string | null;
  corrected_value: string | null;
  corrected_by: string | null;
  created_at: string;
}

export interface ExtractionLog {
  id: string;
  source_document_id: string;
  extraction_type: string;
  benefits_found: number;
  raw_extraction: Record<string, unknown> | null;
}
