import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Rocket, ArrowRight, FileText, Gauge, GraduationCap, Truck, AlertTriangle, Users2, ShieldAlert, Workflow, FormInput } from "lucide-react";

const MODULES = [
  { name: "Documentos", icon: FileText, to: "/documents", status: "ok" },
  { name: "Calibrações", icon: Gauge, to: "/calibrations", status: "ok" },
  { name: "Competências", icon: GraduationCap, to: "/competencies", status: "ok" },
  { name: "Fornecedores", icon: Truck, to: "/suppliers", status: "ok" },
  { name: "Ocorrências", icon: AlertTriangle, to: "/occurrences", status: "ok" },
  { name: "Reuniões", icon: Users2, to: "/meetings", status: "ok" },
  { name: "Riscos", icon: ShieldAlert, to: "/risks", status: "ok" },
  { name: "Mapa de Processos", icon: Workflow, to: "/process-map", status: "ok" },
  { name: "Formulários", icon: FormInput, to: "/forms", status: "ok" },
] as const;

export const Route = createFileRoute("/_app/poc")({ component: POCPage });

function POCPage() {
  return (
    <>
      <PageHeader
        title="Ambiente POC"
        description="Prova de Conceito · ABNT NBR ISO/IEC 17025:2017"
        actions={
          <Link to="/poc/roteiro">
            <Button><Rocket className="size-4" /> Iniciar roteiro de demonstração</Button>
          </Link>
        }
      />

      <div className="bg-gradient-to-br from-primary to-info text-primary-foreground rounded-xl p-6 mb-6 shadow-md">
        <h2 className="text-xl font-semibold">QualiLab — Demonstração executiva</h2>
        <p className="text-sm opacity-90 mt-1 max-w-2xl">
          Todos os módulos obrigatórios estão funcionais e populados com dados realistas de laboratório.
          Use o roteiro guiado para apresentar a solução completa em até 15 minutos.
        </p>
      </div>

      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Checklist de módulos obrigatórios</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {MODULES.map(m => (
          <Link key={m.name} to={m.to} className="group bg-card border border-border rounded-lg p-4 shadow-sm hover:shadow-md hover:border-primary/30 transition-all flex items-center gap-3">
            <div className="size-10 rounded-lg bg-success/15 text-success grid place-items-center"><m.icon className="size-5" /></div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{m.name}</div>
              <div className="text-xs text-success flex items-center gap-1"><CheckCircle2 className="size-3.5" /> Atendido</div>
            </div>
            <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </Link>
        ))}
      </div>

      <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
        <h3 className="text-sm font-semibold mb-2">Dados fictícios pré-carregados</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-sm">
          {[
            ["20", "Documentos"], ["10", "Equipamentos"], ["15", "Calibrações"],
            ["8", "Fornecedores"], ["12", "Ocorrências"], ["10", "Riscos"],
            ["15", "Planos de ação"], ["6", "Colaboradores"], ["5", "Reuniões"],
            ["6", "Processos"], ["5", "Formulários"], ["8", "Logs"],
          ].map(([n, l]) => (
            <div key={l} className="border border-border rounded-md p-3 text-center">
              <div className="text-xl font-semibold text-primary">{n}</div>
              <div className="text-xs text-muted-foreground">{l}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
