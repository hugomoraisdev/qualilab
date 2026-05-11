import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Target, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface IndicatorResult { period: string; value: number; status: "ok" | "atencao" | "critico" }
interface Indicator {
  id: string; name: string; unit: string; frequency: "mensal" | "trimestral" | "anual";
  target: number; direction: "maior" | "menor"; area: string; results: IndicatorResult[];
}

const SEED: Indicator[] = [
  {
    id: "IND-001", name: "% Calibrações realizadas no prazo", unit: "%", frequency: "mensal",
    target: 95, direction: "maior", area: "Equipamentos",
    results: [
      { period: "2026-02", value: 92, status: "atencao" },
      { period: "2026-03", value: 96, status: "ok" },
      { period: "2026-04", value: 88, status: "critico" },
      { period: "2026-05", value: 94, status: "atencao" },
    ],
  },
  {
    id: "IND-002", name: "Tempo médio de tratamento de NC (dias)", unit: "dias", frequency: "mensal",
    target: 15, direction: "menor", area: "Qualidade",
    results: [
      { period: "2026-02", value: 18, status: "atencao" },
      { period: "2026-03", value: 12, status: "ok" },
      { period: "2026-04", value: 22, status: "critico" },
      { period: "2026-05", value: 14, status: "ok" },
    ],
  },
  {
    id: "IND-003", name: "Satisfação do cliente (escala 1-5)", unit: "pts", frequency: "trimestral",
    target: 4.5, direction: "maior", area: "SAC",
    results: [
      { period: "2025-Q4", value: 4.6, status: "ok" },
      { period: "2026-Q1", value: 4.3, status: "atencao" },
    ],
  },
];

export const Route = createFileRoute("/_app/indicators")({ component: IndicatorsPage });

function IndicatorsPage() {
  const [list, setList] = useState<Indicator[]>(SEED);
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState({ name: "", unit: "", target: "0", direction: "maior" as "maior" | "menor", area: "" });

  const create = () => {
    if (!draft.name.trim()) return;
    const ind: Indicator = {
      id: "IND-" + String(list.length + 1).padStart(3, "0"),
      name: draft.name, unit: draft.unit || "—", frequency: "mensal",
      target: parseFloat(draft.target) || 0, direction: draft.direction, area: draft.area || "Geral",
      results: [],
    };
    setList([ind, ...list]);
    setShowForm(false);
    setDraft({ name: "", unit: "", target: "0", direction: "maior", area: "" });
  };

  return (
    <>
      <PageHeader
        title="Indicadores"
        description="Indicadores configuráveis com meta, periodicidade e acompanhamento de desempenho"
        actions={<Button onClick={() => setShowForm((v) => !v)}><Plus className="size-4" /> Novo indicador</Button>}
      />

      {showForm && (
        <div className="bg-card border border-border rounded-lg p-5 shadow-sm mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div className="lg:col-span-2 space-y-1.5"><Label className="text-xs">Nome *</Label><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Ex: % POPs revisados" /></div>
          <div className="space-y-1.5"><Label className="text-xs">Unidade</Label><Input value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} placeholder="%, dias, un." /></div>
          <div className="space-y-1.5"><Label className="text-xs">Meta</Label><Input type="number" value={draft.target} onChange={(e) => setDraft({ ...draft, target: e.target.value })} /></div>
          <div className="space-y-1.5">
            <Label className="text-xs">Sentido</Label>
            <select value={draft.direction} onChange={(e) => setDraft({ ...draft, direction: e.target.value as any })} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="maior">Maior é melhor</option>
              <option value="menor">Menor é melhor</option>
            </select>
          </div>
          <div className="space-y-1.5 lg:col-span-2"><Label className="text-xs">Área</Label><Input value={draft.area} onChange={(e) => setDraft({ ...draft, area: e.target.value })} /></div>
          <div className="lg:col-span-3 flex justify-end gap-2"><Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button><Button onClick={create}>Criar indicador</Button></div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {list.map((i) => {
          const last = i.results[i.results.length - 1];
          const prev = i.results[i.results.length - 2];
          const trend = last && prev ? last.value - prev.value : 0;
          const meetsTarget = last ? (i.direction === "maior" ? last.value >= i.target : last.value <= i.target) : false;
          return (
            <div key={i.id} className="bg-card border border-border rounded-lg p-5 shadow-sm">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="text-xs font-mono text-muted-foreground">{i.id} · {i.area}</div>
                  <div className="font-medium">{i.name}</div>
                </div>
                <div className={cn("rounded-full px-2 py-0.5 text-[10px] uppercase font-bold", meetsTarget ? "bg-success/15 text-success" : "bg-warning/20 text-warning-foreground")}>
                  {meetsTarget ? "Meta atingida" : "Abaixo da meta"}
                </div>
              </div>
              <div className="flex items-end gap-3 mt-3">
                <div className="text-3xl font-semibold">{last ? last.value : "—"}<span className="text-sm text-muted-foreground ml-1">{i.unit}</span></div>
                <div className="text-xs text-muted-foreground pb-2">
                  Meta: <span className="font-medium">{i.direction === "maior" ? "≥" : "≤"} {i.target} {i.unit}</span>
                </div>
                {trend !== 0 && (
                  <div className={cn("flex items-center text-xs pb-2", (i.direction === "maior" ? trend > 0 : trend < 0) ? "text-success" : "text-destructive")}>
                    {trend > 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                    {Math.abs(trend).toFixed(1)}
                  </div>
                )}
              </div>
              <div className="flex items-end gap-1 mt-4 h-16">
                {i.results.map((r) => {
                  const max = Math.max(...i.results.map((x) => x.value), i.target) * 1.1 || 1;
                  const h = (r.value / max) * 100;
                  const meets = i.direction === "maior" ? r.value >= i.target : r.value <= i.target;
                  return (
                    <div key={r.period} className="flex-1 flex flex-col items-center gap-1">
                      <div className={cn("w-full rounded-t", meets ? "bg-success/60" : "bg-warning/60")} style={{ height: `${h}%` }} title={`${r.period}: ${r.value}${i.unit}`} />
                      <div className="text-[10px] text-muted-foreground">{r.period.slice(-2)}</div>
                    </div>
                  );
                })}
              </div>
              <div className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1"><Target className="size-3" /> Periodicidade: {i.frequency}</div>
            </div>
          );
        })}
      </div>
    </>
  );
}
