import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { extractText } from "unpdf";
import { getAuditUser, logAudit } from "@/lib/audit";
import type { ExtractionSettings } from "@/types/database";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const MAX_TEXT_LENGTH = 150_000;

const VALID_BENEFIT_TYPES = [
  "LIFE_COVER",
  "TERM_ILL",
  "FUNERAL_ADVANCE",
  "LUMP_SUM_DISAB",
  "FUNC_IMPAIR",
  "INCOME_DISAB",
  "SEVERE_ILL",
  "CANCER_COVER",
  "HEART_COVER",
  "INCOME_PROT",
  "TEMP_INCOME",
  "PREMIUM_WAIVER",
  "RETRENCHMENT",
  "CHILD_COVER",
  "EDUCATION",
  "ACCIDENTAL_DEATH",
  "OTHER",
] as const;

const DEFAULT_SETTINGS: ExtractionSettings = {
  sensitivity: "balanced",
  includeSubBenefits: true,
  flagUncertainties: true,
  attributeDetail: "detailed",
};

function inferBenefitType(benefitName: string): string {
  const n = benefitName.toLowerCase();
  if (n.includes("premium") && n.includes("waiver")) return "PREMIUM_WAIVER";
  if (n.includes("premium") && n.includes("settlement")) return "OTHER";
  if (n.includes("retrenchment") || n.includes("debt instalment")) return "RETRENCHMENT";
  if (n.includes("child") && n.includes("expense")) return "CHILD_COVER";
  if (n.includes("child") && n.includes("additional")) return "CHILD_COVER";
  if (n.includes("tertiary") || n.includes("education")) return "EDUCATION";
  if (n.includes("accidental") && n.includes("death")) return "ACCIDENTAL_DEATH";
  if (n.includes("death") || n.includes("life cover")) return "LIFE_COVER";
  if (n.includes("terminal")) return "TERM_ILL";
  if (n.includes("funeral")) return "FUNERAL_ADVANCE";
  if (n.includes("lump") && n.includes("disability")) return "LUMP_SUM_DISAB";
  if (n.includes("impairment")) return "FUNC_IMPAIR";
  if (n.includes("income") && n.includes("disability")) return "INCOME_DISAB";
  if (n.includes("severe") || n.includes("critical") || n.includes("dread")) return "SEVERE_ILL";
  if (n.includes("cancer")) return "CANCER_COVER";
  if (n.includes("heart") || n.includes("cardiac")) return "HEART_COVER";
  if (n.includes("temporary") && n.includes("expense")) return "TEMP_INCOME";
  if (n.includes("permanent") && n.includes("expense")) return "INCOME_PROT";
  if (n.includes("additional") && n.includes("expense")) return "SEVERE_ILL";
  if (n.includes("income protection") || n.includes("salary protection")) return "INCOME_PROT";
  if (n.includes("temporary income")) return "TEMP_INCOME";
  return "OTHER";
}

function resolveBenefitType(claudeValue: string | undefined, benefitName: string): string {
  if (
    claudeValue &&
    VALID_BENEFIT_TYPES.includes(claudeValue as (typeof VALID_BENEFIT_TYPES)[number])
  ) {
    return claudeValue;
  }
  const inferred = inferBenefitType(benefitName);
  if (claudeValue) {
    console.warn(
      `[extract] Invalid benefit_type_id "${claudeValue}" from Claude for "${benefitName}", inferred "${inferred}"`
    );
  }
  return inferred;
}

async function extractTextFromPDF(
  buffer: Buffer
): Promise<{ text: string; numPages: number }> {
  const uint8Array = new Uint8Array(buffer);
  const result = await extractText(uint8Array, { mergePages: false });
  let fullText = "";
  const pages = result.text;
  if (pages.length > 0) {
    pages.forEach((pageText, index) => {
      fullText += `\n--- Page ${index + 1} ---\n${pageText}`;
    });
  }
  return { text: fullText, numPages: result.totalPages };
}

const BASE_PROMPT = `You are an expert insurance product analyst for the South African insurance market. Your job is to extract structured benefit information from insurance product document text.

Extract benefits and their attributes into the following JSON format:

{
  "benefits": [
    {
      "benefit_name": "Name of the benefit (e.g., 'Life Cover', 'Terminal Illness', 'Income Protection')",
      "benefit_type_id": "One of: LIFE_COVER, TERM_ILL, FUNERAL_ADVANCE, LUMP_SUM_DISAB, FUNC_IMPAIR, INCOME_DISAB, SEVERE_ILL, CANCER_COVER, HEART_COVER, INCOME_PROT, TEMP_INCOME, PREMIUM_WAIVER, RETRENCHMENT, CHILD_COVER, EDUCATION, ACCIDENTAL_DEATH, OTHER",
      "description": "Brief description of what the benefit covers",
      "key_features": ["Feature 1", "Feature 2"],
      "exclusions": ["Exclusion 1", "Exclusion 2"],
      "source_page": "Page number or range where this benefit is described",
      "extraction_confidence": 0.95,
      "uncertain_fields": ["fieldname1", "fieldname2"],
      "attributes": [
        {
          "attribute_name": "Name (e.g., 'Annual Limit', 'Excess', 'Waiting Period')",
          "attribute_value": "The value (e.g., 'R1,500 per year', '6 months')",
          "attribute_unit": "Unit if applicable (e.g., 'ZAR', 'months', '%')",
          "source_page": "Page reference if available"
        }
      ]
    }
  ]
}`;

function sensitivityRules(settings: ExtractionSettings): string {
  const lines: string[] = [];

  switch (settings.sensitivity) {
    case "conservative":
      lines.push(
        "EXTRACTION MODE: CONSERVATIVE — Only include benefits that are clearly and explicitly defined. Use a high confidence threshold (>= 0.80). Skip ambiguous mentions, optional add-ons, and anything where you are unsure. Prefer accuracy over coverage."
      );
      break;
    case "thorough":
      lines.push(
        "EXTRACTION MODE: THOROUGH — Extract every potential benefit, sub-benefit, variation, and optional add-on. Lower confidence threshold (>= 0.40) is acceptable. Even include benefits with incomplete details — list any uncertain fields under 'uncertain_fields'. Prefer coverage over accuracy."
      );
      break;
    default:
      lines.push(
        "EXTRACTION MODE: BALANCED — Extract benefits with reasonable confidence (>= 0.60). Include the main benefits and clearly described sub-benefits. Skip highly speculative or unsupported mentions."
      );
  }

  if (!settings.includeSubBenefits) {
    lines.push(
      "Do NOT extract sub-benefits as separate entries. Roll variations into the parent benefit's description and attributes."
    );
  } else {
    lines.push("Extract sub-benefits and variations as separate entries when distinct.");
  }

  switch (settings.attributeDetail) {
    case "basic":
      lines.push(
        "Attribute detail: BASIC — capture only the headline attributes (e.g., main limit, waiting period). Skip minor sub-limits."
      );
      break;
    case "comprehensive":
      lines.push(
        "Attribute detail: COMPREHENSIVE — capture every limit, sub-limit, excess, waiting period, co-payment, tier, and condition mentioned, no matter how minor."
      );
      break;
    default:
      lines.push(
        "Attribute detail: DETAILED — capture all material limits, excesses, waiting periods, co-payments, sub-limits, and conditions."
      );
  }

  if (settings.flagUncertainties) {
    lines.push(
      "For any benefit where a field is unclear or assumed, list those field names in the 'uncertain_fields' array (e.g., ['waiting_period', 'attribute:Annual Limit']). Leave the array empty when nothing is uncertain."
    );
  } else {
    lines.push("You may omit the 'uncertain_fields' array.");
  }

  return lines.join("\n");
}

function buildSystemPrompt(settings: ExtractionSettings): string {
  return `${BASE_PROMPT}

${sensitivityRules(settings)}

Common rules:
1. Use consistent benefit naming across documents.
2. Preserve exact monetary values and percentages as stated.
3. For tiered limits (per visit vs per year), create separate attributes.
4. Use the page markers (--- Page N ---) for source_page references.
5. Always include benefit_type_id — use OTHER if unsure.
6. Return ONLY valid JSON, no additional text or markdown.`;
}

export async function POST(request: NextRequest) {
  let documentId: string | undefined;

  try {
    const body = await request.json();
    documentId = body.documentId;
    const inputSettings: Partial<ExtractionSettings> | undefined = body.settings;

    if (!documentId) {
      return NextResponse.json({ error: "documentId is required" }, { status: 400 });
    }

    const settings: ExtractionSettings = {
      ...DEFAULT_SETTINGS,
      ...(inputSettings ?? {}),
    };

    const auditUser = await getAuditUser();

    const { data: doc, error: docError } = await supabase
      .from("source_documents")
      .select("*")
      .eq("id", documentId)
      .single();

    if (docError || !doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    await supabase
      .from("source_documents")
      .update({
        upload_status: "processing",
        extraction_settings: settings,
      })
      .eq("id", documentId);

    const { data: fileData, error: fileError } = await supabase.storage
      .from("documents")
      .download(doc.file_path);

    if (fileError || !fileData) {
      await markFailed(documentId, "Failed to download file from storage");
      return NextResponse.json({ error: "Failed to download file" }, { status: 500 });
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const pdfSizeKB = Math.round(buffer.length / 1024);

    let extractedText: string;
    let numPages: number;

    try {
      const result = await extractTextFromPDF(buffer);
      extractedText = result.text;
      numPages = result.numPages;
    } catch (pdfErr) {
      const pdfMsg = pdfErr instanceof Error ? pdfErr.message : "Unknown PDF error";
      if (pdfMsg.toLowerCase().includes("password")) {
        await markFailed(documentId, "PDF is password-protected");
        return NextResponse.json(
          { error: "This PDF is password-protected. Please remove the password and try again." },
          { status: 422 }
        );
      }
      if (pdfMsg.toLowerCase().includes("invalid") || pdfMsg.toLowerCase().includes("corrupt")) {
        await markFailed(documentId, `Invalid PDF: ${pdfMsg}`);
        return NextResponse.json(
          { error: "This file appears to be corrupted or is not a valid PDF." },
          { status: 422 }
        );
      }
      await markFailed(documentId, `PDF parse error: ${pdfMsg}`);
      return NextResponse.json({ error: `Failed to parse PDF: ${pdfMsg}` }, { status: 422 });
    }

    console.log(
      `[extract] Document ${documentId}: ${pdfSizeKB}KB PDF, ${numPages} pages, ${extractedText.length} chars extracted, sensitivity=${settings.sensitivity}`
    );

    if (extractedText.trim().length < 100) {
      await markFailed(documentId, "No meaningful text extracted — likely a scanned/image-only PDF");
      return NextResponse.json(
        { error: "Could not extract text from this PDF. It may be a scanned document or contain only images." },
        { status: 422 }
      );
    }

    let textToSend = extractedText;
    let truncated = false;
    let estimatedPagesIncluded = numPages;

    if (extractedText.length > MAX_TEXT_LENGTH) {
      textToSend = extractedText.substring(0, MAX_TEXT_LENGTH);
      truncated = true;
      estimatedPagesIncluded = Math.round(
        numPages * (MAX_TEXT_LENGTH / extractedText.length)
      );
    }

    const truncationNote = truncated
      ? `\n\nNOTE: This document was truncated. Only the first ~${MAX_TEXT_LENGTH.toLocaleString()} characters (approximately ${estimatedPagesIncluded} of ${numPages} pages) are included.`
      : "";

    await supabase
      .from("source_documents")
      .update({ page_count: numPages })
      .eq("id", documentId);

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      system: buildSystemPrompt(settings),
      messages: [
        {
          role: "user",
          content: `Please analyze this insurance product document and extract benefits.\n\nDOCUMENT TEXT (${numPages} pages):\n${textToSend}${truncationNote}`,
        },
      ],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    let extracted: {
      benefits: Array<{
        benefit_name: string;
        benefit_type_id?: string;
        description?: string;
        key_features?: string[];
        exclusions?: string[];
        source_page?: string;
        extraction_confidence?: number;
        uncertain_fields?: string[];
        attributes?: Array<{
          attribute_name: string;
          attribute_value: string;
          attribute_unit?: string;
          source_page?: string;
        }>;
      }>;
    };

    try {
      const jsonStr = responseText.replace(/```json\n?|\n?```/g, "").trim();
      extracted = JSON.parse(jsonStr);
    } catch {
      await markFailed(documentId, "Failed to parse Claude response as JSON");
      return NextResponse.json({ error: "Failed to parse extraction results" }, { status: 500 });
    }

    const claudeBenefitCount = extracted.benefits?.length ?? 0;
    let savedCount = 0;
    let failedCount = 0;
    const saveErrors: string[] = [];

    for (const benefit of extracted.benefits ?? []) {
      const benefitTypeId = resolveBenefitType(benefit.benefit_type_id, benefit.benefit_name);

      try {
        const insert: Record<string, unknown> = {
          product_id: doc.product_id,
          source_document_id: documentId,
          benefit_name: benefit.benefit_name,
          benefit_type_id: benefitTypeId,
          description: benefit.description ?? null,
          key_features: benefit.key_features ?? null,
          exclusions: benefit.exclusions ?? null,
          source_page: benefit.source_page ?? null,
          extraction_confidence: benefit.extraction_confidence ?? null,
          uncertain_fields:
            settings.flagUncertainties && benefit.uncertain_fields?.length
              ? benefit.uncertain_fields
              : null,
          status: "pending",
        };
        if (auditUser.id) insert.created_by = auditUser.id;

        const { data: savedBenefit, error: benefitError } = await supabase
          .from("product_benefits")
          .insert(insert)
          .select("id")
          .single();

        if (benefitError || !savedBenefit) {
          failedCount++;
          const errMsg = benefitError?.message ?? "No data returned";
          saveErrors.push(`"${benefit.benefit_name}": ${errMsg}`);
          console.error(
            `[extract] Failed to save benefit "${benefit.benefit_name}":`,
            errMsg
          );
          continue;
        }

        savedCount++;

        await logAudit(
          supabase,
          {
            table_name: "product_benefits",
            record_id: savedBenefit.id,
            action: "create",
            new_values: {
              benefit_name: benefit.benefit_name,
              benefit_type_id: benefitTypeId,
              source_document_id: documentId,
            },
            source_page: "upload",
            reason: `AI extraction (${settings.sensitivity})`,
          },
          auditUser
        );

        const attributes = (benefit.attributes ?? []).map((attr) => {
          const row: Record<string, unknown> = {
            product_benefit_id: savedBenefit.id,
            attribute_name: attr.attribute_name,
            attribute_value: attr.attribute_value,
            attribute_unit: attr.attribute_unit ?? null,
            source_page: attr.source_page ?? null,
          };
          if (auditUser.id) row.created_by = auditUser.id;
          return row;
        });

        if (attributes.length > 0) {
          const { error: attrError } = await supabase
            .from("benefit_attributes")
            .insert(attributes);
          if (attrError) {
            console.error(
              `[extract] Failed to save attributes for "${benefit.benefit_name}":`,
              attrError.message
            );
          }
        }
      } catch (err) {
        failedCount++;
        const errMsg = err instanceof Error ? err.message : "Unknown error";
        saveErrors.push(`"${benefit.benefit_name}": ${errMsg}`);
        console.error(`[extract] Exception saving benefit "${benefit.benefit_name}":`, errMsg);
      }
    }

    await supabase
      .from("source_documents")
      .update({ upload_status: "processed" })
      .eq("id", documentId);

    await supabase.from("extraction_log").insert({
      source_document_id: documentId,
      extraction_type: "benefit_extraction",
      benefits_found: savedCount,
      raw_extraction: {
        ...extracted,
        _meta: {
          settings,
          pdf_size_kb: pdfSizeKB,
          pages: numPages,
          text_length: extractedText.length,
          truncated,
          estimated_pages_included: estimatedPagesIncluded,
          input_tokens: message.usage?.input_tokens ?? 0,
          output_tokens: message.usage?.output_tokens ?? 0,
          claude_extracted: claudeBenefitCount,
          saved: savedCount,
          failed: failedCount,
          save_errors: saveErrors.length > 0 ? saveErrors : undefined,
        },
      },
    });

    await logAudit(
      supabase,
      {
        table_name: "source_documents",
        record_id: documentId,
        action: "extract",
        new_values: {
          settings,
          benefits_saved: savedCount,
          benefits_failed: failedCount,
        },
        source_page: "upload",
      },
      auditUser
    );

    console.log(
      `[extract] Document ${documentId}: Claude extracted ${claudeBenefitCount}, saved ${savedCount}, failed ${failedCount}`
    );

    return NextResponse.json({
      success: true,
      benefitsFound: savedCount,
      documentId,
      meta: {
        pages: numPages,
        textLength: extractedText.length,
        truncated,
        claudeExtracted: claudeBenefitCount,
        saved: savedCount,
        failed: failedCount,
        settings,
      },
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Unknown error";
    console.error("Extraction error:", errMsg);
    if (documentId) await markFailed(documentId, errMsg);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}

async function markFailed(documentId: string, errorMessage: string) {
  await supabase
    .from("source_documents")
    .update({ upload_status: "failed" })
    .eq("id", documentId);

  await supabase.from("extraction_log").insert({
    source_document_id: documentId,
    extraction_type: "benefit_extraction",
    benefits_found: 0,
    raw_extraction: { error: errorMessage },
  });
}
