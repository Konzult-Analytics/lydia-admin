import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  // TODO: Handle document upload
  // - Validate file type and size
  // - Upload to Supabase Storage
  // - Create record in documents table
  return NextResponse.json({ message: "Upload endpoint ready" }, { status: 200 });
}
