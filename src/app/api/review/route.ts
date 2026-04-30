import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuditUser, logAudit } from "@/lib/audit";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "pending";
  const insurerId = searchParams.get("insurerId");
  const benefitTypeId = searchParams.get("benefitTypeId");

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

  if (status !== "all") {
    query = query.eq("status", status);
  }

  if (benefitTypeId) {
    query = query.eq("benefit_type_id", benefitTypeId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let benefits = data ?? [];

  if (insurerId) {
    benefits = benefits.filter((b: Record<string, unknown>) => {
      const doc = b.source_documents as Record<string, unknown> | null;
      return doc && doc.insurer_id === insurerId;
    });
  }

  const allData = data ?? [];
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  const stats = {
    totalPending: allData.filter((b: Record<string, unknown>) => b.status === "pending").length,
    approvedToday: allData.filter(
      (b: Record<string, unknown>) =>
        b.status === "approved" &&
        typeof b.reviewed_at === "string" &&
        b.reviewed_at >= todayStart
    ).length,
    rejectedToday: allData.filter(
      (b: Record<string, unknown>) =>
        b.status === "rejected" &&
        typeof b.reviewed_at === "string" &&
        b.reviewed_at >= todayStart
    ).length,
  };

  return NextResponse.json({ benefits, stats });
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { benefitId, action, edits, rejectReason, reason, sourcePage } = body as {
      benefitId: string;
      action: "approve" | "reject" | "edit" | "reconsider";
      edits?: {
        benefit_name?: string;
        description?: string;
        key_features?: string[];
        exclusions?: string[];
        reviewer_notes?: string;
        attributes?: {
          id?: string;
          attribute_name: string;
          attribute_value: string;
          attribute_unit: string | null;
        }[];
        deletedAttributeIds?: string[];
      };
      rejectReason?: string;
      reason?: string;
      sourcePage?: "review" | "database";
    };

    if (!benefitId || !action) {
      return NextResponse.json(
        { error: "benefitId and action are required" },
        { status: 400 }
      );
    }

    const user = await getAuditUser();
    const reviewedAt = new Date().toISOString();
    const auditPage = sourcePage ?? "review";

    if (action === "approve") {
      const { data: before } = await supabase
        .from("product_benefits")
        .select("status, reviewed_at")
        .eq("id", benefitId)
        .single();

      const update: Record<string, unknown> = {
        status: "approved",
        reviewed_at: reviewedAt,
      };
      if (user.id) {
        update.reviewed_by = user.id;
        update.updated_by = user.id;
        update.updated_at = reviewedAt;
      }

      const { error } = await supabase
        .from("product_benefits")
        .update(update)
        .eq("id", benefitId);

      if (error) throw error;

      await logAudit(
        supabase,
        {
          table_name: "product_benefits",
          record_id: benefitId,
          action: "approve",
          old_values: before ? { status: before.status } : null,
          new_values: { status: "approved" },
          changed_fields: ["status"],
          reason: reason ?? null,
          source_page: auditPage,
        },
        user
      );

      return NextResponse.json({ success: true, status: "approved" });
    }

    if (action === "reject") {
      const { data: before } = await supabase
        .from("product_benefits")
        .select("status, rejection_reason")
        .eq("id", benefitId)
        .single();

      const rejectUpdate: Record<string, unknown> = {
        status: "rejected",
        reviewed_at: reviewedAt,
      };
      if (rejectReason) rejectUpdate.rejection_reason = rejectReason;
      if (user.id) {
        rejectUpdate.reviewed_by = user.id;
        rejectUpdate.updated_by = user.id;
        rejectUpdate.updated_at = reviewedAt;
      }

      const { error } = await supabase
        .from("product_benefits")
        .update(rejectUpdate)
        .eq("id", benefitId);

      if (error) {
        console.error("[review] Reject failed:", error.message, error.details);
        if (error.message?.includes("column") || error.code === "PGRST204") {
          const { error: retryError } = await supabase
            .from("product_benefits")
            .update({ status: "rejected" })
            .eq("id", benefitId);
          if (retryError) throw retryError;
          return NextResponse.json({
            success: true,
            status: "rejected",
            note: "Some columns may be missing — run the migration SQL",
          });
        }
        throw error;
      }

      await logAudit(
        supabase,
        {
          table_name: "product_benefits",
          record_id: benefitId,
          action: "reject",
          old_values: before ? { status: before.status } : null,
          new_values: { status: "rejected", rejection_reason: rejectReason ?? null },
          changed_fields: ["status", "rejection_reason"],
          reason: rejectReason ?? reason ?? null,
          source_page: auditPage,
        },
        user
      );

      return NextResponse.json({ success: true, status: "rejected" });
    }

    if (action === "reconsider") {
      const { data: before } = await supabase
        .from("product_benefits")
        .select("status, rejection_reason")
        .eq("id", benefitId)
        .single();

      const update: Record<string, unknown> = {
        status: "pending",
        reviewed_at: null,
      };
      if (user.id) {
        update.updated_by = user.id;
        update.updated_at = reviewedAt;
      }

      const { error } = await supabase
        .from("product_benefits")
        .update(update)
        .eq("id", benefitId);

      if (error) throw error;

      await logAudit(
        supabase,
        {
          table_name: "product_benefits",
          record_id: benefitId,
          action: "reconsider",
          old_values: before
            ? { status: before.status, rejection_reason: before.rejection_reason }
            : null,
          new_values: { status: "pending" },
          changed_fields: ["status"],
          reason: reason ?? null,
          source_page: auditPage,
        },
        user
      );

      return NextResponse.json({ success: true, status: "pending" });
    }

    if (action === "edit") {
      if (!edits) {
        return NextResponse.json(
          { error: "edits are required for edit action" },
          { status: 400 }
        );
      }

      const { data: current } = await supabase
        .from("product_benefits")
        .select("*")
        .eq("id", benefitId)
        .single();

      const benefitUpdate: Record<string, unknown> = {};

      // Approve-on-edit only when explicitly editing a pending benefit (review page).
      // From database page, we keep the existing status.
      if (auditPage === "review" && current?.status === "pending") {
        benefitUpdate.status = "approved";
        benefitUpdate.reviewed_at = reviewedAt;
        if (user.id) benefitUpdate.reviewed_by = user.id;
      }
      if (user.id) {
        benefitUpdate.updated_by = user.id;
        benefitUpdate.updated_at = reviewedAt;
      }

      const corrections: { field_name: string; original_value: string | null; corrected_value: string | null }[] = [];
      const auditOld: Record<string, unknown> = {};
      const auditNew: Record<string, unknown> = {};
      const changedFields: string[] = [];

      function track(field: string, oldVal: unknown, newVal: unknown) {
        const a = JSON.stringify(oldVal ?? null);
        const b = JSON.stringify(newVal ?? null);
        if (a === b) return false;
        auditOld[field] = oldVal ?? null;
        auditNew[field] = newVal ?? null;
        changedFields.push(field);
        return true;
      }

      if (edits.benefit_name !== undefined) {
        if (current && edits.benefit_name !== current.benefit_name) {
          corrections.push({
            field_name: "benefit_name",
            original_value: current.benefit_name,
            corrected_value: edits.benefit_name,
          });
          track("benefit_name", current.benefit_name, edits.benefit_name);
        }
        benefitUpdate.benefit_name = edits.benefit_name;
      }
      if (edits.description !== undefined) {
        if (current && edits.description !== current.description) {
          corrections.push({
            field_name: "description",
            original_value: current.description,
            corrected_value: edits.description,
          });
          track("description", current.description, edits.description);
        }
        benefitUpdate.description = edits.description;
      }
      if (edits.key_features !== undefined) {
        const origStr = JSON.stringify(current?.key_features ?? []);
        const newStr = JSON.stringify(edits.key_features);
        if (origStr !== newStr) {
          corrections.push({
            field_name: "key_features",
            original_value: origStr,
            corrected_value: newStr,
          });
          track("key_features", current?.key_features ?? [], edits.key_features);
        }
        benefitUpdate.key_features = edits.key_features;
      }
      if (edits.exclusions !== undefined) {
        const origStr = JSON.stringify(current?.exclusions ?? []);
        const newStr = JSON.stringify(edits.exclusions);
        if (origStr !== newStr) {
          corrections.push({
            field_name: "exclusions",
            original_value: origStr,
            corrected_value: newStr,
          });
          track("exclusions", current?.exclusions ?? [], edits.exclusions);
        }
        benefitUpdate.exclusions = edits.exclusions;
      }
      if (edits.reviewer_notes !== undefined) {
        if (current && edits.reviewer_notes !== current.reviewer_notes) {
          track("reviewer_notes", current.reviewer_notes, edits.reviewer_notes);
        }
        benefitUpdate.reviewer_notes = edits.reviewer_notes;
      }

      if (Object.keys(benefitUpdate).length > 0) {
        const { error: benefitError } = await supabase
          .from("product_benefits")
          .update(benefitUpdate)
          .eq("id", benefitId);
        if (benefitError) throw benefitError;
      }

      if (edits.deletedAttributeIds && edits.deletedAttributeIds.length > 0) {
        const { data: deletedAttrs } = await supabase
          .from("benefit_attributes")
          .select("attribute_name, attribute_value")
          .in("id", edits.deletedAttributeIds);

        if (deletedAttrs) {
          for (const da of deletedAttrs) {
            corrections.push({
              field_name: `attribute:${(da as Record<string, string>).attribute_name}`,
              original_value: (da as Record<string, string>).attribute_value,
              corrected_value: null,
            });
            changedFields.push(`attribute:${(da as Record<string, string>).attribute_name}`);
          }
        }

        await supabase
          .from("benefit_attributes")
          .delete()
          .in("id", edits.deletedAttributeIds);
      }

      if (edits.attributes) {
        const existingIds = edits.attributes.filter((a) => a.id).map((a) => a.id!);
        const { data: origAttrs } = existingIds.length > 0
          ? await supabase.from("benefit_attributes").select("*").in("id", existingIds)
          : { data: [] };
        const origMap = new Map(
          (origAttrs ?? []).map((a: Record<string, string>) => [a.id, a])
        );

        for (const attr of edits.attributes) {
          if (attr.id) {
            const orig = origMap.get(attr.id) as Record<string, string> | undefined;
            if (orig && orig.attribute_value !== attr.attribute_value) {
              corrections.push({
                field_name: `attribute:${attr.attribute_name}`,
                original_value: orig.attribute_value,
                corrected_value: attr.attribute_value,
              });
              changedFields.push(`attribute:${attr.attribute_name}`);
            }
            const attrUpdate: Record<string, unknown> = {
              attribute_name: attr.attribute_name,
              attribute_value: attr.attribute_value,
              attribute_unit: attr.attribute_unit,
            };
            if (user.id) {
              attrUpdate.updated_by = user.id;
              attrUpdate.updated_at = reviewedAt;
            }
            await supabase.from("benefit_attributes").update(attrUpdate).eq("id", attr.id);
          } else {
            corrections.push({
              field_name: `attribute:${attr.attribute_name}`,
              original_value: null,
              corrected_value: attr.attribute_value,
            });
            changedFields.push(`attribute:${attr.attribute_name}`);
            const attrInsert: Record<string, unknown> = {
              product_benefit_id: benefitId,
              attribute_name: attr.attribute_name,
              attribute_value: attr.attribute_value,
              attribute_unit: attr.attribute_unit,
            };
            if (user.id) attrInsert.created_by = user.id;
            await supabase.from("benefit_attributes").insert(attrInsert);
          }
        }
      }

      if (corrections.length > 0) {
        await supabase.from("corrections").insert(
          corrections.map((c) => ({
            product_benefit_id: benefitId,
            field_name: c.field_name,
            original_value: c.original_value,
            corrected_value: c.corrected_value,
            corrected_by: user.id ?? null,
          }))
        );
      }

      await logAudit(
        supabase,
        {
          table_name: "product_benefits",
          record_id: benefitId,
          action: current?.status === "pending" ? "approve" : "update",
          old_values: Object.keys(auditOld).length > 0 ? auditOld : null,
          new_values: Object.keys(auditNew).length > 0 ? auditNew : null,
          changed_fields: changedFields,
          reason: reason ?? null,
          source_page: auditPage,
        },
        user
      );

      return NextResponse.json({
        success: true,
        status: benefitUpdate.status ?? current?.status ?? "approved",
        corrections_logged: corrections.length,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
