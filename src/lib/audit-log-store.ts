import { supabase } from "@/integrations/supabase/client";

export async function logAuditAction(params: {
  module: string;
  action: string;
  record_id?: string;
  record_label?: string;
}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    let actorName: string | null = null;
    const actorEmail: string | null = user?.email ?? null;
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", user.id)
        .maybeSingle();
      actorName = profile?.name ?? user.email ?? null;
    }
    await (supabase as any).from("audit_logs").insert({
      id: crypto.randomUUID(),
      actor_name: actorName,
      actor_email: actorEmail,
      module: params.module,
      action: params.action,
      record_id: params.record_id ?? null,
      record_label: params.record_label ?? null,
    });
  } catch {
    // silent — não bloqueia a operação principal
  }
}
