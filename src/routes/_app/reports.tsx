import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { FileDown, FileSpreadsheet, BarChart3 } from "lucide-react";
import { toast } from "sonner";

const REPORTS = [
  "Documentos vencidos", "Documentos por status", "Ocorrências por período",
  "Não conformidades por severidade", "Planos de ação pendentes",
  "Riscos por classificação", "Calibrações vencidas", "Calibrações a vencer",
  "Equipamentos por status", "Fornecedores por classificação",
  "Competências vencidas", "Auditorias realizadas", "Histórico de alterações",
];

export const Route = createFileRoute("/_app/reports")({ component: ReportsPage });

function ReportsPage() {
  return (
    <>
      <PageHeader title="Relatórios" description="Relatórios gerenciais e operacionais com exportação em PDF e CSV" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {REPORTS.map(r => (
          <div key={r} className="bg-card border border-border rounded-lg p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="size-9 rounded-lg bg-primary/10 grid place-items-center text-primary"><BarChart3 className="size-4" /></div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{r}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Período padrão: últimos 90 dias</div>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <Button size="sm" className="flex-1" onClick={() => toast.success(`Relatório "${r}" gerado`)}>Gerar</Button>
              <Button size="sm" variant="outline" onClick={() => toast.info("PDF em geração...")}><FileDown className="size-4" /></Button>
              <Button size="sm" variant="outline" onClick={() => toast.info("CSV em geração...")}><FileSpreadsheet className="size-4" /></Button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
