const BRAND_COLOR = "#2563eb";
const DANGER_COLOR = "#dc2626";
const WARNING_COLOR = "#d97706";

function esc(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function base(title: string, body: string): string {
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"/>
<title>${esc(title)}</title></head><body style="font-family:sans-serif;max-width:600px;margin:40px auto;color:#111;">
<div style="border-top:4px solid ${BRAND_COLOR};padding:24px;">
<h2 style="margin-top:0;color:${BRAND_COLOR};">${esc(title)}</h2>
${body}
<hr style="margin:32px 0;border:none;border-top:1px solid #e5e7eb;"/>
<p style="font-size:11px;color:#9ca3af;">Qualilab — Sistema de Gestão da Qualidade</p>
</div></body></html>`;
}

export interface DigestAlert {
  category: string;
  level: "warning" | "danger";
  title: string;
  description: string;
  daysLeft: number;
}

export function buildActionAssignedHtml(params: {
  description: string;
  responsible: string;
  originLabel: string;
  deadline: string | null;
}): string {
  return base("Nova ação atribuída a você", `
    <p>Olá, <strong>${esc(params.responsible)}</strong>.</p>
    <p>Uma nova ação foi registrada sob sua responsabilidade:</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:6px 0;color:#6b7280;">Descrição</td>
          <td style="padding:6px 0;">${esc(params.description)}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Origem</td>
          <td style="padding:6px 0;">${esc(params.originLabel)}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Prazo</td>
          <td style="padding:6px 0;">${esc(params.deadline) || "Não definido"}</td></tr>
    </table>
    <p>Acesse o sistema para registrar o andamento.</p>`);
}

export function buildDocumentWorkflowHtml(params: {
  docCode: string;
  docTitle: string;
  stage: string;
  recipientName: string;
  deadline: string | null;
}): string {
  return base(`Documento aguarda sua ação — ${params.stage}`, `
    <p>Olá, <strong>${esc(params.recipientName)}</strong>.</p>
    <p>O documento abaixo aguarda sua ação na etapa de <strong>${esc(params.stage)}</strong>:</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:6px 0;color:#6b7280;">Código</td>
          <td style="padding:6px 0;">${esc(params.docCode)}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Título</td>
          <td style="padding:6px 0;">${esc(params.docTitle)}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Prazo</td>
          <td style="padding:6px 0;">${esc(params.deadline) || "Não definido"}</td></tr>
    </table>
    <p>Acesse o sistema para assinar a etapa.</p>`);
}

export function buildDocumentReadReminderHtml(params: {
  docCode: string;
  docTitle: string;
  version: string;
  recipientName: string;
}): string {
  return base("Novo documento para leitura obrigatória", `
    <p>Olá, <strong>${esc(params.recipientName)}</strong>.</p>
    <p>Um novo documento foi aprovado e requer sua confirmação de leitura:</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:6px 0;color:#6b7280;">Código</td>
          <td style="padding:6px 0;">${esc(params.docCode)}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Título</td>
          <td style="padding:6px 0;">${esc(params.docTitle)}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Versão</td>
          <td style="padding:6px 0;">${esc(params.version)}</td></tr>
    </table>
    <p>Acesse o sistema e confirme a leitura.</p>`);
}

export function buildDigestHtml(recipientName: string, alerts: DigestAlert[]): string {
  const rows = alerts.map((a) => {
    const color = a.level === "danger" ? DANGER_COLOR : WARNING_COLOR;
    const daysLabel = a.daysLeft < 0 ? "" : ` (${a.daysLeft}d)`;
    return `<tr>
      <td style="padding:8px;border-bottom:1px solid #f3f4f6;">
        <span style="font-weight:600;color:${color};">${esc(a.category)}</span>
      </td>
      <td style="padding:8px;border-bottom:1px solid #f3f4f6;">
        <div style="font-weight:500;">${esc(a.title)}${daysLabel}</div>
        <div style="color:#6b7280;font-size:13px;">${esc(a.description)}</div>
      </td>
    </tr>`;
  }).join("");

  return base(`Resumo diário de alertas — ${new Date().toLocaleDateString("pt-BR")}`, `
    <p>Olá${recipientName ? `, <strong>${esc(recipientName)}</strong>` : ""}.</p>
    <p>Estes itens requerem sua atenção:</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">${rows}</table>
    <p style="margin-top:16px;">Acesse o sistema para tratar cada item.</p>`);
}

export function buildAuditPlannedHtml(params: {
  recipientName: string;
  code: string;
  type: string;
  scope: string;
  area: string | null;
  auditor: string | null;
  planned_at: string | null;
  objective: string | null;
  criterion: string | null;
  checklist: string | null;
  document_refs: string[];
}): string {
  const docs = params.document_refs.length
    ? `<tr><td style="padding:6px 0;color:#6b7280;">Documentos</td><td style="padding:6px 0;">${params.document_refs.map(esc).join("<br/>")}</td></tr>`
    : "";
  return base(`Auditoria planejada — ${params.code}`, `
    <p>Olá, <strong>${esc(params.recipientName)}</strong>.</p>
    <p>Você foi incluído(a) no planejamento da auditoria abaixo:</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:6px 0;color:#6b7280;width:140px;">Código</td><td style="padding:6px 0;">${esc(params.code)}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Tipo</td><td style="padding:6px 0;">${esc(params.type)}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Escopo</td><td style="padding:6px 0;">${esc(params.scope)}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Área</td><td style="padding:6px 0;">${esc(params.area) || "—"}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Auditor</td><td style="padding:6px 0;">${esc(params.auditor) || "—"}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Data planejada</td><td style="padding:6px 0;">${esc(params.planned_at) || "—"}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Objetivo</td><td style="padding:6px 0;">${esc(params.objective) || "—"}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Critério</td><td style="padding:6px 0;">${esc(params.criterion) || "—"}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Checklist</td><td style="padding:6px 0;">${esc(params.checklist) || "—"}</td></tr>
      ${docs}
    </table>
    <p>Acesse o sistema para acompanhar o planejamento.</p>`);
}

