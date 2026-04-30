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
    const body = (await request.json()) as {
      action: "mark_reviewed" | "mark_needs_review" | "set_current" | "set_version" | "set_review_notes";
      version?: string;
      notes?: string;
    };

    const user = await getAuditUser();
    const now = new Date().toISOString();
    const updates: Record<string, unknown> = {};
    let auditAction: "mark_reviewed" | "update" = "update";
    const changedFields: string[] = [];

    switch (body.action) {
      case "mark_reviewed":
        updates.last_reviewed_at = now;
        if (user.id) updates.last_reviewed_by = user.id;
        updates.needs_review = false;
        auditAction = "mark_reviewed";
        changedFields.push("last_reviewed_at", "needs_review");
        break;
      case "mark_needs_review":
        updates.needs_review = true;
        changedFields.push("needs_review");
        break;
      case "set_current":
        updates.is_current = true;
        changedFields.push("is_current");
        break;
      case "set_version":
        if (typeof body.version === "string") {
          updates.document_version = body.version;
          changedFields.push("document_version");
        }
        break;
      case "set_review_notes":
        if (typeof body.notes === "string") {
          updates.review_notes = body.notes;
          changedFields.push("review_notes");
        }
        break;
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No updates specified" }, { status: 400 });
    }

    const { error } = await supabase.from("source_documents").update(updates).eq("id", id);
    if (error) throw error;

    await logAudit(
      supabase,
      {
        table_name: "source_documents",
        record_id: id,
        action: auditAction,
        new_values: updates,
        changed_fields: changedFields,
        source_page: "documents",
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
    const { data: doc } = await supabase
      .from("source_documents")
      .select("file_path, file_name")
      .eq("id", id)
      .single();

    if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

    const user = await getAuditUser();

    // Cascade: clear benefits' link, then delete document + storage file.
    // We don't hard-delete benefits — keep the audit trail.
    await supabase
      .from("product_benefits")
      .update({ source_document_id: null })
      .eq("source_document_id", id);

    await supabase.from("source_documents").delete().eq("id", id);
    if (doc.file_path) {
      await supabase.storage.from("documents").remove([doc.file_path]);
    }

    await logAudit(
      supabase,
      {
        table_name: "source_documents",
        record_id: id,
        action: "delete",
        old_values: { file_name: doc.file_name },
        source_page: "documents",
      },
      user
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
