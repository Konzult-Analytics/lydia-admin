import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuditUser, logAudit } from "@/lib/audit";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const insurerId = searchParams.get("insurerId");

  let query = supabase
    .from("products")
    .select(
      `
      *,
      insurers:insurer_id ( id, name, short_name ),
      product_benefits ( id, status )
    `
    )
    .order("name");

  if (insurerId) query = query.eq("insurer_id", insurerId);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const products = (data ?? []).map(
    (row: Record<string, unknown> & { product_benefits?: { status: string }[] | null }) => {
      const benefits = row.product_benefits ?? [];
      return {
        id: row.id,
        insurer_id: row.insurer_id,
        name: row.name,
        product_type: row.product_type,
        insurers: row.insurers,
        benefit_count: benefits.length,
        approved_count: benefits.filter((b) => b.status === "approved").length,
      };
    }
  );

  return NextResponse.json({ products });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      id?: string;
      insurer_id: string;
      name: string;
      product_type?: string;
    };

    const { insurer_id, name } = body;
    if (!insurer_id?.trim() || !name?.trim()) {
      return NextResponse.json(
        { error: "insurer_id and name are required" },
        { status: 400 }
      );
    }

    const id = body.id?.trim() || `${insurer_id}_${slugify(name)}`;
    const insertRow = {
      id,
      insurer_id: insurer_id.trim(),
      name: name.trim(),
      product_type: body.product_type?.trim() || "life",
    };

    const { data, error } = await supabase.from("products").insert(insertRow).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const user = await getAuditUser();
    await logAudit(
      supabase,
      {
        table_name: "products",
        record_id: data.id,
        action: "create",
        new_values: insertRow,
        source_page: "system",
      },
      user
    );

    return NextResponse.json({ product: data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);
}
