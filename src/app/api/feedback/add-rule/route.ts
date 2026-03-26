import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { ruleName, ruleText, importance, appliesTo } = (await request.json()) as {
      ruleName: string;
      ruleText: string;
      importance?: string;
      appliesTo?: string;
    };

    if (!ruleName || !ruleText) {
      return NextResponse.json(
        { error: "ruleName and ruleText are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("domain_rules")
      .insert({
        rule_name: ruleName,
        rule_text: ruleText,
        importance: importance ?? "medium",
        applies_to: appliesTo ?? "all",
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, rule: data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
