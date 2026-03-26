import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { messageId, fieldName, issue, correction } = (await request.json()) as {
      messageId: string;
      fieldName: string;
      issue: string;
      correction: string;
    };

    if (!messageId || !issue) {
      return NextResponse.json(
        { error: "messageId and issue are required" },
        { status: 400 }
      );
    }

    // Create correction record
    const { error: insertError } = await supabase.from("corrections").insert({
      field_name: fieldName || "chat_response",
      original_value: issue,
      corrected_value: correction || null,
    });

    if (insertError) throw insertError;

    // Update message feedback
    await supabase
      .from("chat_messages")
      .update({
        feedback: "flagged",
        feedback_note: issue,
      })
      .eq("id", messageId);

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
