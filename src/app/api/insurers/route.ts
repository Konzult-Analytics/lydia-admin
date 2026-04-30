import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuditUser, logAudit } from "@/lib/audit";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { data, error } = await supabase
    .from("insurers")
    .select("*, products(id)")
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const insurers = (data ?? []).map(
    (row: Record<string, unknown> & { products?: { id: string }[] | null }) => ({
      id: row.id,
      name: row.name,
      short_name: row.short_name,
      product_count: row.products?.length ?? 0,
    })
  );

  return NextResponse.json({ insurers });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { id?: string; name: string; short_name?: string };
    const { name, short_name } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const id = body.id?.trim() || slugify(name);
    const insertRow = {
      id,
      name: name.trim(),
      short_name: short_name?.trim() || name.trim(),
    };

    const { data, error } = await supabase.from("insurers").insert(insertRow).select().single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const user = await getAuditUser();
    await logAudit(
      supabase,
      {
        table_name: "insurers",
        record_id: data.id,
        action: "create",
        new_values: insertRow,
        source_page: "system",
      },
      user
    );

    return NextResponse.json({ insurer: data });
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
