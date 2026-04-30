import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SIGNED_URL_TTL_SECONDS = 60 * 5; // 5 minutes

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data: doc, error: docError } = await supabase
    .from("source_documents")
    .select("file_path, file_name")
    .eq("id", id)
    .single();

  if (docError || !doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }
  if (!doc.file_path) {
    return NextResponse.json({ error: "Document has no file" }, { status: 404 });
  }

  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(doc.file_path, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { error: error?.message ?? "Could not generate signed URL" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    url: data.signedUrl,
    fileName: doc.file_name,
    expiresInSeconds: SIGNED_URL_TTL_SECONDS,
  });
}
