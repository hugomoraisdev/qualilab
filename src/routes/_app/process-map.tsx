import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { processMaps } from "@/lib/mock-data";
import { Workflow, AlertTriangle, FileText } from "lucide-react";

export const Route = createFileRoute("/_app/process-map")({ component: PMapPage });

function PMapPage() {
  return (
    <>
      <PageHeader title="Mapa de Processos" description="Visão sistêmica dos processos do laboratório" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {processMaps.map(p => (
          <div key={p.id} className="bg-card border border-border rounded-lg p-5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all">
            <div className="flex items-start justify-between mb-2">
              <div className="size-9 rounded-lg bg-primary/10 grid place-items-center text-primary"><Workflow className="size-4" /></div>
              <span className="text-xs font-mono text-muted-foreground">{p.id}</span>
            </div>
            <h3 className="font-semibold text-base">{p.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{p.objective}</p>
            <div className="mt-3 space-y-1.5 text-xs">
              <div><span className="text-muted-foreground">Dono:</span> {p.owner}</div>
              <div><span className="text-muted-foreground">Entradas:</span> {p.inputs}</div>
              <div><span className="text-muted-foreground">Saídas:</span> {p.outputs}</div>
            </div>
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-border text-xs">
              <Link to="/risks" className="flex items-center gap-1 text-warning-foreground hover:underline"><AlertTriangle className="size-3.5 text-warning" /> {p.risks} riscos</Link>
              <Link to="/documents" className="flex items-center gap-1 text-muted-foreground hover:text-foreground"><FileText className="size-3.5" /> {p.docs} documentos</Link>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
