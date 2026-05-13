import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { risksStore, type RiskRow } from "@/lib/risks-store";
import { useTableStore } from "@/lib/table-store";
import { Grid3x3, ListIcon } from "lucide-react";
import { useState } from "react";
import { DataTable } from "@/components/DataTable";

export const Route = createFileRoute("/_app/risks")({ component: RisksPage });

function MatrixCell({ p, i, risks }: { p: number; i: number; risks: RiskRow[] }) {
  const items = risks.filter(r => r.probability === p && r.impact === i);
  const score = p * i;
  let bg = "bg-success/20";
  if (score >= 15) bg = "bg-destructive/30";
  else if (score >= 10) bg = "bg-destructive/15";
  else if (score >= 6) bg = "bg-warning/25";
  return (
    <div className={`relative rounded-md border border-border ${bg} min-h-[64px] p-1.5 text-[10px]`}>
      <div className="absolute top-1 right-1.5 text-[10px] font-mono opacity-60">{score}</div>
      {items.map(r => (
        <Link key={r.id} to="/risks/$id" params={{ id: r.id }} className="block bg-background/90 backdrop-blur rounded px-1 py-0.5 mb-0.5 truncate font-medium hover:bg-background">
          {r.id}
        </Link>
      ))}
    </div>
  );
}

function RisksPage() {
  const risks = useTableStore(risksStore);
  const [view, setView] = useState<"list" | "matrix">("matrix");
  return (
    <>
      <PageHeader
        title="Riscos"
        description="Matriz de risco 5×5 e tratamento"
        actions={
          <div className="inline-flex bg-muted rounded-md p-0.5">
            <button onClick={() => setView("matrix")} className={`px-2.5 py-1 rounded text-xs flex items-center gap-1 ${view === "matrix" ? "bg-card shadow-sm" : ""}`}><Grid3x3 className="size-3.5" /> Matriz</button>
            <button onClick={() => setView("list")} className={`px-2.5 py-1 rounded text-xs flex items-center gap-1 ${view === "list" ? "bg-card shadow-sm" : ""}`}><ListIcon className="size-3.5" /> Lista</button>
          </div>
        }
      />

      {view === "matrix" ? (
        <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
          <div className="text-xs text-muted-foreground mb-3">Probabilidade (linhas) × Impacto (colunas) · Clique em um risco para detalhes</div>
          <div className="overflow-x-auto">
            <div className="grid grid-cols-[auto_repeat(5,minmax(110px,1fr))] gap-1.5 min-w-[700px]">
              <div></div>
              {[1, 2, 3, 4, 5].map(i => <div key={i} className="text-xs text-center text-muted-foreground font-medium">Impacto {i}</div>)}
              {[5, 4, 3, 2, 1].flatMap(p => [
                <div key={`l-${p}`} className="text-xs text-muted-foreground font-medium flex items-center pr-2 justify-end">Prob. {p}</div>,
                ...[1, 2, 3, 4, 5].map(i => <MatrixCell key={`${p}-${i}`} p={p} i={i} risks={risks} />),
              ])}
            </div>
          </div>
          <div className="flex flex-wrap gap-3 mt-4 text-xs">
            <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-success/30" /> Baixo (1–5)</span>
            <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-warning/30" /> Médio (6–9)</span>
            <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-destructive/20" /> Alto (10–14)</span>
            <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-destructive/40" /> Crítico (15+)</span>
          </div>
        </div>
      ) : (
        <DataTable
          data={risks}
          searchKeys={["id", "process", "description", "responsible", "classification", "status"]}
          newLabel="Novo risco"
          columns={[
            { key: "id", header: "Código", render: (r) => <span className="font-mono text-xs">{r.id}</span> },
            { key: "process", header: "Processo" },
            { key: "description", header: "Descrição", render: (r) => <span className="max-w-xs truncate inline-block">{r.description}</span> },
            { key: "probability", header: "Prob." },
            { key: "impact", header: "Impacto" },
            { key: "level", header: "Nível", render: (r) => <span className="font-mono">{r.level}</span> },
            { key: "classification", header: "Classificação", render: (r) => <StatusBadge>{r.classification}</StatusBadge> },
            { key: "responsible", header: "Responsável" },
            { key: "status", header: "Status", render: (r) => <StatusBadge>{r.status}</StatusBadge> },
          ]}
        />
      )}
    </>
  );
}
