import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/data-migration")({ component: DataMigration });

const ENTITIES = [
  { name: "Documentos",                qty: 800,  format: "CSV / Excel" },
  { name: "Equipamentos",              qty: 1500, format: "CSV / Excel" },
  { name: "Históricos de calibração",  qty: 4000, format: "CSV / Excel" },
  { name: "Fornecedores",              qty: 300,  format: "CSV / Excel" },
  { name: "Avaliações de fornecedores",qty: 800,  format: "CSV / Excel" },
  { name: "Inspeções",                 qty: 2000, format: "CSV / Excel" },
];

function DataMigration() {
  return (
    <>
      <PageHeader
        title="Importação e Migração de Dados"
        description="Volumes previstos na Tabela 04 do edital CISPAR 08/2026"
      />

      <section className="bg-card border border-border rounded-lg p-5 shadow-sm mb-6">
        <p className="text-sm text-muted-foreground">
          A migração poderá ser realizada por meio de arquivos estruturados em <span className="font-medium text-foreground">CSV/Excel</span>,
          com validação prévia dos dados, conferência de campos obrigatórios e importação assistida durante o onboarding.
          O sistema está preparado para receber os volumes informados na Tabela 04 do edital, sem custo adicional ao contratante.
        </p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {ENTITIES.map((e) => (
          <div key={e.name} className="bg-card border border-border rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="size-9 rounded-lg bg-primary/10 grid place-items-center text-primary">
                <FileSpreadsheet className="size-4" />
              </div>
              <span className="inline-flex items-center gap-1 rounded-full border border-success/40 bg-success/10 px-2.5 py-1 text-[11px] font-semibold text-success">
                <CheckCircle2 className="size-3" /> Preparado
              </span>
            </div>
            <div className="font-medium text-sm">{e.name}</div>
            <div className="text-2xl font-semibold tracking-tight mt-1">
              {e.qty.toLocaleString("pt-BR")}
              <span className="text-xs font-normal text-muted-foreground ml-1">registros previstos</span>
            </div>
            <div className="text-xs text-muted-foreground mt-2">Formato: {e.format}</div>
            <Button
              size="sm"
              variant="outline"
              className="w-full mt-3"
              onClick={() => toast.info(`Importação de ${e.name}`, {
                description: "Selecione um arquivo CSV/Excel. Após upload, o sistema valida campos obrigatórios e exibe pré-visualização antes de confirmar.",
              })}
            >
              <Upload className="size-3.5" /> Importar planilha
            </Button>
          </div>
        ))}
      </div>

      <section className="bg-card border border-border rounded-lg p-5 shadow-sm">
        <h3 className="text-sm font-semibold mb-3">Fluxo de importação assistida</h3>
        <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1.5">
          <li>Download do template CSV/Excel da entidade desejada</li>
          <li>Preenchimento das informações conforme o modelo</li>
          <li>Upload do arquivo na plataforma</li>
          <li>Validação automática de campos obrigatórios e formato</li>
          <li>Pré-visualização e confirmação antes da importação</li>
          <li>Registro completo no Log de Auditoria do sistema</li>
        </ol>
      </section>
    </>
  );
}
