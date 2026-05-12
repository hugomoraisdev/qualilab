import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { useState } from "react";
import { CheckCircle2, Circle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const STEPS: { title: string; desc: string; to: string }[] = [
  { title: "Apresentar Dashboard", desc: "Visão executiva com KPIs, gráficos e indicadores de qualidade", to: "/dashboard" },
  { title: "Documento aprovado e histórico de versão", desc: "Demonstrar controle documental, aprovações e linha do tempo", to: "/documents/DOC-001" },
  { title: "Criar uma ocorrência / não conformidade", desc: "Mostrar tela de ocorrências com análise de causa", to: "/occurrences/OC-001" },
  { title: "Gerar plano de ação", desc: "Plano vinculado à ocorrência com prazo, responsável e progresso", to: "/action-plans" },
  { title: "Abrir matriz de risco 5×5", desc: "Visualizar riscos por probabilidade × impacto", to: "/risks" },
  { title: "Equipamento e demonstrar calibração", desc: "Histórico, certificados e rastreabilidade metrológica", to: "/equipments/EQ-001" },
  { title: "Abrir fornecedor e mostrar avaliação", desc: "Cadastro, histórico de avaliações e classificação", to: "/suppliers/FOR-001" },
  { title: "Abrir matriz de competências", desc: "Competências técnicas por colaborador e validade", to: "/competencies" },
  { title: "Abrir reunião e gerar ação", desc: "Atas e decisões da governança da qualidade", to: "/meetings" },
  { title: "Abrir mapa de processos", desc: "Visão sistêmica dos processos do laboratório", to: "/process-map" },
  { title: "Preencher formulário", desc: "Formulário customizado com campos diversos e assinatura", to: "/forms/FORM-002" },
  { title: "Gerar relatório", desc: "Exportação em PDF/CSV de relatórios gerenciais", to: "/reports" },
  { title: "Mostrar log de auditoria", desc: "Rastreabilidade completa de todas as ações no sistema", to: "/audit-log" },
];

export const Route = createFileRoute("/_app/poc/roteiro")({ component: RoteiroPage });

function RoteiroPage() {
  const [done, setDone] = useState<Set<number>>(new Set());

  const toggle = (i: number) => {
    setDone(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });
  };

  return (
    <>
      <PageHeader
        title="Roteiro de Demonstração"
        description="13 passos para apresentar o QualiLab em uma POC completa"
        actions={<Button asChild variant="outline"><Link to="/poc">Voltar ao POC</Link></Button>}
      />

      <div className="bg-card border border-border rounded-lg p-4 mb-6 shadow-sm flex items-center justify-between">
        <div className="text-sm">
          <span className="font-semibold">{done.size}</span> de <span className="font-semibold">{STEPS.length}</span> etapas concluídas
        </div>
        <div className="w-48 h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-success transition-all" style={{ width: `${(done.size / STEPS.length) * 100}%` }} />
        </div>
      </div>

      <ol className="space-y-2">
        {STEPS.map((s, i) => {
          const isDone = done.has(i);
          return (
            <li key={i} className={`bg-card border rounded-lg p-4 shadow-sm transition-all ${isDone ? "border-success/40 bg-success/5" : "border-border"}`}>
              <div className="flex items-center gap-3">
                <button onClick={() => toggle(i)} className="shrink-0">
                  {isDone ? <CheckCircle2 className="size-6 text-success" /> : <Circle className="size-6 text-muted-foreground hover:text-primary" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">Passo {i + 1}</span>
                    <span className={`font-medium text-sm ${isDone ? "line-through text-muted-foreground" : ""}`}>{s.title}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{s.desc}</div>
                </div>
                <Button asChild size="sm" variant={isDone ? "outline" : "default"}>
                  <Link to={s.to}>
                    Abrir <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              </div>
            </li>
          );
        })}
      </ol>
    </>
  );
}
