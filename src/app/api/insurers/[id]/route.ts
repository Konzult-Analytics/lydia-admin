import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuditUser, logAudit } from "@/lib/audit";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = (await request.json()) as { name?: string; short_name?: string };

    const updates: Record<string, unknown> = {};
    if (typeof body.name === "string") updates.name = body.name.trim();
    if (typeof body.short_name === "string") updates.short_name = body.short_name.trim();

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    const { data: before } = await supabase
      .from("insurers")
      .select("name, short_name")
      .eq("id", id)
      .single();

    const { error } = await supabase.from("insurers").update(updates).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const user = await getAuditUser();
    await logAudit(
      supabase,
      {
        table_name: "insurers",
        record_id: id,
        action: "update",
        old_values: before,
        new_values: updates,
        changed_fields: Object.keys(updates),
        source_page: "system",
      },
      user
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { count } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("insurer_id", id);

    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { error: `Cannot delete: insurer has ${count} product(s). Remove products first.` },
        { status: 409 }
      );
    }

    const { data: before } = await supabase
      .from("insurers")
      .select("name")
      .eq("id", id)
      .single();

    const { error } = await supabase.from("insurers").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const user = await getAuditUser();
    await logAudit(
      supabase,
      {
        table_name: "insurers",
        record_id: id,
        action: "delete",
        old_values: before,
        source_page: "system",
      },
      user
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
