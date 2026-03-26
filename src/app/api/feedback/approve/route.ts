import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { messageId, queryType, whatMakesItGood } = (await request.json()) as {
      messageId: string;
      queryType?: string;
      whatMakesItGood?: string;
    };

    if (!messageId) {
      return NextResponse.json({ error: "messageId is required" }, { status: 400 });
    }

    // Fetch the assistant message
    const { data: assistantMsg, error: msgError } = await supabase
      .from("chat_messages")
      .select("id, session_id, content, created_at")
      .eq("id", messageId)
      .eq("role", "assistant")
      .single();

    if (msgError || !assistantMsg) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Fetch the preceding user message
    const { data: userMsgs } = await supabase
      .from("chat_messages")
      .select("content")
      .eq("session_id", assistantMsg.session_id)
      .eq("role", "user")
      .lt("created_at", assistantMsg.created_at)
      .order("created_at", { ascending: false })
      .limit(1);

    const userQuery = userMsgs?.[0]?.content ?? "Unknown query";

    // Create approved output
    const { error: insertError } = await supabase.from("approved_outputs").insert({
      user_query: userQuery,
      assistant_response: assistantMsg.content,
      query_type: queryType ?? "general",
      what_makes_it_good: whatMakesItGood ?? null,
      source_message_id: messageId,
    });

    if (insertError) throw insertError;

    // Update message feedback
    await supabase
      .from("chat_messages")
      .update({ feedback: "approved" })
      .eq("id", messageId);

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
