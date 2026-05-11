import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { risks } from "@/lib/mock-data";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_app/risks/$id")({ component: RiskDetail });

function RiskDetail() {
  const { id } = Route.useParams();
  const r = risks.find(x => x.id === id) ?? risks[0];
  return (
    <>
      <Link to="/risks" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"><ArrowLeft className="size-4 mr-1" /> Voltar</Link>
      <PageHeader title={r.description} description={`${r.id} · Processo ${r.process}`} actions={<StatusBadge>{r.classification}</StatusBadge>} />
      <div className="bg-card border border-border rounded-lg p-5 shadow-sm grid sm:grid-cols-2 gap-4 text-sm">
        <div><div className="text-xs text-muted-foreground">Causa</div>{r.cause}</div>
        <div><div className="text-xs text-muted-foreground">Consequência</div>{r.consequence}</div>
        <div><div className="text-xs text-muted-foreground">Probabilidade</div>{r.probability}</div>
        <div><div className="text-xs text-muted-foreground">Impacto</div>{r.impact}</div>
        <div><div className="text-xs text-muted-foreground">Nível</div><span className="font-mono">{r.level}</span></div>
        <div><div className="text-xs text-muted-foreground">Status</div><StatusBadge>{r.status}</StatusBadge></div>
        <div className="sm:col-span-2"><div className="text-xs text-muted-foreground">Responsável</div>{r.responsible}</div>
      </div>
    </>
  );
}
