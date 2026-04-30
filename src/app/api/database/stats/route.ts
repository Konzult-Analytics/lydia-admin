import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const [benefitsRes, insurersRes, productsRes, lastApprovalRes] = await Promise.all([
      supabase
        .from("product_benefits")
        .select("status, product_id, source_documents!inner(insurer_id)"),
      supabase.from("insurers").select("id"),
      supabase.from("products").select("id"),
      supabase
        .from("product_benefits")
        .select("reviewed_at")
        .eq("status", "approved")
        .not("reviewed_at", "is", null)
        .order("reviewed_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const allBenefits = (benefitsRes.data ?? []) as unknown as Array<{
      status: string;
      product_id: string;
      source_documents: { insurer_id: string } | { insurer_id: string }[] | null;
    }>;

    const total = allBenefits.length;
    const approved = allBenefits.filter((b) => b.status === "approved").length;
    const pending = allBenefits.filter((b) => b.status === "pending").length;
    const rejected = allBenefits.filter((b) => b.status === "rejected").length;

    const insurersWithApproved = new Set<string>();
    const productsWithApproved = new Set<string>();
    for (const b of allBenefits) {
      if (b.status !== "approved") continue;
      productsWithApproved.add(b.product_id);
      const sd = b.source_documents;
      const insurerId = Array.isArray(sd) ? sd[0]?.insurer_id : sd?.insurer_id;
      if (insurerId) insurersWithApproved.add(insurerId);
    }

    const totalInsurers = insurersRes.data?.length ?? 0;
    const totalProducts = productsRes.data?.length ?? 0;

    const completionPercent =
      totalInsurers > 0 ? Math.round((insurersWithApproved.size / totalInsurers) * 100) : 0;

    return NextResponse.json({
      stats: {
        total_benefits: total,
        approved,
        pending,
        rejected,
        insurers_with_data: insurersWithApproved.size,
        total_insurers: totalInsurers,
        products_with_data: productsWithApproved.size,
        total_products: totalProducts,
        completion_percent: completionPercent,
        last_approved_at: lastApprovalRes.data?.reviewed_at ?? null,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
