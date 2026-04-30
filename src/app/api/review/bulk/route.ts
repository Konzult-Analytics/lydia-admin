import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuditUser, logAudit } from "@/lib/audit";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      ids: string[];
      action: "approve" | "reject" | "reconsider";
      rejectReason?: string;
      reason?: string;
      sourcePage?: string;
    };

    const { ids, action } = body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids array is required" }, { status: 400 });
    }
    if (!["approve", "reject", "reconsider"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const user = await getAuditUser();
    const now = new Date().toISOString();
    const sourcePage =
      body.sourcePage === "review" || body.sourcePage === "database"
        ? body.sourcePage
        : "database";

    const update: Record<string, unknown> = {};
    const actionLabel: "approve" | "reject" | "reconsider" = action;

    if (action === "approve") {
      update.status = "approved";
      update.reviewed_at = now;
      if (user.id) {
        update.reviewed_by = user.id;
        update.updated_by = user.id;
        update.updated_at = now;
      }
    } else if (action === "reject") {
      update.status = "rejected";
      update.reviewed_at = now;
      if (body.rejectReason) update.rejection_reason = body.rejectReason;
      if (user.id) {
        update.reviewed_by = user.id;
        update.updated_by = user.id;
        update.updated_at = now;
      }
    } else {
      update.status = "pending";
      update.reviewed_at = null;
      if (user.id) {
        update.updated_by = user.id;
        update.updated_at = now;
      }
    }

    const { error } = await supabase.from("product_benefits").update(update).in("id", ids);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log one audit row per benefit (parallel best-effort; never blocks the call)
    await Promise.all(
      ids.map((id) =>
        logAudit(
          supabase,
          {
            table_name: "product_benefits",
            record_id: id,
            action: actionLabel,
            new_values: { status: update.status },
            changed_fields: ["status"],
            reason: body.rejectReason ?? body.reason ?? `Bulk ${actionLabel}`,
            source_page: sourcePage as "review" | "database",
          },
          user
        )
      )
    );

    return NextResponse.json({ success: true, count: ids.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
