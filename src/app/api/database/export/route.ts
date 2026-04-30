import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface BenefitRow {
  id: string;
  benefit_name: string;
  description: string | null;
  status: string;
  source_page: string | null;
  extraction_confidence: number | null;
  reviewer_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  benefit_types: { id: string; name: string } | null;
  benefit_attributes: { attribute_name: string; attribute_value: string; attribute_unit: string | null }[];
  source_documents: {
    file_name: string;
    insurers: { name: string } | null;
    products: { name: string } | null;
  } | null;
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const insurerId = searchParams.get("insurerId");

  let query = supabase
    .from("product_benefits")
    .select(
      `
      id, benefit_name, description, status, source_page, extraction_confidence,
      reviewer_notes, reviewed_at, created_at,
      benefit_types:benefit_type_id ( id, name ),
      benefit_attributes ( attribute_name, attribute_value, attribute_unit ),
      source_documents:source_document_id (
        file_name, insurer_id,
        insurers:insurer_id ( name ),
        products:product_id ( name )
      )
    `
    )
    .order("created_at", { ascending: false });

  if (status && status !== "all") query = query.eq("status", status);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let rows = (data ?? []) as unknown as BenefitRow[];

  if (insurerId) {
    rows = rows.filter((b) => {
      const doc = b.source_documents as unknown as { insurer_id?: string } | null;
      return doc && doc.insurer_id === insurerId;
    });
  }

  const header = [
    "Insurer",
    "Product",
    "Benefit Name",
    "Benefit Type",
    "Status",
    "Description",
    "Attributes",
    "Source Document",
    "Source Page",
    "Confidence",
    "Reviewer Notes",
    "Reviewed At",
    "Created At",
  ];

  const lines: string[] = [header.map(csvEscape).join(",")];

  for (const r of rows) {
    const insurer = r.source_documents?.insurers?.name ?? "";
    const product = r.source_documents?.products?.name ?? "";
    const file = r.source_documents?.file_name ?? "";
    const type = r.benefit_types?.name ?? "";
    const attrs = (r.benefit_attributes ?? [])
      .map((a) =>
        `${a.attribute_name}: ${a.attribute_value}${a.attribute_unit ? ` ${a.attribute_unit}` : ""}`
      )
      .join("; ");
    lines.push(
      [
        insurer,
        product,
        r.benefit_name,
        type,
        r.status,
        r.description ?? "",
        attrs,
        file,
        r.source_page ?? "",
        r.extraction_confidence ?? "",
        r.reviewer_notes ?? "",
        r.reviewed_at ?? "",
        r.created_at,
      ]
        .map(csvEscape)
        .join(",")
    );
  }

  const csv = lines.join("\r\n");
  const filename = `lydia-benefits-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
