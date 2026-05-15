// NOTA DE IMUTABILIDADE: A tabela audit_logs deve ser imutável no banco de dados.
// Para garantir imutabilidade real além do comportamento apenas-INSERT do código TypeScript,
// aplique a seguinte política RLS no Supabase:
//
//   CREATE POLICY "audit_logs_no_update" ON audit_logs FOR UPDATE USING (false);
//   CREATE POLICY "audit_logs_no_delete" ON audit_logs FOR DELETE USING (false);
//
// Equivalente SQL direto:
//   REVOKE UPDATE, DELETE ON audit_logs FROM authenticated, anon;
//
// Isso garante que nem o frontend, nem chamadas diretas à API possam
// modificar ou apagar registros de auditoria existentes.

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
  // Campos before/after para rastreabilidade de estado anterior e posterior.
  // Devem ser passados nos pontos críticos de negócio (aprovações, status, etc.).
  before: z.record(z.unknown()).nullable().optional(),
  after: z.record(z.unknown()).nullable().optional(),
});

export const logAuditFn = createServerFn({ method: "POST" })
  .inputValidator((input) => AuditEventSchema.parse(input))
  .handler(async ({ data }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabaseAdmin as any).from("audit_logs").insert(data);
  });
