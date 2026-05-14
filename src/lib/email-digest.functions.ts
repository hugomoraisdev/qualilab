import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendEmail } from "./send-email.functions";
import { buildDigestHtml, type DigestAlert } from "./email-templates";

const DONE_STATUSES = new Set(["concluida", "verificada", "Concluída", "verificado", "concluído"]);
const RISK_DONE = new Set(["mitigado", "encerrado", "aceito", "transferido"]);

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysUntil(iso: string): number {
  const a = new Date(iso + "T00:00:00").getTime();
  const b = new Date(today() + "T00:00:00").getTime();
  return Math.round((a - b) / 86_400_000);
}

export const runEmailDigest = createServerFn({ method: "POST" }).handler(async () => {
  const digestKey = `email-digest:${today()}`;

  // Idempotência: tenta inserir a chave; se já existe, sai
  const { data: existing } = await supabaseAdmin
    .from("app_data")
    .select("key")
    .eq("key", digestKey)
    .maybeSingle();
  if (existing) return { skipped: true };

  await supabaseAdmin.from("app_data").upsert({ key: digestKey, value: { sent: true } });

  // Carrega dados base
  const [
    { data: profiles },
    { data: calibrations },
    { data: equipments },
    { data: actionPlans },
    { data: competencies },
    { data: risks },
    { data: riskMetaRows },
    { data: eqMetaRows },
  ] = await Promise.all([
    supabaseAdmin.from("profiles").select("id,name,email"),
    supabaseAdmin.from("calibrations").select("id,equipment_id,next_due_date,responsible_id").lte("next_due_date", addDays(30)).is("deleted_at", null),
    supabaseAdmin.from("equipments").select("id,name,code,responsible_id").is("deleted_at", null),
    supabaseAdmin.from("action_plans").select("id,description,responsible_id,deadline,status,origin_type").lte("deadline", addDays(3)).is("deleted_at", null),
    supabaseAdmin.from("competencies").select("id,user_id,skill,area,expires_at").lte("expires_at", addDays(60)).is("deleted_at", null),
    supabaseAdmin.from("risks").select("id,code,description,responsible_id,status").is("deleted_at", null),
    supabaseAdmin.from("app_data").select("key,value").like("key", "risk-meta:%"),
    supabaseAdmin.from("app_data").select("key,value").like("key", "equipment-meta:%"),
  ]);

  // Mapas auxiliares
  const profileByName = new Map<string, string>(); // name → email
  const profileById = new Map<string, string>();   // id → email
  const profileByIdName = new Map<string, string>(); // id → name
  for (const p of profiles ?? []) {
    if (p.email) { profileByName.set(p.name, p.email); profileById.set(p.id, p.email); }
    profileByIdName.set(p.id, p.name);
  }

  const eqMap = new Map<string, { name: string; code: string; responsible_id: string | null }>();
  for (const e of equipments ?? []) eqMap.set(e.id, e);

  const eqMetaMap = new Map<string, { notification_recipients: string[] }>();
  for (const r of eqMetaRows ?? []) {
    const id = (r.key as string).replace("equipment-meta:", "");
    const val = r.value as { notification_recipients?: string[] };
    eqMetaMap.set(id, { notification_recipients: val?.notification_recipients ?? [] });
  }

  const riskMetaMap = new Map<string, { treatment_deadline: string | null }>();
  for (const r of riskMetaRows ?? []) {
    const id = (r.key as string).replace("risk-meta:", "");
    const val = r.value as { treatment_deadline?: string | null };
    riskMetaMap.set(id, { treatment_deadline: val?.treatment_deadline ?? null });
  }

  // Acumula alertas por e-mail
  const alertsByEmail = new Map<string, { recipientName: string; alerts: DigestAlert[] }>();

  function addAlert(email: string, recipientName: string, alert: DigestAlert) {
    if (!alertsByEmail.has(email)) alertsByEmail.set(email, { recipientName, alerts: [] });
    alertsByEmail.get(email)!.alerts.push(alert);
  }

  // Calibrações (≤30 dias)
  for (const cal of calibrations ?? []) {
    if (!cal.next_due_date) continue;
    const d = daysUntil(cal.next_due_date);
    const eq = eqMap.get(cal.equipment_id);
    const level: DigestAlert["level"] = d < 0 ? "danger" : "warning";
    const alert: DigestAlert = {
      category: "Calibração",
      level,
      title: d < 0 ? "Calibração vencida" : `Calibração vence em ${d} dia(s)`,
      description: `${eq?.name ?? "Equipamento"} (${eq?.code ?? ""})`,
      daysLeft: d,
    };
    // Destinatários: notification_recipients do equipment-meta
    const eqMeta = eqMetaMap.get(cal.equipment_id);
    for (const email of eqMeta?.notification_recipients ?? []) {
      addAlert(email, "Equipe", alert);
    }
    // + responsible do equipamento por nome
    const eqResponsible = eq?.responsible_id;
    if (eqResponsible) {
      const email = profileByName.get(eqResponsible);
      if (email) addAlert(email, eqResponsible, alert);
    }
  }

  // Ações (≤3 dias, não concluídas)
  for (const ap of actionPlans ?? []) {
    if (!ap.deadline || !ap.responsible_id) continue;
    if (DONE_STATUSES.has(ap.status)) continue;
    const d = daysUntil(ap.deadline);
    const email = profileByName.get(ap.responsible_id) ?? profileById.get(ap.responsible_id);
    const recipientName = profileByIdName.get(ap.responsible_id) ?? ap.responsible_id;
    if (!email) continue;
    addAlert(email, recipientName, {
      category: "Ação",
      level: d < 0 ? "danger" : "warning",
      title: d < 0 ? "Ação vencida" : `Ação vence em ${d} dia(s)`,
      description: (ap.description ?? "").slice(0, 80),
      daysLeft: d,
    });
  }

  // Competências (≤60 dias)
  for (const comp of competencies ?? []) {
    if (!comp.expires_at || !comp.user_id) continue;
    const d = daysUntil(comp.expires_at);
    const email = profileById.get(comp.user_id);
    if (!email) continue;
    const name = profileByIdName.get(comp.user_id) ?? "";
    addAlert(email, name, {
      category: "Competência",
      level: d < 0 ? "danger" : "warning",
      title: d < 0 ? "Treinamento vencido" : `Treinamento vence em ${d} dia(s)`,
      description: `${comp.skill} · ${comp.area}`,
      daysLeft: d,
    });
  }

  // Riscos (≤14 dias, não encerrados)
  for (const risk of risks ?? []) {
    if (RISK_DONE.has(risk.status)) continue;
    const meta = riskMetaMap.get(risk.id);
    if (!meta?.treatment_deadline) continue;
    const d = daysUntil(meta.treatment_deadline);
    if (d > 14) continue;
    if (!risk.responsible_id) continue;
    const email = profileByName.get(risk.responsible_id) ?? profileById.get(risk.responsible_id);
    const recipientName = profileByIdName.get(risk.responsible_id) ?? risk.responsible_id;
    if (!email) continue;
    addAlert(email, recipientName, {
      category: "Risco",
      level: d < 0 ? "danger" : "warning",
      title: d < 0 ? "Tratamento de risco atrasado" : `Tratamento de risco vence em ${d} dia(s)`,
      description: `${risk.code ?? ""} — ${(risk.description ?? "").slice(0, 60)}`,
      daysLeft: d,
    });
  }

  // Envia um e-mail por destinatário
  const results: { email: string; ok: boolean }[] = [];
  for (const [email, { recipientName, alerts }] of alertsByEmail) {
    if (!alerts.length) continue;
    try {
      await sendEmail({
        data: {
          to: email,
          subject: `Qualilab — ${alerts.length} alerta(s) pendente(s) (${today()})`,
          html: buildDigestHtml(recipientName, alerts),
        },
      });
      results.push({ email, ok: true });
    } catch (e) {
      console.error("[email-digest] send failed:", email, e);
      results.push({ email, ok: false });
    }
  }

  return { sent: results.length, results };
});
