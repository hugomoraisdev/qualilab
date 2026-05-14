// Geração de PDF nativo usando jsPDF + autoTable.
// Cobre relatórios, atas de reunião, auditorias e qualquer tabela.
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface PdfTableOptions {
  title: string;
  subtitle?: string;
  columns: string[];
  rows: (string | number | null | undefined)[][];
  filename?: string;
  meta?: Record<string, string | undefined>;
}

const QUALILAB_BLUE: [number, number, number] = [37, 99, 235];

function header(doc: jsPDF, title: string, subtitle?: string) {
  doc.setFillColor(...QUALILAB_BLUE);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 22, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("QualiLab", 14, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(new Date().toLocaleString("pt-BR"), doc.internal.pageSize.getWidth() - 14, 14, { align: "right" });

  doc.setTextColor(20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(title, 14, 32);
  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(subtitle, 14, 38);
  }
}

function footer(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120);
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    doc.text(`Página ${i} de ${pageCount}`, w / 2, h - 8, { align: "center" });
    doc.text("QualiLab — Documento gerado pelo sistema", 14, h - 8);
  }
}

export function exportTablePdf(opts: PdfTableOptions) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  header(doc, opts.title, opts.subtitle);

  let cursorY = opts.subtitle ? 44 : 40;

  if (opts.meta) {
    doc.setFontSize(9);
    doc.setTextColor(60);
    Object.entries(opts.meta).forEach(([k, v]) => {
      if (!v) return;
      doc.setFont("helvetica", "bold");
      doc.text(`${k}: `, 14, cursorY);
      const labelWidth = doc.getTextWidth(`${k}: `);
      doc.setFont("helvetica", "normal");
      doc.text(String(v), 14 + labelWidth, cursorY);
      cursorY += 5;
    });
    cursorY += 2;
  }

  autoTable(doc, {
    startY: cursorY,
    head: [opts.columns],
    body: opts.rows.map((r) => r.map((c) => (c == null ? "—" : String(c)))),
    headStyles: { fillColor: QUALILAB_BLUE, textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    styles: { fontSize: 8, cellPadding: 2 },
    margin: { top: 22, left: 14, right: 14, bottom: 14 },
  });

  footer(doc);
  doc.save(`${opts.filename ?? opts.title.toLowerCase().replace(/\s+/g, "-")}.pdf`);
}

interface AuditPdfOptions {
  code: string;
  type: string;
  scope: string;
  area?: string | null;
  auditor?: string | null;
  planned_at?: string | null;
  performed_at?: string | null;
  status: string;
  notes?: string | null;
  findings: Array<{
    requirement: string;
    result: string;
    severity?: string | null;
    observation?: string | null;
    evidence?: string | null;
    responsible?: string | null;
    deadline?: string | null;
    action_status?: string | null;
  }>;
}

export function exportAuditReportPdf(audit: AuditPdfOptions) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  header(doc, `Relatório de Auditoria — ${audit.code}`, audit.scope);

  let y = 46;
  const meta: Array<[string, string]> = [
    ["Tipo", audit.type],
    ["Área", audit.area ?? "—"],
    ["Auditor", audit.auditor ?? "—"],
    ["Planejada", audit.planned_at ?? "—"],
    ["Realizada", audit.performed_at ?? "—"],
    ["Status", audit.status],
  ];

  doc.setFontSize(9);
  meta.forEach(([k, v]) => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(60);
    doc.text(`${k}:`, 14, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(20);
    doc.text(v, 45, y);
    y += 5;
  });
  y += 4;

  if (audit.notes) {
    doc.setFont("helvetica", "bold");
    doc.text("Observações gerais", 14, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    const wrapped = doc.splitTextToSize(audit.notes, 180);
    doc.text(wrapped, 14, y);
    y += wrapped.length * 4 + 4;
  }

  autoTable(doc, {
    startY: y,
    head: [["#", "Requisito", "Resultado", "Sev.", "Observação / Evidência", "Responsável", "Prazo"]],
    body: audit.findings.map((f, i) => [
      String(i + 1),
      f.requirement,
      f.result,
      f.severity ?? "—",
      [f.observation, f.evidence].filter(Boolean).join("\n") || "—",
      f.responsible ?? "—",
      [f.deadline, f.action_status].filter(Boolean).join(" · ") || "—",
    ]),
    headStyles: { fillColor: QUALILAB_BLUE, textColor: 255 },
    styles: { fontSize: 8, cellPadding: 2, overflow: "linebreak" },
    columnStyles: { 0: { cellWidth: 8 }, 2: { cellWidth: 20 }, 3: { cellWidth: 14 }, 5: { cellWidth: 25 }, 6: { cellWidth: 24 } },
    margin: { left: 14, right: 14 },
  });

  footer(doc);
  doc.save(`auditoria-${audit.code}.pdf`);
}

interface MeetingPdfOptions {
  type: string;
  meeting_date: string;
  meeting_time?: string | null;
  participants: string[];
  status: string;
  notes?: string | null;
  agenda: Array<{ title: string; status: string; notes?: string | null }>;
}

export function exportMeetingMinutesPdf(meeting: MeetingPdfOptions) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  header(doc, `Ata de Reunião — ${meeting.type}`, `${meeting.meeting_date}${meeting.meeting_time ? " · " + meeting.meeting_time : ""}`);

  let y = 46;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Status:", 14, y);
  doc.setFont("helvetica", "normal");
  doc.text(meeting.status, 35, y);
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.text("Participantes:", 14, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  const parts = doc.splitTextToSize(meeting.participants.join(", ") || "—", 180);
  doc.text(parts, 14, y);
  y += parts.length * 4 + 4;

  if (meeting.notes) {
    doc.setFont("helvetica", "bold");
    doc.text("Observações da reunião", 14, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    const wrapped = doc.splitTextToSize(meeting.notes, 180);
    doc.text(wrapped, 14, y);
    y += wrapped.length * 4 + 4;
  }

  autoTable(doc, {
    startY: y,
    head: [["#", "Pauta", "Status", "Deliberação"]],
    body: meeting.agenda.map((a, i) => [String(i + 1), a.title, a.status, a.notes ?? "—"]),
    headStyles: { fillColor: QUALILAB_BLUE, textColor: 255 },
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: { 0: { cellWidth: 10 }, 2: { cellWidth: 28 } },
    margin: { left: 14, right: 14 },
  });

  footer(doc);
  doc.save(`ata-${meeting.meeting_date}.pdf`);
}

interface RiskMatrixRow {
  code: string;
  process: string;
  description: string;
  probability: number;
  impact: number;
  level: number;
  classification: string;
  responsible?: string | null;
  status: string;
  deadline?: string | null;
}

export function exportRisksMatrixPdf(rows: RiskMatrixRow[]) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  header(doc, "Matriz de Riscos", `${rows.length} risco(s) cadastrado(s)`);

  // Heat-map 5x5
  let y = 46;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(20);
  doc.text("Mapa de calor (Probabilidade × Impacto)", 14, y);
  y += 4;

  const cellW = 22;
  const cellH = 14;
  const startX = 30;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  for (let i = 1; i <= 5; i++) {
    doc.text(`Imp ${i}`, startX + (i - 1) * cellW + cellW / 2, y + 4, { align: "center" });
  }
  y += 6;
  for (let p = 5; p >= 1; p--) {
    doc.text(`Prob ${p}`, startX - 2, y + cellH / 2 + 1, { align: "right" });
    for (let i = 1; i <= 5; i++) {
      const score = p * i;
      let fill: [number, number, number] = [220, 252, 231]; // success
      if (score >= 15) fill = [254, 202, 202];
      else if (score >= 10) fill = [254, 215, 170];
      else if (score >= 6) fill = [253, 230, 138];
      const x = startX + (i - 1) * cellW;
      doc.setFillColor(...fill);
      doc.setDrawColor(200);
      doc.rect(x, y, cellW, cellH, "FD");
      const items = rows.filter((r) => r.probability === p && r.impact === i);
      doc.setTextColor(60);
      doc.setFontSize(7);
      doc.text(String(items.length), x + cellW - 3, y + 4, { align: "right" });
      doc.setTextColor(20);
      doc.setFontSize(7);
      const labels = items.slice(0, 3).map((it) => it.code).join(", ");
      if (labels) doc.text(labels.slice(0, 14), x + 1.5, y + 8);
      if (items.length > 3) doc.text(`+${items.length - 3}`, x + 1.5, y + 12);
    }
    y += cellH;
  }
  y += 6;

  autoTable(doc, {
    startY: y,
    head: [["Código", "Processo", "Descrição", "P", "I", "Nível", "Classificação", "Responsável", "Status", "Prazo"]],
    body: rows.map((r) => [
      r.code,
      r.process,
      r.description,
      String(r.probability),
      String(r.impact),
      String(r.level),
      r.classification,
      r.responsible ?? "—",
      r.status,
      r.deadline ?? "—",
    ]),
    headStyles: { fillColor: QUALILAB_BLUE, textColor: 255 },
    styles: { fontSize: 8, cellPadding: 2, overflow: "linebreak" },
    columnStyles: { 2: { cellWidth: 60 }, 3: { cellWidth: 8 }, 4: { cellWidth: 8 }, 5: { cellWidth: 14 } },
    margin: { left: 14, right: 14 },
  });

  footer(doc);
  doc.save(`matriz-de-riscos-${new Date().toISOString().slice(0, 10)}.pdf`);
}
