import { createClient as createServerClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export type AuditAction =
  | "create"
  | "update"
  | "approve"
  | "reject"
  | "reconsider"
  | "delete"
  | "extract"
  | "replace"
  | "mark_reviewed";

export type AuditSourcePage =
  | "upload"
  | "review"
  | "database"
  | "documents"
  | "activity"
  | "train"
  | "system";

export interface AuditPayload {
  table_name: string;
  record_id: string;
  action: AuditAction;
  old_values?: Record<string, unknown> | null;
  new_values?: Record<string, unknown> | null;
  changed_fields?: string[];
  reason?: string | null;
  source_page?: AuditSourcePage;
}

export interface AuditUser {
  id: string | null;
  email: string | null;
}

export async function getAuditUser(): Promise<AuditUser> {
  try {
    const supabase = await createServerClient();
    const { data } = await supabase.auth.getUser();
    return {
      id: data.user?.id ?? null,
      email: data.user?.email ?? null,
    };
  } catch {
    return { id: null, email: null };
  }
}

export async function logAudit(
  client: SupabaseClient,
  payload: AuditPayload,
  user?: AuditUser
): Promise<void> {
  const u = user ?? (await getAuditUser());
  try {
    await client.from("audit_log").insert({
      table_name: payload.table_name,
      record_id: payload.record_id,
      action: payload.action,
      user_id: u.id,
      user_email: u.email,
      old_values: payload.old_values ?? null,
      new_values: payload.new_values ?? null,
      changed_fields: payload.changed_fields ?? null,
      reason: payload.reason ?? null,
      source_page: payload.source_page ?? null,
    });
  } catch {
    // Audit log is best-effort. Never block the main operation.
  }
}

export function diffFields(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown>
): { changed: string[]; old: Record<string, unknown>; new: Record<string, unknown> } {
  const changed: string[] = [];
  const oldOut: Record<string, unknown> = {};
  const newOut: Record<string, unknown> = {};
  if (!before) {
    return { changed: Object.keys(after), old: {}, new: after };
  }
  for (const key of Object.keys(after)) {
    const a = JSON.stringify(before[key] ?? null);
    const b = JSON.stringify(after[key] ?? null);
    if (a !== b) {
      changed.push(key);
      oldOut[key] = before[key] ?? null;
      newOut[key] = after[key] ?? null;
    }
  }
  return { changed, old: oldOut, new: newOut };
}
