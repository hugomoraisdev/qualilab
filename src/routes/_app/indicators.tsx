import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Target, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTableStore } from "@/lib/table-store";
import {
  indicatorsStore, indicatorResultsStore, saveIndicator, saveResult, newId,
  type IndicatorRow, type IndicatorDirection, type IndicatorFrequency, type IndicatorResultRow,
} from "@/lib/indicators-store";

export const Route = createFileRoute("/_app/indicators")({ component: IndicatorsPage });

function IndicatorsPage() {
  const list = useTableStore(indicatorsStore).filter((i) => !i.deleted_at);
  const allResults = useTableStore(indicatorResultsStore);
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<{ name: string; unit: string; target: string; direction: IndicatorDirection; area: string; frequency: IndicatorFrequency }>({
    name: "", unit: "", target: "0", direction: "maior", area: "", frequency: "mensal",
  });

  const create = async () => {
    if (!draft.name.trim()) return;
    const id = newId("IND");
    const ind: IndicatorRow = {
      id,
      code: id,
      name: draft.name,
      unit: draft.unit || "—",
      frequency: draft.frequency,
      target: parseFloat(draft.target) || 0,
      direction: draft.direction,
      area: draft.area || "Geral",
      responsible_id: null,
      notes: null,
    };
    await saveIndicator(ind);
    setShowForm(false);
    setDraft({ name: "", unit: "", target: "0", direction: "maior", area: "", frequency: "mensal" });
  };

  const addResult = async (ind: IndicatorRow) => {
    const period = prompt("Período (ex: 2026-05 ou 2026-Q2):");
    if (!period) return;
    const valueStr = prompt("Valor:");
    if (valueStr == null) return;
    const value = parseFloat(valueStr);
    if (Number.isNaN(value)) return;
    const meets = ind.direction === "maior" ? value >= ind.target : value <= ind.target;
    const r: IndicatorResultRow = {
      id: newId("RES"),
      indicator_id: ind.id,
      period,
      value,
      status: meets ? "ok" : "atencao",
      notes: null,
    };
    await saveResult(r);
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
            <select value={draft.direction} onChange={(e) => setDraft({ ...draft, direction: e.target.value as IndicatorDirection })} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="maior">Maior é melhor</option>
              <option value="menor">Menor é melhor</option>
            </select>
          </div>
          <div className="space-y-1.5"><Label className="text-xs">Área</Label><Input value={draft.area} onChange={(e) => setDraft({ ...draft, area: e.target.value })} /></div>
          <div className="space-y-1.5">
            <Label className="text-xs">Periodicidade</Label>
            <select value={draft.frequency} onChange={(e) => setDraft({ ...draft, frequency: e.target.value as IndicatorFrequency })} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="mensal">Mensal</option>
              <option value="trimestral">Trimestral</option>
              <option value="anual">Anual</option>
            </select>
          </div>
          <div className="lg:col-span-3 flex justify-end gap-2"><Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button><Button onClick={create}>Criar indicador</Button></div>
        </div>
      )}

      {list.length === 0 && (
        <div className="bg-card border border-dashed border-border rounded-lg p-8 text-center text-sm text-muted-foreground">
          Nenhum indicador cadastrado. Clique em "Novo indicador" acima.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {list.map((i) => {
          const results = allResults.filter((r) => r.indicator_id === i.id).sort((a, b) => a.period.localeCompare(b.period));
          const last = results[results.length - 1];
          const prev = results[results.length - 2];
          const trend = last && prev ? last.value - prev.value : 0;
          const meetsTarget = last ? (i.direction === "maior" ? last.value >= i.target : last.value <= i.target) : false;
          return (
            <div key={i.id} className="bg-card border border-border rounded-lg p-5 shadow-sm">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="text-xs font-mono text-muted-foreground">{i.code ?? i.id} · {i.area}</div>
                  <div className="font-medium">{i.name}</div>
                </div>
                <div className={cn("rounded-full px-2 py-0.5 text-[10px] uppercase font-bold", meetsTarget ? "bg-success/15 text-success" : "bg-warning/20 text-warning-foreground")}>
                  {meetsTarget ? "Meta atingida" : "Sem dados / abaixo"}
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
                {results.map((r) => {
                  const max = Math.max(...results.map((x) => x.value), i.target) * 1.1 || 1;
                  const h = (r.value / max) * 100;
                  const meets = i.direction === "maior" ? r.value >= i.target : r.value <= i.target;
                  return (
                    <div key={r.id} className="flex-1 flex flex-col items-center gap-1">
                      <div className={cn("w-full rounded-t", meets ? "bg-success/60" : "bg-warning/60")} style={{ height: `${h}%` }} title={`${r.period}: ${r.value}${i.unit}`} />
                      <div className="text-[10px] text-muted-foreground">{r.period.slice(-2)}</div>
                    </div>
                  );
                })}
                {results.length === 0 && <div className="text-xs text-muted-foreground italic">Sem resultados ainda.</div>}
              </div>
              <div className="flex items-center justify-between mt-3">
                <div className="text-[11px] text-muted-foreground flex items-center gap-1"><Target className="size-3" /> Periodicidade: {i.frequency}</div>
                <Button size="sm" variant="outline" onClick={() => addResult(i)}><Plus className="size-3" /> Resultado</Button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
