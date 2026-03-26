import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

function buildSystemPrompt(
  rules: { rule_name: string; rule_text: string; importance: string }[],
  corrections: { field_name: string; original_value: string; corrected_value: string }[],
  approvedOutputs: { user_query: string; assistant_response: string }[],
  insurers: { name: string }[],
  products: { name: string; insurer_name: string }[]
) {
  let prompt = `You are Lydia, an independent insurance research assistant for South African financial advisors.

YOUR ROLE
You help advisors compare insurance products objectively. You NEVER recommend one insurer over another — you present facts and let the advisor decide.

`;

  if (rules.length > 0) {
    prompt += `CRITICAL RULES\n`;
    rules.forEach((r, i) => {
      prompt += `${i + 1}. [${r.importance.toUpperCase()}] ${r.rule_name}: ${r.rule_text}\n`;
    });
    prompt += `\n`;
  }

  if (corrections.length > 0) {
    prompt += `CORRECTIONS TO REMEMBER (things you've gotten wrong before)\n`;
    corrections.slice(0, 10).forEach((c) => {
      prompt += `- ${c.field_name}: Was "${c.original_value}" → Correct: "${c.corrected_value}"\n`;
    });
    prompt += `\n`;
  }

  if (approvedOutputs.length > 0) {
    prompt += `EXAMPLE OF GOOD OUTPUT\n`;
    approvedOutputs.slice(0, 2).forEach((ao, i) => {
      prompt += `--- Example ${i + 1} ---\nUser: ${ao.user_query}\nLydia: ${ao.assistant_response}\n---\n\n`;
    });
  }

  prompt += `AVAILABLE DATA\nYou have access to information about these insurers: ${insurers.map((i) => i.name).join(", ") || "None loaded yet"}.\n`;
  if (products.length > 0) {
    prompt += `Products: ${products.map((p) => `${p.name} (${p.insurer_name})`).join(", ")}.\n`;
  }

  prompt += `
If the user asks about products/benefits you have data for, use it.
If you don't have specific data, say so clearly — don't make things up.

RESPONSE FORMAT
When comparing benefits:
- Start with a summary table
- Explain key differences for each insurer
- Note any important considerations
- Always cite source documents and pages when referencing specific facts
- End with a reminder that the advisor makes the final recommendation

When answering general questions:
- Be clear and concise
- Use plain language
- If you're uncertain, say so`;

  return prompt;
}

export async function POST(request: NextRequest) {
  try {
    const { sessionId, message } = (await request.json()) as {
      sessionId: string | null;
      message: string;
    };

    if (!message?.trim()) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    // 1. Create or fetch session
    let activeSessionId = sessionId;
    if (!activeSessionId) {
      const title = message.length > 60 ? message.slice(0, 60) + "..." : message;
      const { data: session, error } = await supabase
        .from("chat_sessions")
        .insert({ title })
        .select("id")
        .single();
      if (error) throw new Error(`Failed to create session: ${error.message}`);
      activeSessionId = session.id;
    }

    // 2. Save user message
    await supabase.from("chat_messages").insert({
      session_id: activeSessionId,
      role: "user",
      content: message,
    });

    // 3. Fetch context
    const [rulesRes, correctionsRes, approvedRes, insurersRes, productsRes, historyRes] =
      await Promise.all([
        supabase
          .from("domain_rules")
          .select("rule_name, rule_text, importance")
          .eq("is_active", true)
          .order("importance"),
        supabase
          .from("corrections")
          .select("field_name, original_value, corrected_value")
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("approved_outputs")
          .select("user_query, assistant_response")
          .order("created_at", { ascending: false })
          .limit(2),
        supabase.from("insurers").select("name").order("name"),
        supabase
          .from("products")
          .select("name, insurers:insurer_id ( name )")
          .order("name"),
        supabase
          .from("chat_messages")
          .select("role, content")
          .eq("session_id", activeSessionId)
          .order("created_at", { ascending: true })
          .limit(20),
      ]);

    const rules = rulesRes.data ?? [];
    const corrections = correctionsRes.data ?? [];
    const approvedOutputs = approvedRes.data ?? [];
    const insurers = insurersRes.data ?? [];
    const products = (productsRes.data ?? []).map((p: Record<string, unknown>) => ({
      name: p.name as string,
      insurer_name: (p.insurers as Record<string, string> | null)?.name ?? "Unknown",
    }));

    // 4. Build messages history for Claude
    const history = (historyRes.data ?? []).map((m: Record<string, string>) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    // 5. Fetch relevant benefit data if message mentions specific terms
    let benefitContext = "";
    const lowerMsg = message.toLowerCase();
    const matchedInsurers = insurers.filter(
      (i: Record<string, string>) => lowerMsg.includes(i.name.toLowerCase())
    );
    if (matchedInsurers.length > 0) {
      const { data: benefits } = await supabase
        .from("product_benefits")
        .select(`
          benefit_name, description, key_features, exclusions,
          benefit_attributes ( attribute_name, attribute_value, attribute_unit ),
          products:product_id ( name, insurer_id ),
          source_documents:source_document_id ( file_name )
        `)
        .eq("status", "approved")
        .limit(50);

      if (benefits && benefits.length > 0) {
        benefitContext = "\n\nRELEVANT BENEFIT DATA:\n" +
          benefits
            .map((b: Record<string, unknown>) => {
              const attrs = (b.benefit_attributes as Record<string, string>[]) ?? [];
              const attrStr = attrs.map((a) => `  ${a.attribute_name}: ${a.attribute_value}${a.attribute_unit ? " " + a.attribute_unit : ""}`).join("\n");
              const prod = b.products as Record<string, string> | null;
              const doc = b.source_documents as Record<string, string> | null;
              return `${b.benefit_name} (${prod?.name ?? "Unknown product"})${doc ? ` [Source: ${doc.file_name}]` : ""}\n  ${b.description ?? "No description"}\n${attrStr}`;
            })
            .join("\n\n");
      }
    }

    const systemPrompt = buildSystemPrompt(rules, corrections, approvedOutputs, insurers, products) + benefitContext;

    // 6. Call Claude
    const claudeResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      messages: history,
    });

    const responseText =
      claudeResponse.content[0].type === "text" ? claudeResponse.content[0].text : "";

    // 7. Save assistant message
    const { data: savedMsg, error: saveError } = await supabase
      .from("chat_messages")
      .insert({
        session_id: activeSessionId,
        role: "assistant",
        content: responseText,
      })
      .select("id")
      .single();

    if (saveError) throw new Error(`Failed to save response: ${saveError.message}`);

    return NextResponse.json({
      sessionId: activeSessionId,
      messageId: savedMsg.id,
      content: responseText,
      usage: {
        input_tokens: claudeResponse.usage?.input_tokens ?? 0,
        output_tokens: claudeResponse.usage?.output_tokens ?? 0,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("Chat error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
