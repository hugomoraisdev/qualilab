import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { CheckCircle2, FileText, Gauge, GraduationCap, Truck, AlertTriangle, ShieldAlert, Users2, Workflow, FormInput } from "lucide-react";

export const Route = createFileRoute("/_app/poc-checklist")({ component: PocChecklist });

const ITEMS = [
  { key: "documents",    label: "Documentos",        icon: FileText,        to: "/documents",    desc: "Controle documental com versão, aprovação e confirmação de leitura" },
  { key: "calibrations", label: "Calibração",        icon: Gauge,           to: "/calibrations", desc: "Aprovação automática + múltiplos pontos por equipamento" },
  { key: "competencies", label: "Competências",      icon: GraduationCap,   to: "/competencies", desc: "Matriz de competências, treinamentos e validade" },
  { key: "suppliers",    label: "Fornecedores",      icon: Truck,           to: "/suppliers",    desc: "Cadastro, classificação e avaliação de fornecedores" },
  { key: "occurrences",  label: "Ocorrências",       icon: AlertTriangle,   to: "/occurrences",  desc: "NCs com 4 ferramentas de causa raiz (5 Porquês, 5W2H, Ishikawa, Brainstorm)" },
  { key: "meetings",     label: "Reuniões",          icon: Users2,          to: "/meetings",     desc: "Recorrência automática e postergação de pautas" },
  { key: "risks",        label: "Risco",             icon: ShieldAlert,     to: "/risks",        desc: "Matriz de riscos com probabilidade x impacto" },
  { key: "process-map",  label: "Mapa de Processos", icon: Workflow,        to: "/process-map",  desc: "Inventário de processos, entradas, saídas e responsáveis" },
  { key: "forms",        label: "Formulário",        icon: FormInput,       to: "/forms",        desc: "Builder dinâmico de formulários com fluxo de aprovação" },
] as const;

function PocChecklist() {
  return (
    <>
      <PageHeader
        title="Checklist de Atendimento ao Edital"
        description="Módulos exigidos pelo edital CISPAR 08/2026 — todos atendidos e prontos para demonstração ao vivo"
      />

      <section className="bg-card border border-border rounded-lg p-5 shadow-sm mb-6">
        <p className="text-sm text-muted-foreground">
          O sistema <span className="font-semibold text-foreground">QualiLab</span> possui os módulos exigidos no edital
          e está preparado para demonstração ao vivo durante a POC. Cada item abaixo possui rota dedicada e fluxo demonstrável.
        </p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {ITEMS.map((it) => (
          <Link
            key={it.key}
            to={it.to}
            className="group bg-card border border-border rounded-lg p-4 shadow-sm hover:shadow-md hover:border-primary/40 transition-all flex flex-col"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="size-9 rounded-lg bg-primary/10 grid place-items-center text-primary">
                <it.icon className="size-4" />
              </div>
              <span className="inline-flex items-center gap-1 rounded-full border border-success/40 bg-success/10 px-2.5 py-1 text-[11px] font-semibold text-success">
                <CheckCircle2 className="size-3" /> Atendido
              </span>
            </div>
            <div className="font-medium text-sm">{it.label}</div>
            <div className="text-xs text-muted-foreground mt-1 flex-1">{it.desc}</div>
            <div className="text-[11px] text-primary mt-3 group-hover:underline">Abrir módulo →</div>
          </Link>
        ))}
      </div>

      <section className="mt-6 bg-card border border-border rounded-lg p-5 shadow-sm">
        <h3 className="text-sm font-semibold mb-2">Declaração formal</h3>
        <p className="text-sm text-muted-foreground">
          Esta área serve de apoio à declaração formal exigida pelo edital, que acompanha a proposta comercial.
          Todos os módulos listados acima estão implementados, navegáveis e podem ser apresentados durante a POC com dados de exemplo.
        </p>
      </section>
    </>
  );
}
