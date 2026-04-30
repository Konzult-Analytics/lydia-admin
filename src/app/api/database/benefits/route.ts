import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const insurerId = searchParams.get("insurerId");
  const productId = searchParams.get("productId");
  const benefitTypeId = searchParams.get("benefitTypeId");
  const search = searchParams.get("q")?.toLowerCase().trim();
  const since = searchParams.get("since");
  const until = searchParams.get("until");
  const reviewerId = searchParams.get("reviewerId");

  let query = supabase
    .from("product_benefits")
    .select(
      `
      *,
      benefit_attributes (*),
      benefit_types:benefit_type_id ( id, name, category_id ),
      source_documents:source_document_id (
        id, file_name, document_type, insurer_id, product_id, created_at,
        insurers:insurer_id ( id, name, short_name ),
        products:product_id ( id, name, product_type )
      )
    `
    )
    .order("created_at", { ascending: false });

  if (status && status !== "all") query = query.eq("status", status);
  if (productId) query = query.eq("product_id", productId);
  if (benefitTypeId) query = query.eq("benefit_type_id", benefitTypeId);
  if (since) query = query.gte("created_at", since);
  if (until) query = query.lte("created_at", until);
  if (reviewerId) query = query.eq("reviewed_by", reviewerId);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let benefits = (data ?? []) as Array<Record<string, unknown>>;

  if (insurerId) {
    benefits = benefits.filter((b) => {
      const doc = b.source_documents as Record<string, unknown> | null;
      return doc && doc.insurer_id === insurerId;
    });
  }

  if (search) {
    benefits = benefits.filter((b) => {
      const name = String(b.benefit_name ?? "").toLowerCase();
      const desc = String(b.description ?? "").toLowerCase();
      return name.includes(search) || desc.includes(search);
    });
  }

  return NextResponse.json({ benefits });
}
