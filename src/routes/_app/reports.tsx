import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { FileDown, FileSpreadsheet, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { useTableStore } from "@/lib/table-store";
import { documentsStore } from "@/lib/documents-store";
import { occurrencesStore } from "@/lib/occurrences-store";
import { actionPlansStore } from "@/lib/action-plans-store";
import { risksStore } from "@/lib/risks-store";
import { calibrationsStore } from "@/lib/calibrations-store";
import { equipmentsStore } from "@/lib/equipments-store";
import { suppliersStore } from "@/lib/suppliers-store";
import { competenciesStore } from "@/lib/competencies-store";
import { auditsStore } from "@/lib/audits-store";
import { exportTablePdf } from "@/lib/pdf-export";

export const Route = createFileRoute("/_app/reports")({ component: ReportsPage });

const today = () => new Date().toISOString().slice(0, 10);

function ReportsPage() {
  const documents = useTableStore(documentsStore);
  const occurrences = useTableStore(occurrencesStore);
  const actions = useTableStore(actionPlansStore);
  const risks = useTableStore(risksStore);
  const calibrations = useTableStore(calibrationsStore);
  const equipments = useTableStore(equipmentsStore);
  const suppliers = useTableStore(suppliersStore);
  const competencies = useTableStore(competenciesStore);
  const audits = useTableStore(auditsStore);

  const csv = (cols: string[], rows: (string | number | null | undefined)[][], name: string) => {
    const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const data = [cols.join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
    const blob = new Blob([data], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${name}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const today_ = today();

  const REPORTS = [
    {
      title: "Documentos vencidos",
      cols: ["Código", "Título", "Categoria", "Validade", "Responsável"],
      build: () => documents.filter((d) => d.validity && d.validity < today_).map((d) => [d.code, d.title, d.category, d.validity, d.responsible]),
    },
    {
      title: "Documentos por status",
      cols: ["Código", "Título", "Status", "Versão", "Validade"],
      build: () => documents.map((d) => [d.code, d.title, d.status, d.version, d.validity]),
    },
    {
      title: "Ocorrências por período",
      cols: ["Código", "Tipo", "Origem", "Data", "Responsável", "Status"],
      build: () => occurrences.map((o) => [o.id, o.type, o.origin, o.date, o.responsible, o.status]),
    },
    {
      title: "Não conformidades por severidade",
      cols: ["Código", "Severidade", "Descrição", "Status"],
      build: () => occurrences.filter((o) => o.type?.toLowerCase().includes("nc") || o.type?.toLowerCase().includes("não")).map((o) => [o.id, o.severity, o.description, o.status]),
    },
    {
      title: "Planos de ação pendentes",
      cols: ["Descrição", "Responsável", "Prazo", "Prioridade", "Progresso", "Status"],
      build: () => actions.filter((a) => a.status !== "concluida" && a.status !== "verificada").map((a) => [a.description, a.responsible, a.deadline, a.priority, `${a.progress}%`, a.status]),
    },
    {
      title: "Riscos por classificação",
      cols: ["Código", "Processo", "Descrição", "Probabilidade", "Impacto", "Classificação"],
      build: () => risks.map((r) => [r.id, r.process, r.description, r.probability, r.impact, r.classification]),
    },
    {
      title: "Calibrações vencidas",
      cols: ["Equipamento", "Certificado", "Realizada", "Próxima", "Resultado"],
      build: () => calibrations.filter((c) => c.next_due_date && c.next_due_date < today_).map((c) => {
        const eq = equipments.find((e) => e.id === c.equipment_id);
        return [eq?.name ?? "", c.certificate_number, c.performed_at, c.next_due_date, c.result];
      }),
    },
    {
      title: "Calibrações a vencer (60 dias)",
      cols: ["Equipamento", "Certificado", "Próxima", "Resultado"],
      build: () => calibrations.filter((c) => {
        if (!c.next_due_date) return false;
        const d = (new Date(c.next_due_date).getTime() - new Date(today_).getTime()) / 86_400_000;
        return d >= 0 && d <= 60;
      }).map((c) => {
        const eq = equipments.find((e) => e.id === c.equipment_id);
        return [eq?.name ?? "", c.certificate_number, c.next_due_date, c.result];
      }),
    },
    {
      title: "Equipamentos por status",
      cols: ["Código", "Nome", "Tipo", "Status", "Próxima calibração"],
      build: () => equipments.map((e) => [e.code, e.name, e.category, e.status, e.next_calibration_date]),
    },
    {
      title: "Fornecedores por classificação",
      cols: ["Código", "Nome", "Categoria", "Avaliação", "Qualificado até", "Status"],
      build: () => suppliers.map((s) => [s.code, s.name, s.category, s.rating, s.qualified_until, s.status]),
    },
    {
      title: "Competências vencidas",
      cols: ["Área", "Competência", "Nível", "Certificado em", "Vence em", "Status"],
      build: () => competencies.filter((c) => c.expires_at && c.expires_at < today_).map((c) => [c.area, c.skill, c.level, c.certified_at, c.expires_at, c.status]),
    },
    {
      title: "Auditorias realizadas",
      cols: ["Código", "Tipo", "Escopo", "Auditor", "Realizada", "Achados", "Status"],
      build: () => audits.filter((a) => a.status === "concluida" || a.performed_at).map((a) => [a.code, a.type, a.scope, a.auditor_name, a.performed_at, a.findings_count, a.status]),
    },
  ];

  return (
    <>
      <PageHeader title="Relatórios" description="Relatórios gerenciais e operacionais com exportação em PDF e CSV" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {REPORTS.map((r) => {
          const handlePdf = () => {
            const rows = r.build();
            if (!rows.length) { toast.info(`Nenhum dado para "${r.title}"`); return; }
            exportTablePdf({ title: r.title, columns: r.cols, rows, filename: r.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"), meta: { Período: "todos os registros", Total: String(rows.length) } });
            toast.success(`PDF "${r.title}" gerado`);
          };
          const handleCsv = () => {
            const rows = r.build();
            if (!rows.length) { toast.info(`Nenhum dado para "${r.title}"`); return; }
            csv(r.cols, rows, r.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
            toast.success(`CSV "${r.title}" gerado`);
          };
          const count = r.build().length;
          return (
            <div key={r.title} className="bg-card border border-border rounded-lg p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="size-9 rounded-lg bg-primary/10 grid place-items-center text-primary"><BarChart3 className="size-4" /></div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{r.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{count} registro(s) disponíveis</div>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <Button size="sm" className="flex-1" onClick={handlePdf}><FileDown className="size-4" /> PDF</Button>
                <Button size="sm" variant="outline" onClick={handleCsv}><FileSpreadsheet className="size-4" /> CSV</Button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
