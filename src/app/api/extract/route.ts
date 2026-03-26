import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { extractText } from "unpdf";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const MAX_TEXT_LENGTH = 150_000;

// --- Benefit type inference ---

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

function inferBenefitType(benefitName: string): string {
  const n = benefitName.toLowerCase();

  // More specific matches first
  if (n.includes("premium") && n.includes("waiver")) return "PREMIUM_WAIVER";
  if (n.includes("premium") && n.includes("settlement")) return "OTHER";
  if (n.includes("retrenchment") || n.includes("debt instalment")) return "RETRENCHMENT";
  if (n.includes("child") && n.includes("expense")) return "CHILD_COVER";
  if (n.includes("child") && n.includes("additional")) return "CHILD_COVER";
  if (n.includes("tertiary") || n.includes("education")) return "EDUCATION";
  if (n.includes("accidental") && n.includes("death")) return "ACCIDENTAL_DEATH";

  // Core benefit types
  if (n.includes("death") || n.includes("life cover")) return "LIFE_COVER";
  if (n.includes("terminal")) return "TERM_ILL";
  if (n.includes("funeral")) return "FUNERAL_ADVANCE";
  if (n.includes("lump") && n.includes("disability")) return "LUMP_SUM_DISAB";
  if (n.includes("impairment")) return "FUNC_IMPAIR";
  if (n.includes("income") && n.includes("disability")) return "INCOME_DISAB";
  if (n.includes("severe") || n.includes("critical") || n.includes("dread")) return "SEVERE_ILL";
  if (n.includes("cancer")) return "CANCER_COVER";
  if (n.includes("heart") || n.includes("cardiac")) return "HEART_COVER";

  // Expense covers — specific before generic
  if (n.includes("temporary") && n.includes("expense")) return "TEMP_INCOME";
  if (n.includes("permanent") && n.includes("expense")) return "INCOME_PROT";
  if (n.includes("additional") && n.includes("expense")) return "SEVERE_ILL";

  if (n.includes("income protection") || n.includes("salary protection")) return "INCOME_PROT";
  if (n.includes("temporary income")) return "TEMP_INCOME";

  return "OTHER";
}

function resolveBenefitType(
  claudeValue: string | undefined,
  benefitName: string
): string {
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

// --- PDF text extraction ---

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

// --- Extraction prompt ---

const EXTRACTION_SYSTEM_PROMPT = `You are an expert insurance product analyst for the South African insurance market. Your job is to extract structured benefit information from insurance product document text.

Extract ALL benefits and their attributes into the following JSON format:

{
  "benefits": [
    {
      "benefit_name": "Name of the benefit (e.g., 'Life Cover', 'Terminal Illness', 'Income Protection')",
      "benefit_type_id": "One of: LIFE_COVER, TERM_ILL, FUNERAL_ADVANCE, LUMP_SUM_DISAB, FUNC_IMPAIR, INCOME_DISAB, SEVERE_ILL, CANCER_COVER, HEART_COVER, INCOME_PROT, TEMP_INCOME, OTHER",
      "description": "Brief description of what the benefit covers",
      "key_features": ["Feature 1", "Feature 2"],
      "exclusions": ["Exclusion 1", "Exclusion 2"],
      "source_page": "Page number or range where this benefit is described",
      "extraction_confidence": 0.95,
      "attributes": [
        {
          "attribute_name": "Name (e.g., 'Annual Limit', 'Excess', 'Waiting Period', 'Survival Period')",
          "attribute_value": "The value (e.g., 'R1,500 per year', 'R100', '6 months', '14 days')",
          "attribute_unit": "Unit if applicable (e.g., 'ZAR', 'months', '%')",
          "source_page": "Page reference if available"
        }
      ]
    }
  ]
}

Benefit type mapping:
- LIFE_COVER: Death benefit, life cover
- TERM_ILL: Terminal illness benefit
- FUNERAL_ADVANCE: Funeral advance/benefit
- LUMP_SUM_DISAB: Lump sum disability
- FUNC_IMPAIR: Functional impairment
- INCOME_DISAB: Income disability
- SEVERE_ILL: Severe/critical/dread disease
- CANCER_COVER: Cancer-specific cover
- HEART_COVER: Heart/cardiac-specific cover
- INCOME_PROT: Income protection
- TEMP_INCOME: Temporary income benefit
- OTHER: Any benefit that doesn't fit the above categories

Rules:
1. Extract EVERY benefit mentioned in the text — be thorough
2. For each benefit, capture ALL limits, excesses, waiting periods, co-payments, sub-limits, and conditions
3. Use consistent naming for benefits across documents
4. Preserve exact monetary values and percentages as stated in the document
5. If a benefit has tiered limits (e.g., different limits per visit vs per year), create separate attributes for each
6. Include key features as an array of short strings
7. Include exclusions as an array of short strings
8. Set extraction_confidence between 0 and 1 based on how clearly the information was stated in the text
9. Use the page markers (--- Page N ---) in the text for source_page references
10. Always include benefit_type_id — use OTHER if unsure
11. Return ONLY valid JSON, no additional text or markdown`;

// --- Route handler ---

export async function POST(request: NextRequest) {
  let documentId: string | undefined;

  try {
    const body = await request.json();
    documentId = body.documentId;

    if (!documentId) {
      return NextResponse.json(
        { error: "documentId is required" },
        { status: 400 }
      );
    }

    // 1. Fetch document record
    const { data: doc, error: docError } = await supabase
      .from("source_documents")
      .select("*")
      .eq("id", documentId)
      .single();

    if (docError || !doc) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // 2. Update status to processing
    await supabase
      .from("source_documents")
      .update({ upload_status: "processing" })
      .eq("id", documentId);

    // 3. Download PDF from Supabase Storage
    const { data: fileData, error: fileError } = await supabase.storage
      .from("documents")
      .download(doc.file_path);

    if (fileError || !fileData) {
      await markFailed(documentId, "Failed to download file from storage");
      return NextResponse.json(
        { error: "Failed to download file" },
        { status: 500 }
      );
    }

    // 4. Extract text from PDF
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
      const pdfMsg =
        pdfErr instanceof Error ? pdfErr.message : "Unknown PDF error";

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
      return NextResponse.json(
        { error: `Failed to parse PDF: ${pdfMsg}` },
        { status: 422 }
      );
    }

    console.log(
      `[extract] Document ${documentId}: ${pdfSizeKB}KB PDF, ${numPages} pages, ${extractedText.length} chars extracted`
    );

    // 5. Check for empty/image-only PDFs
    if (extractedText.trim().length < 100) {
      await markFailed(
        documentId,
        "No meaningful text extracted — likely a scanned/image-only PDF"
      );
      return NextResponse.json(
        { error: "Could not extract text from this PDF. It may be a scanned document or contain only images. Please use a text-based PDF." },
        { status: 422 }
      );
    }

    // 6. Truncate if too long
    let textToSend = extractedText;
    let truncated = false;
    let estimatedPagesIncluded = numPages;

    if (extractedText.length > MAX_TEXT_LENGTH) {
      textToSend = extractedText.substring(0, MAX_TEXT_LENGTH);
      truncated = true;
      estimatedPagesIncluded = Math.round(
        numPages * (MAX_TEXT_LENGTH / extractedText.length)
      );
      console.log(
        `[extract] Document ${documentId}: Truncated from ${extractedText.length} to ${MAX_TEXT_LENGTH} chars (~${estimatedPagesIncluded} of ${numPages} pages)`
      );
    }

    const truncationNote = truncated
      ? `\n\nNOTE: This document was truncated. Only the first ~${MAX_TEXT_LENGTH.toLocaleString()} characters (approximately ${estimatedPagesIncluded} of ${numPages} pages) are included. Extract what you can from this portion.`
      : "";

    // 7. Call Claude API with extracted text
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Please analyze this insurance product document and extract all benefits.\n\nDOCUMENT TEXT (${numPages} pages):\n${textToSend}${truncationNote}`,
        },
      ],
    });

    // 8. Parse Claude's response
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
      return NextResponse.json(
        { error: "Failed to parse extraction results" },
        { status: 500 }
      );
    }

    // 9. Save extracted benefits and attributes
    const claudeBenefitCount = extracted.benefits?.length ?? 0;
    let savedCount = 0;
    let failedCount = 0;
    const saveErrors: string[] = [];

    for (const benefit of extracted.benefits ?? []) {
      const benefitTypeId = resolveBenefitType(
        benefit.benefit_type_id,
        benefit.benefit_name
      );

      try {
        const { data: savedBenefit, error: benefitError } = await supabase
          .from("product_benefits")
          .insert({
            product_id: doc.product_id,
            source_document_id: documentId,
            benefit_name: benefit.benefit_name,
            benefit_type_id: benefitTypeId,
            description: benefit.description ?? null,
            key_features: benefit.key_features ?? null,
            exclusions: benefit.exclusions ?? null,
            source_page: benefit.source_page ?? null,
            extraction_confidence: benefit.extraction_confidence ?? null,
            status: "pending",
          })
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

        // Save attributes
        const attributes = (benefit.attributes ?? []).map((attr) => ({
          product_benefit_id: savedBenefit.id,
          attribute_name: attr.attribute_name,
          attribute_value: attr.attribute_value,
          attribute_unit: attr.attribute_unit ?? null,
          source_page: attr.source_page ?? null,
        }));

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
        console.error(
          `[extract] Exception saving benefit "${benefit.benefit_name}":`,
          errMsg
        );
      }
    }

    // 10. Update document status
    await supabase
      .from("source_documents")
      .update({ upload_status: "processed" })
      .eq("id", documentId);

    // 11. Create extraction log
    await supabase.from("extraction_log").insert({
      source_document_id: documentId,
      extraction_type: "benefit_extraction",
      benefits_found: savedCount,
      raw_extraction: {
        ...extracted,
        _meta: {
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

    console.log(
      `[extract] Document ${documentId}: Claude extracted ${claudeBenefitCount}, saved ${savedCount}, failed ${failedCount} (${message.usage?.input_tokens ?? 0} input / ${message.usage?.output_tokens ?? 0} output tokens)`
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
      },
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Unknown error";
    console.error("Extraction error:", errMsg);

    if (documentId) {
      await markFailed(documentId, errMsg);
    }

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
