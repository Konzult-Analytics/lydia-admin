import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: benefitId } = await params;

  try {
    const { attributes } = (await request.json()) as {
      attributes: {
        id?: string;
        attribute_name: string;
        attribute_value: string;
        attribute_unit: string | null;
        _delete?: boolean;
      }[];
    };

    if (!attributes || !Array.isArray(attributes)) {
      return NextResponse.json(
        { error: "attributes array is required" },
        { status: 400 }
      );
    }

    // Fetch current attributes for correction logging
    const { data: currentAttrs } = await supabase
      .from("benefit_attributes")
      .select("*")
      .eq("product_benefit_id", benefitId);

    const currentMap = new Map(
      (currentAttrs ?? []).map((a: Record<string, string>) => [a.id, a])
    );

    const corrections: { field_name: string; original_value: string | null; corrected_value: string | null }[] = [];

    for (const attr of attributes) {
      if (attr._delete && attr.id) {
        // Delete
        const orig = currentMap.get(attr.id);
        if (orig) {
          corrections.push({
            field_name: `attribute:${(orig as Record<string, string>).attribute_name}`,
            original_value: (orig as Record<string, string>).attribute_value,
            corrected_value: null,
          });
        }
        await supabase.from("benefit_attributes").delete().eq("id", attr.id);
      } else if (attr.id) {
        // Update existing
        const orig = currentMap.get(attr.id) as Record<string, string> | undefined;
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
        // Insert new
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

    // Log corrections
    if (corrections.length > 0) {
      const rows = corrections.map((c) => ({
        product_benefit_id: benefitId,
        field_name: c.field_name,
        original_value: c.original_value,
        corrected_value: c.corrected_value,
      }));
      await supabase.from("corrections").insert(rows);
    }

    return NextResponse.json({
      success: true,
      corrections_logged: corrections.length,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
