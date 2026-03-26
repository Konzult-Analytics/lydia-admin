import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

  // Filter by insurer (nested join, must filter client-side)
  if (insurerId) {
    benefits = benefits.filter((b: Record<string, unknown>) => {
      const doc = b.source_documents as Record<string, unknown> | null;
      return doc && doc.insurer_id === insurerId;
    });
  }

  // Stats are computed from unfiltered data
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
    const { benefitId, action, edits, rejectReason } = body as {
      benefitId: string;
      action: "approve" | "reject" | "edit";
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
    };

    if (!benefitId || !action) {
      return NextResponse.json(
        { error: "benefitId and action are required" },
        { status: 400 }
      );
    }

    const reviewedAt = new Date().toISOString();

    if (action === "approve") {
      const { error } = await supabase
        .from("product_benefits")
        .update({ status: "approved", reviewed_at: reviewedAt })
        .eq("id", benefitId);

      if (error) throw error;
      return NextResponse.json({ success: true, status: "approved" });
    }

    if (action === "reject") {
      // Build update — only include optional columns if they have values
      const rejectUpdate: Record<string, unknown> = { status: "rejected" };
      if (rejectReason) rejectUpdate.rejection_reason = rejectReason;
      rejectUpdate.reviewed_at = reviewedAt;

      const { error } = await supabase
        .from("product_benefits")
        .update(rejectUpdate)
        .eq("id", benefitId);

      if (error) {
        console.error("[review] Reject failed:", error.message, error.details);
        // If the error is about missing columns, retry with just status
        if (error.message?.includes("column") || error.code === "PGRST204") {
          const { error: retryError } = await supabase
            .from("product_benefits")
            .update({ status: "rejected" })
            .eq("id", benefitId);
          if (retryError) throw retryError;
          return NextResponse.json({ success: true, status: "rejected", note: "Some columns may be missing — run the migration SQL" });
        }
        throw error;
      }
      return NextResponse.json({ success: true, status: "rejected" });
    }

    if (action === "edit") {
      if (!edits) {
        return NextResponse.json(
          { error: "edits are required for edit action" },
          { status: 400 }
        );
      }

      // Fetch current benefit for corrections
      const { data: current } = await supabase
        .from("product_benefits")
        .select("*")
        .eq("id", benefitId)
        .single();

      // Build update & track corrections
      const benefitUpdate: Record<string, unknown> = {
        status: "approved",
        reviewed_at: reviewedAt,
      };
      const corrections: { field_name: string; original_value: string | null; corrected_value: string | null }[] = [];

      if (edits.benefit_name !== undefined) {
        if (current && edits.benefit_name !== current.benefit_name) {
          corrections.push({
            field_name: "benefit_name",
            original_value: current.benefit_name,
            corrected_value: edits.benefit_name,
          });
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
        }
        benefitUpdate.description = edits.description;
      }
      if (edits.key_features !== undefined) {
        const origStr = JSON.stringify(current?.key_features ?? []);
        const newStr = JSON.stringify(edits.key_features);
        if (origStr !== newStr) {
          corrections.push({ field_name: "key_features", original_value: origStr, corrected_value: newStr });
        }
        benefitUpdate.key_features = edits.key_features;
      }
      if (edits.exclusions !== undefined) {
        const origStr = JSON.stringify(current?.exclusions ?? []);
        const newStr = JSON.stringify(edits.exclusions);
        if (origStr !== newStr) {
          corrections.push({ field_name: "exclusions", original_value: origStr, corrected_value: newStr });
        }
        benefitUpdate.exclusions = edits.exclusions;
      }
      if (edits.reviewer_notes !== undefined) {
        benefitUpdate.reviewer_notes = edits.reviewer_notes;
      }

      const { error: benefitError } = await supabase
        .from("product_benefits")
        .update(benefitUpdate)
        .eq("id", benefitId);

      if (benefitError) throw benefitError;

      // Delete removed attributes
      if (edits.deletedAttributeIds && edits.deletedAttributeIds.length > 0) {
        // Log deletions
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
          }
        }

        await supabase
          .from("benefit_attributes")
          .delete()
          .in("id", edits.deletedAttributeIds);
      }

      // Upsert attributes
      if (edits.attributes) {
        // Fetch originals for correction tracking
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
            }
            await supabase
              .from("benefit_attributes")
              .update({
                attribute_name: attr.attribute_name,
                attribute_value: attr.attribute_value,
                attribute_unit: attr.attribute_unit,
              })
              .eq("id", attr.id);
          } else {
            corrections.push({
              field_name: `attribute:${attr.attribute_name}`,
              original_value: null,
              corrected_value: attr.attribute_value,
            });
            await supabase.from("benefit_attributes").insert({
              product_benefit_id: benefitId,
              attribute_name: attr.attribute_name,
              attribute_value: attr.attribute_value,
              attribute_unit: attr.attribute_unit,
            });
          }
        }
      }

      // Log corrections
      if (corrections.length > 0) {
        await supabase.from("corrections").insert(
          corrections.map((c) => ({
            product_benefit_id: benefitId,
            field_name: c.field_name,
            original_value: c.original_value,
            corrected_value: c.corrected_value,
          }))
        );
      }

      return NextResponse.json({
        success: true,
        status: "approved",
        corrections_logged: corrections.length,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
