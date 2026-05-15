import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAuditAccess } from "@/lib/audit";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Target,
  TrendingUp,
  TrendingDown,
  Filter,
  History,
  BarChart3,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTableStore } from "@/lib/table-store";
import {
  indicatorsStore,
  indicatorResultsStore,
  saveIndicator,
  saveResult,
  newId,
  type IndicatorRow,
  type IndicatorDirection,
  type IndicatorFrequency,
  type IndicatorResultRow,
} from "@/lib/indicators-store";
import { saveActionPlan, type ActionPlanRow } from "@/lib/action-plans-store";
import {
  useIndicatorMeta,
  setIndicatorExtra,
  type IndicatorKind,
} from "@/lib/indicator-meta-store";
import { profilesStore, profileName } from "@/lib/profiles-store";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/indicators")({ component: IndicatorsPage });

function isResultOverdue(freq: IndicatorFrequency, lastPeriod: string | undefined): boolean {
  if (!lastPeriod) return true;
  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth() + 1;
  const curPeriod = `${curYear}-${String(curMonth).padStart(2, "0")}`;
  if (freq === "mensal") return lastPeriod < curPeriod;
  if (freq === "trimestral") {
    const curQ = `${curYear}-${String(Math.max(1, curMonth - 2)).padStart(2, "0")}`;
    return lastPeriod < curQ;
  }
  return lastPeriod < `${curYear}-01`;
}

interface DraftIndicator {
  name: string;
  unit: string;
  target: string;
  direction: IndicatorDirection;
  area: string;
  frequency: IndicatorFrequency;
  kind: IndicatorKind;
  process: string;
  responsible_id: string;
}

const emptyDraft = (): DraftIndicator => ({
  name: "",
  unit: "",
  target: "0",
  direction: "maior",
  area: "",
  frequency: "mensal",
  kind: "desempenho",
  process: "",
  responsible_id: "",
});

function IndicatorsPage() {
  useAuditAccess("indicators");
  const list = useTableStore(indicatorsStore).filter((i) => !i.deleted_at);
  const allResults = useTableStore(indicatorResultsStore);
  const profiles = useTableStore(profilesStore);
  const { map: extras, getExtra } = useIndicatorMeta();

  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<DraftIndicator>(emptyDraft());
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [resultDraft, setResultDraft] = useState<{
    id: string;
    period: string;
    value: string;
    notes: string;
  } | null>(null);

  // Filtros
  const [fKind, setFKind] = useState<"" | IndicatorKind>("");
  const [fArea, setFArea] = useState("");
  const [fProcess, setFProcess] = useState("");
  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");

  const areas = useMemo(
    () => Array.from(new Set(list.map((i) => i.area).filter(Boolean))) as string[],
    [list],
  );
  const processes = useMemo(
    () =>
      Array.from(
        new Set(
          Object.values(extras)
            .map((e) => e.process)
            .filter(Boolean),
        ),
      ) as string[],
    [extras],
  );

  const filtered = useMemo(() => {
    return list.filter((i) => {
      const ex = getExtra(i.id);
      if (fKind && ex.kind !== fKind) return false;
      if (fArea && i.area !== fArea) return false;
      if (fProcess && (ex.process ?? "") !== fProcess) return false;
      return true;
    });
  }, [list, extras, fKind, fArea, fProcess, getExtra]);

  const inPeriod = (period: string) => {
    if (fFrom && period < fFrom) return false;
    if (fTo && period > fTo) return false;
    return true;
  };

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
      responsible_id: draft.responsible_id || null,
      notes: null,
    };
    await saveIndicator(ind);
    await setIndicatorExtra(id, { kind: draft.kind, process: draft.process || null });
    toast.success("Indicador criado");
    setShowForm(false);
    setDraft(emptyDraft());
  };

  const openResult = (i: IndicatorRow) => {
    const today = new Date().toISOString().slice(0, 7);
    setResultDraft({ id: i.id, period: today, value: "", notes: "" });
  };

  const submitResult = async () => {
    if (!resultDraft) return;
    const ind = list.find((x) => x.id === resultDraft.id);
    if (!ind) return;
    const value = parseFloat(resultDraft.value);
    if (Number.isNaN(value)) {
      toast.error("Informe um valor numérico");
      return;
    }
    const meets = ind.direction === "maior" ? value >= ind.target : value <= ind.target;
    const r: IndicatorResultRow = {
      id: newId("RES"),
      indicator_id: ind.id,
      period: resultDraft.period,
      value,
      status: meets ? "ok" : "atencao",
      notes: resultDraft.notes || null,
    };
    await saveResult(r);
    toast.success("Resultado registrado");
    setResultDraft(null);
  };

  const createActionPlanFromResult = async (ind: IndicatorRow, r: IndicatorResultRow) => {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 30);
    const ap: ActionPlanRow = {
      id: newId("AP"),
      code: null,
      origin_type: "indicator",
      origin_id: ind.id,
      description: `Indicador ${ind.name} abaixo da meta no período ${r.period}: resultado ${r.value} ${ind.unit} (meta: ${ind.direction === "maior" ? "≥" : "≤"} ${ind.target} ${ind.unit})`,
      responsible_id: ind.responsible_id,
      deadline: deadline.toISOString().slice(0, 10),
      priority: "alta",
      status: "aberto",
      progress: 0,
      notes: null,
    };
    await saveActionPlan(ap);
    toast.success("Plano de ação criado", {
      description: "Acesse a seção Planos de Ação para acompanhar.",
      action: { label: "Ver planos", onClick: () => window.location.assign("/action-plans") },
    });
  };

  // Overview metrics
  const overview = useMemo(() => {
    let onTarget = 0;
    let off = 0;
    let noData = 0;
    filtered.forEach((i) => {
      const rs = allResults.filter((r) => r.indicator_id === i.id && inPeriod(r.period));
      const last = rs.sort((a, b) => a.period.localeCompare(b.period)).at(-1);
      if (!last) {
        noData++;
        return;
      }
      const meets = i.direction === "maior" ? last.value >= i.target : last.value <= i.target;
      if (meets) onTarget++;
      else off++;
    });
    return {
      total: filtered.length,
      onTarget,
      off,
      noData,
      pct: filtered.length ? Math.round((onTarget / filtered.length) * 100) : 0,
    };
  }, [filtered, allResults, fFrom, fTo]);

  return (
    <>
      <PageHeader
        title="Indicadores"
        description="Indicadores de desempenho e qualidade — meta, responsável, periodicidade, histórico e tendências"
        actions={
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus className="size-4" /> Novo indicador
          </Button>
        }
      />

      {/* Overview / dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <OverviewCard label="Total" value={overview.total} tone="default" icon={BarChart3} />
        <OverviewCard label="No alvo" value={overview.onTarget} tone="success" icon={Target} />
        <OverviewCard
          label="Abaixo da meta"
          value={overview.off}
          tone="warning"
          icon={TrendingDown}
        />
        <OverviewCard
          label="% no alvo"
          value={`${overview.pct}%`}
          tone="primary"
          icon={TrendingUp}
        />
      </div>

      {/* Filtros */}
      <div className="bg-card border border-border rounded-lg p-3 mb-5 flex flex-wrap items-end gap-2">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Filter className="size-3" /> Filtros:
        </div>
        <select
          value={fKind}
          onChange={(e) => setFKind(e.target.value as "" | IndicatorKind)}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
        >
          <option value="">Todos os tipos</option>
          <option value="desempenho">Desempenho</option>
          <option value="qualidade">Qualidade</option>
        </select>
        <select
          value={fArea}
          onChange={(e) => setFArea(e.target.value)}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
        >
          <option value="">Todos os setores</option>
          {areas.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <select
          value={fProcess}
          onChange={(e) => setFProcess(e.target.value)}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
        >
          <option value="">Todos os processos</option>
          {processes.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1">
          <Label className="text-xs">De</Label>
          <Input
            type="month"
            value={fFrom}
            onChange={(e) => setFFrom(e.target.value)}
            className="h-8 w-32 text-xs"
          />
        </div>
        <div className="flex items-center gap-1">
          <Label className="text-xs">Até</Label>
          <Input
            type="month"
            value={fTo}
            onChange={(e) => setFTo(e.target.value)}
            className="h-8 w-32 text-xs"
          />
        </div>
        {(fKind || fArea || fProcess || fFrom || fTo) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFKind("");
              setFArea("");
              setFProcess("");
              setFFrom("");
              setFTo("");
            }}
          >
            Limpar
          </Button>
        )}
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-lg p-5 shadow-sm mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <div className="lg:col-span-2 space-y-1.5">
            <Label className="text-xs">Nome *</Label>
            <Input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Ex: % POPs revisados"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Tipo</Label>
            <select
              value={draft.kind}
              onChange={(e) => setDraft({ ...draft, kind: e.target.value as IndicatorKind })}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="desempenho">Desempenho</option>
              <option value="qualidade">Qualidade</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Periodicidade</Label>
            <select
              value={draft.frequency}
              onChange={(e) =>
                setDraft({ ...draft, frequency: e.target.value as IndicatorFrequency })
              }
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="mensal">Mensal</option>
              <option value="trimestral">Trimestral</option>
              <option value="anual">Anual</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Unidade</Label>
            <Input
              value={draft.unit}
              onChange={(e) => setDraft({ ...draft, unit: e.target.value })}
              placeholder="%, dias, un."
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Meta</Label>
            <Input
              type="number"
              value={draft.target}
              onChange={(e) => setDraft({ ...draft, target: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Sentido</Label>
            <select
              value={draft.direction}
              onChange={(e) =>
                setDraft({ ...draft, direction: e.target.value as IndicatorDirection })
              }
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="maior">Maior é melhor</option>
              <option value="menor">Menor é melhor</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Setor / Área</Label>
            <Input
              value={draft.area}
              onChange={(e) => setDraft({ ...draft, area: e.target.value })}
              placeholder="Ex: Produção"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Processo</Label>
            <Input
              value={draft.process}
              onChange={(e) => setDraft({ ...draft, process: e.target.value })}
              placeholder="Ex: Embalagem"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Responsável</Label>
            <select
              value={draft.responsible_id}
              onChange={(e) => setDraft({ ...draft, responsible_id: e.target.value })}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">— Selecione —</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="lg:col-span-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
            <Button onClick={create}>Criar indicador</Button>
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="bg-card border border-dashed border-border rounded-lg p-8 text-center text-sm text-muted-foreground">
          {list.length === 0
            ? 'Nenhum indicador cadastrado. Clique em "Novo indicador" acima.'
            : "Nenhum indicador corresponde aos filtros."}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((i) => {
          const ex = getExtra(i.id);
          const allFor = allResults
            .filter((r) => r.indicator_id === i.id)
            .sort((a, b) => a.period.localeCompare(b.period));
          const results = allFor.filter((r) => inPeriod(r.period));
          const last = results[results.length - 1];
          const prev = results[results.length - 2];
          const trend = last && prev ? last.value - prev.value : 0;
          const meetsTarget = last
            ? i.direction === "maior"
              ? last.value >= i.target
              : last.value <= i.target
            : false;
          const isHistoryOpen = historyId === i.id;
          return (
            <div key={i.id} className="bg-card border border-border rounded-lg p-5 shadow-sm">
              <div className="flex items-start justify-between mb-2 gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-mono text-muted-foreground truncate">
                    {i.code ?? i.id} · {i.area} {ex.process ? `· ${ex.process}` : ""}
                  </div>
                  <div className="font-medium">{i.name}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Resp.: {profileName(i.responsible_id)} · {i.frequency}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] uppercase font-bold whitespace-nowrap",
                      ex.kind === "qualidade"
                        ? "bg-primary/15 text-primary"
                        : "bg-accent/40 text-accent-foreground",
                    )}
                  >
                    {ex.kind}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] uppercase font-bold whitespace-nowrap",
                      last
                        ? meetsTarget
                          ? "bg-success/15 text-success"
                          : "bg-warning/20 text-warning-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {last ? (meetsTarget ? "Meta atingida" : "Abaixo") : "Sem dados"}
                  </span>
                  {isResultOverdue(i.frequency, last?.period) && (
                    <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold whitespace-nowrap bg-destructive/15 text-destructive">
                      <Clock className="size-2.5" /> Resultado atrasado
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-end gap-3 mt-3">
                <div className="text-3xl font-semibold">
                  {last ? last.value : "—"}
                  <span className="text-sm text-muted-foreground ml-1">{i.unit}</span>
                </div>
                <div className="text-xs text-muted-foreground pb-2">
                  Meta:{" "}
                  <span className="font-medium">
                    {i.direction === "maior" ? "≥" : "≤"} {i.target} {i.unit}
                  </span>
                </div>
                {trend !== 0 && (
                  <div
                    className={cn(
                      "flex items-center text-xs pb-2",
                      (i.direction === "maior" ? trend > 0 : trend < 0)
                        ? "text-success"
                        : "text-destructive",
                    )}
                  >
                    {trend > 0 ? (
                      <TrendingUp className="size-3" />
                    ) : (
                      <TrendingDown className="size-3" />
                    )}
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
                      <div
                        className={cn(
                          "w-full rounded-t",
                          meets ? "bg-success/60" : "bg-warning/60",
                        )}
                        style={{ height: `${h}%` }}
                        title={`${r.period}: ${r.value}${i.unit}`}
                      />
                      <div className="text-[10px] text-muted-foreground">{r.period.slice(-2)}</div>
                    </div>
                  );
                })}
                {results.length === 0 && (
                  <div className="text-xs text-muted-foreground italic">
                    Sem resultados no período.
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between mt-3 gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setHistoryId(isHistoryOpen ? null : i.id)}
                >
                  <History className="size-3" /> Histórico ({allFor.length})
                </Button>
                <Button size="sm" variant="outline" onClick={() => openResult(i)}>
                  <Plus className="size-3" /> Resultado
                </Button>
              </div>
              {isHistoryOpen && (
                <div className="mt-3 border-t border-border pt-3">
                  {allFor.length === 0 ? (
                    <div className="text-xs text-muted-foreground italic">Sem histórico.</div>
                  ) : (
                    <table className="w-full text-xs">
                      <thead className="text-muted-foreground">
                        <tr>
                          <th className="text-left py-1">Período</th>
                          <th className="text-right">Valor</th>
                          <th className="text-right">Status</th>
                          <th className="text-left pl-2">Notas</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {[...allFor].reverse().map((r) => (
                          <tr key={r.id} className="border-t border-border/40">
                            <td className="py-1">{r.period}</td>
                            <td className="text-right">
                              {r.value} {i.unit}
                            </td>
                            <td className="text-right">
                              <span
                                className={cn(
                                  "rounded px-1.5 py-0.5 text-[10px]",
                                  r.status === "ok"
                                    ? "bg-success/15 text-success"
                                    : "bg-warning/20 text-warning-foreground",
                                )}
                              >
                                {r.status}
                              </span>
                            </td>
                            <td className="pl-2 text-muted-foreground">{r.notes ?? ""}</td>
                            <td className="pl-2">
                              {r.status === "atencao" && (
                                <button
                                  type="button"
                                  title="Abrir plano de ação"
                                  onClick={() => createActionPlanFromResult(i, r)}
                                  className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-warning-foreground bg-warning/20 hover:bg-warning/40 transition-colors"
                                >
                                  <AlertTriangle className="size-2.5" /> Abrir ação
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal de resultado */}
      {resultDraft && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
          onClick={() => setResultDraft(null)}
        >
          <div
            className="bg-card border border-border rounded-lg p-5 w-full max-w-md shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="font-medium mb-3">Registrar resultado</div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Período</Label>
                <Input
                  type="month"
                  value={resultDraft.period}
                  onChange={(e) => setResultDraft({ ...resultDraft, period: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Valor</Label>
                <Input
                  type="number"
                  step="any"
                  value={resultDraft.value}
                  onChange={(e) => setResultDraft({ ...resultDraft, value: e.target.value })}
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Notas (opcional)</Label>
                <Input
                  value={resultDraft.notes}
                  onChange={(e) => setResultDraft({ ...resultDraft, notes: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setResultDraft(null)}>
                Cancelar
              </Button>
              <Button onClick={submitResult}>Salvar</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function OverviewCard({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  tone: "default" | "success" | "warning" | "primary";
  icon: React.ComponentType<{ className?: string }>;
}) {
  const toneCls = {
    default: "text-foreground",
    success: "text-success",
    warning: "text-warning-foreground",
    primary: "text-primary",
  }[tone];
  return (
    <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="size-3" /> {label}
      </div>
      <div className={cn("text-2xl font-semibold mt-1", toneCls)}>{value}</div>
    </div>
  );
}
