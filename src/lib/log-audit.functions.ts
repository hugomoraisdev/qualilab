import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const AuditEventSchema = z.object({
  module: z.string(),
  action: z.string(),
  actor_id: z.string().nullable().optional(),
  actor_name: z.string().nullable().optional(),
  actor_email: z.string().nullable().optional(),
  record_id: z.string().nullable().optional(),
  record_label: z.string().nullable().optional(),
});

export const logAuditFn = createServerFn({ method: "POST" })
  .inputValidator((input) => AuditEventSchema.parse(input))
  .handler(async ({ data }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabaseAdmin as any).from("audit_logs").insert(data);
  });
