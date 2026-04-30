import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const insurerId = searchParams.get("insurerId");
  const documentType = searchParams.get("documentType");
  const status = searchParams.get("status");

  let query = supabase
    .from("source_documents")
    .select(
      `
      *,
      insurers:insurer_id ( id, name, short_name ),
      products:product_id ( id, name, product_type )
    `
    )
    .order("created_at", { ascending: false });

  if (insurerId) query = query.eq("insurer_id", insurerId);
  if (documentType) query = query.eq("document_type", documentType);
  if (status) query = query.eq("upload_status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const documents = data ?? [];

  // Per-document benefit counts (single round trip)
  const ids = documents.map((d: { id: string }) => d.id);
  let counts = new Map<string, { total: number; approved: number; pending: number; rejected: number }>();
  if (ids.length > 0) {
    const { data: benefitRows } = await supabase
      .from("product_benefits")
      .select("source_document_id, status")
      .in("source_document_id", ids);
    counts = new Map();
    for (const id of ids) counts.set(id, { total: 0, approved: 0, pending: 0, rejected: 0 });
    for (const b of (benefitRows ?? []) as Array<{ source_document_id: string; status: string }>) {
      const c = counts.get(b.source_document_id);
      if (!c) continue;
      c.total++;
      if (b.status === "approved") c.approved++;
      else if (b.status === "pending") c.pending++;
      else if (b.status === "rejected") c.rejected++;
    }
  }

  const enriched = documents.map((d: Record<string, unknown>) => ({
    ...d,
    benefit_counts: counts.get(d.id as string) ?? { total: 0, approved: 0, pending: 0, rejected: 0 },
  }));

  return NextResponse.json({ documents: enriched });
}
