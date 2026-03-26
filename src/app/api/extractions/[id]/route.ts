import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data, error } = await supabase
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
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: error.code === "PGRST116" ? 404 : 500 });
  }

  return NextResponse.json({ benefit: data });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const {
      status,
      benefit_name,
      description,
      key_features,
      exclusions,
      rejection_reason,
    } = body as {
      status: "approved" | "rejected";
      benefit_name?: string;
      description?: string;
      key_features?: string[];
      exclusions?: string[];
      rejection_reason?: string;
    };

    if (!status) {
      return NextResponse.json({ error: "status is required" }, { status: 400 });
    }

    // Fetch current benefit for correction logging
    const { data: current, error: fetchError } = await supabase
      .from("product_benefits")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !current) {
      return NextResponse.json({ error: "Benefit not found" }, { status: 404 });
    }

    // Build update
    const update: Record<string, unknown> = {
      status,
      reviewed_at: new Date().toISOString(),
    };

    if (status === "rejected" && rejection_reason) {
      update.rejection_reason = rejection_reason;
    }

    // Track corrections for edited fields
    const corrections: { field_name: string; original_value: string | null; corrected_value: string | null }[] = [];

    if (benefit_name !== undefined && benefit_name !== current.benefit_name) {
      corrections.push({
        field_name: "benefit_name",
        original_value: current.benefit_name,
        corrected_value: benefit_name,
      });
      update.benefit_name = benefit_name;
    }
    if (description !== undefined && description !== current.description) {
      corrections.push({
        field_name: "description",
        original_value: current.description,
        corrected_value: description,
      });
      update.description = description;
    }
    if (key_features !== undefined) {
      const origStr = JSON.stringify(current.key_features ?? []);
      const newStr = JSON.stringify(key_features);
      if (origStr !== newStr) {
        corrections.push({
          field_name: "key_features",
          original_value: origStr,
          corrected_value: newStr,
        });
        update.key_features = key_features;
      }
    }
    if (exclusions !== undefined) {
      const origStr = JSON.stringify(current.exclusions ?? []);
      const newStr = JSON.stringify(exclusions);
      if (origStr !== newStr) {
        corrections.push({
          field_name: "exclusions",
          original_value: origStr,
          corrected_value: newStr,
        });
        update.exclusions = exclusions;
      }
    }

    // Apply update
    const { error: updateError } = await supabase
      .from("product_benefits")
      .update(update)
      .eq("id", id);

    if (updateError) throw updateError;

    // Log corrections
    if (corrections.length > 0) {
      const rows = corrections.map((c) => ({
        product_benefit_id: id,
        field_name: c.field_name,
        original_value: c.original_value,
        corrected_value: c.corrected_value,
      }));
      await supabase.from("corrections").insert(rows);
    }

    return NextResponse.json({
      success: true,
      status,
      corrections_logged: corrections.length,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
