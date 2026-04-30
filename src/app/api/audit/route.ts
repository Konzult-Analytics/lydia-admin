import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const recordId = searchParams.get("recordId");
  const tableName = searchParams.get("tableName");
  const userId = searchParams.get("userId");
  const action = searchParams.get("action");
  const sourcePage = searchParams.get("sourcePage");
  const since = searchParams.get("since");
  const until = searchParams.get("until");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "200", 10) || 200, 1000);

  let query = supabase
    .from("audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (recordId) query = query.eq("record_id", recordId);
  if (tableName) query = query.eq("table_name", tableName);
  if (userId) query = query.eq("user_id", userId);
  if (action) query = query.eq("action", action);
  if (sourcePage) query = query.eq("source_page", sourcePage);
  if (since) query = query.gte("created_at", since);
  if (until) query = query.lte("created_at", until);

  const { data, error } = await query;

  if (error) {
    if (error.code === "42P01" || error.message?.includes("audit_log")) {
      return NextResponse.json({ entries: [], note: "audit_log table not yet created — run the migration." });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ entries: data ?? [] });
}
