import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import {
  occurrencesStore,
  type OccurrenceRow,
  type RootCauseTool,
  type FiveWhysData,
  type IshikawaData,
  type FiveW2HData,
  type BrainstormData,
} from "@/lib/occurrences-store";
import { useTableStore } from "@/lib/table-store";
import { ArrowLeft, Plus, Trash2, Lightbulb, Fish, ListOrdered, Pencil, Table2, Link2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { risksStore } from "@/lib/risks-store";
import { suppliersStore } from "@/lib/suppliers-store";
import { useAuth } from "@/lib/auth";
import { useOccurrenceMeta, updateOccurrenceMeta, effectivenessLabel, type OccurrenceEffectiveness } from "@/lib/occurrence-meta-store";

export const Route = createFileRoute("/_app/occurrences/$id")({ component: OccDetail });

// ============================================================================
// Metadados das ferramentas
// ============================================================================
const TOOL_META: Record<RootCauseTool, { label: string; Icon: typeof ListOrdered }> = {
  "5_whys": { label: "5 Porquês", Icon: ListOrdered },
  ishikawa: { label: "Ishikawa (6M)", Icon: Fish },
  "5w2h": { label: "5W2H", Icon: Table2 },
  brainstorm: { label: "Brainstorm", Icon: Lightbulb },
};

const ISHIKAWA_GROUPS: { key: keyof IshikawaData["causes"]; label: string }[] = [
  { key: "machine", label: "Máquina" },
  { key: "method", label: "Método" },
  { key: "material", label: "Material" },
  { key: "manpower", label: "Mão de obra" },
  { key: "environment", label: "Meio ambiente" },
  { key: "measurement", label: "Medição" },
];

const emptyIshikawa = (): IshikawaData => ({
  effect: "",
  causes: { machine: [], method: [], material: [], manpower: [], environment: [], measurement: [] },
});

// ============================================================================
// 5 Porquês
// ============================================================================
function FiveWhysForm({ value, onChange }: { value: FiveWhysData; onChange: (v: FiveWhysData) => void }) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        A resposta de cada pergunta alimenta a próxima. Pare quando chegar a uma causa acionável.
      </p>
      {value.whys.map((w, i) => (
        <div key={i} className="flex gap-2 items-start">
          <div className="size-7 rounded-full bg-primary/10 text-primary text-xs font-bold grid place-items-center shrink-0 mt-1">
            {i + 1}
          </div>
          <div className="flex-1 space-y-1">
            <Label className="text-xs">
              Por quê {i + 1}
              {i > 0 && (
                <span className="text-muted-foreground font-normal"> — sobre: “{value.whys[i - 1] || "…"}”</span>
              )}
            </Label>
            <Input
              value={w}
              onChange={(e) =>
                onChange({ ...value, whys: value.whys.map((x, j) => (j === i ? e.target.value : x)) })
              }
              placeholder={`Resposta ${i + 1}`}
            />
          </div>
        </div>
      ))}
      <div className="space-y-1.5 pt-2">
        <Label className="text-xs">Causa raiz identificada</Label>
        <Textarea
          value={value.rootCause}
          onChange={(e) => onChange({ ...value, rootCause: e.target.value })}
          placeholder="Síntese final da causa raiz"
          rows={2}
        />
      </div>
    </div>
  );
}

function FiveWhysView({ data }: { data: FiveWhysData }) {
  return (
    <div className="space-y-2">
      <ol className="space-y-1.5">
        {data.whys.map((w, i) =>
          w ? (
            <li key={i} className="flex gap-2 text-sm">
              <span className="size-6 rounded-full bg-primary/10 text-primary text-xs font-bold grid place-items-center shrink-0">
                {i + 1}
              </span>
              <span>{w}</span>
            </li>
          ) : null,
        )}
      </ol>
      {data.rootCause && (
        <div className="bg-primary/5 border border-primary/30 rounded-md p-3 mt-3">
          <div className="text-xs font-semibold text-primary mb-1">Causa raiz</div>
          <div className="text-sm">{data.rootCause}</div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Ishikawa
// ============================================================================
function IshikawaForm({ value, onChange }: { value: IshikawaData; onChange: (v: IshikawaData) => void }) {
  const add = (k: keyof IshikawaData["causes"], v: string) => {
    const list = value.causes[k] ?? [];
    if (!v.trim() || list.length >= 3) return;
    onChange({ ...value, causes: { ...value.causes, [k]: [...list, v.trim()] } });
  };
  const remove = (k: keyof IshikawaData["causes"], idx: number) => {
    onChange({
      ...value,
      causes: { ...value.causes, [k]: value.causes[k].filter((_, i) => i !== idx) },
    });
  };
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs">Efeito / problema central</Label>
        <Input
          value={value.effect ?? ""}
          onChange={(e) => onChange({ ...value, effect: e.target.value })}
          placeholder="Ex: Resultado fora da especificação"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {ISHIKAWA_GROUPS.map((g) => (
          <CauseGroup
            key={g.key}
            label={g.label}
            items={value.causes[g.key] ?? []}
            onAdd={(v) => add(g.key, v)}
            onRemove={(i) => remove(g.key, i)}
          />
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground italic">Até 3 causas por categoria.</p>
    </div>
  );
}

function CauseGroup({
  label,
  items,
  onAdd,
  onRemove,
}: {
  label: string;
  items: string[];
  onAdd: (v: string) => void;
  onRemove: (i: number) => void;
}) {
  const [val, setVal] = useState("");
  const full = items.length >= 3;
  return (
    <div className="border border-border rounded-md p-3 bg-background">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold">{label}</div>
        <span className="text-[10px] text-muted-foreground">{items.length}/3</span>
      </div>
      <div className="space-y-1 mb-2">
        {items.length === 0 && <div className="text-[11px] text-muted-foreground italic">Sem causas listadas</div>}
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-1 text-xs bg-muted rounded px-2 py-1">
            <span className="flex-1">{it}</span>
            <button onClick={() => onRemove(i)} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="size-3" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-1">
        <Input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder={full ? "Limite atingido" : "Adicionar causa…"}
          disabled={full}
          className="h-8 text-xs"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onAdd(val);
              setVal("");
            }
          }}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2"
          disabled={full}
          onClick={() => {
            onAdd(val);
            setVal("");
          }}
        >
          <Plus className="size-3" />
        </Button>
      </div>
    </div>
  );
}

function IshikawaView({ data }: { data: IshikawaData }) {
  return (
    <div className="space-y-3">
      {data.effect && (
        <div className="text-sm">
          <span className="text-muted-foreground">Efeito: </span>
          <span className="font-medium">{data.effect}</span>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {ISHIKAWA_GROUPS.map((g) => {
          const items = data.causes[g.key] ?? [];
          if (items.length === 0) return null;
          return (
            <div key={g.key} className="border border-border rounded-md p-3 bg-background">
              <div className="text-xs font-semibold mb-1.5">{g.label}</div>
              <ul className="text-sm space-y-0.5 list-disc pl-4">
                {items.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// 5W2H
// ============================================================================
const FiveW2H_FIELDS: { key: keyof FiveW2HData; label: string; placeholder: string }[] = [
  { key: "what",    label: "O quê? (What)",          placeholder: "O que aconteceu / precisa ser feito?" },
  { key: "why",     label: "Por quê? (Why)",          placeholder: "Por que ocorreu / é necessário?" },
  { key: "where",   label: "Onde? (Where)",           placeholder: "Em qual local ou área?" },
  { key: "when",    label: "Quando? (When)",          placeholder: "Em que período ou prazo?" },
  { key: "who",     label: "Quem? (Who)",             placeholder: "Quem é o responsável?" },
  { key: "how",     label: "Como? (How)",             placeholder: "Como será executado?" },
  { key: "howMuch", label: "Quanto custa? (How Much)",placeholder: "Qual o custo ou esforço estimado?" },
];

function FiveW2HForm({ value, onChange }: { value: FiveW2HData; onChange: (v: FiveW2HData) => void }) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Responda cada dimensão para estruturar a análise completa da ocorrência.
      </p>
      {FiveW2H_FIELDS.map((f) => (
        <div key={f.key} className="space-y-1">
          <Label className="text-xs font-semibold">{f.label}</Label>
          <Textarea
            value={value[f.key]}
            placeholder={f.placeholder}
            rows={2}
            onChange={(e) => onChange({ ...value, [f.key]: e.target.value })}
          />
        </div>
      ))}
    </div>
  );
}

function FiveW2HView({ data }: { data: FiveW2HData }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {FiveW2H_FIELDS.map((f) => {
        const val = data[f.key];
        if (!val) return null;
        return (
          <div key={f.key} className="border border-border rounded-md p-3 bg-background">
            <div className="text-xs font-semibold text-primary mb-1">{f.label}</div>
            <div className="text-sm">{val}</div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Brainstorm
// ============================================================================
function BrainstormForm({ value, onChange }: { value: BrainstormData; onChange: (v: BrainstormData) => void }) {
  const [val, setVal] = useState("");
  const add = () => {
    if (!val.trim()) return;
    onChange({ ...value, ideas: [...value.ideas, val.trim()] });
    setVal("");
  };
  const remove = (i: number) =>
    onChange({ ...value, ideas: value.ideas.filter((_, j) => j !== i) });
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Liste todas as ideias da equipe e selecione a mais provável.</p>
      <div className="flex gap-2">
        <Input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder="Nova ideia…"
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <Button type="button" onClick={add}>
          <Plus className="size-4" /> Adicionar
        </Button>
      </div>
      <div className="space-y-1.5">
        {value.ideas.length === 0 && (
          <div className="text-xs text-muted-foreground italic">Nenhuma ideia registrada ainda.</div>
        )}
        {value.ideas.map((idea, i) => (
          <div
            key={i}
            className="flex items-center gap-2 border border-border rounded-md px-3 py-2 hover:bg-accent/30"
          >
            <span className="text-sm flex-1">{idea}</span>
            <button onClick={() => remove(i)} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
      <div className="space-y-1.5 pt-2">
        <Label className="text-xs">Causa selecionada</Label>
        <Textarea
          value={value.selected}
          onChange={(e) => onChange({ ...value, selected: e.target.value })}
          placeholder="Causa mais provável escolhida pela equipe"
          rows={2}
        />
      </div>
    </div>
  );
}

function BrainstormView({ data }: { data: BrainstormData }) {
  return (
    <div className="space-y-2">
      {data.ideas.length > 0 && (
        <ul className="text-sm space-y-0.5 list-disc pl-4">
          {data.ideas.map((i, idx) => (
            <li key={idx}>{i}</li>
          ))}
        </ul>
      )}
      {data.selected && (
        <div className="bg-primary/5 border border-primary/30 rounded-md p-3 mt-2">
          <div className="text-xs font-semibold text-primary mb-1">Causa selecionada</div>
          <div className="text-sm">{data.selected}</div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Bloco "Análise de Causa Raiz"
// ============================================================================
function RootCauseSection({ occurrence }: { occurrence: OccurrenceRow }) {
  const saved = occurrence.root_cause_tool ?? null;
  const [editing, setEditing] = useState(!saved);
  const [tool, setTool] = useState<RootCauseTool>(saved ?? "5_whys");

  const empty5W2H = (): FiveW2HData => ({
    what: "", why: "", where: "", when: "", who: "", how: "", howMuch: "",
  });

  const initial = useMemo<{
    "5_whys": FiveWhysData;
    ishikawa: IshikawaData;
    "5w2h": FiveW2HData;
    brainstorm: BrainstormData;
  }>(() => {
    const base = {
      "5_whys": { whys: ["", "", "", "", ""], rootCause: "" } as FiveWhysData,
      ishikawa: emptyIshikawa(),
      "5w2h": empty5W2H(),
      brainstorm: { ideas: [], selected: "" } as BrainstormData,
    };
    if (saved && occurrence.root_cause_data) {
      (base as any)[saved] = occurrence.root_cause_data;
    }
    return base;
  }, [saved, occurrence.root_cause_data]);

  const [fiveWhys, setFiveWhys] = useState<FiveWhysData>(initial["5_whys"]);
  const [ishikawa, setIshikawa] = useState<IshikawaData>(initial.ishikawa);
  const [fiveW2H, setFiveW2H] = useState<FiveW2HData>(initial["5w2h"]);
  const [brainstorm, setBrainstorm] = useState<BrainstormData>(initial.brainstorm);

  // Sync quando a ocorrência (props) muda externamente
  useEffect(() => {
    setFiveWhys(initial["5_whys"]);
    setIshikawa(initial.ishikawa);
    setFiveW2H(initial["5w2h"]);
    setBrainstorm(initial.brainstorm);
    setTool(saved ?? "5_whys");
    setEditing(!saved);
  }, [initial, saved]);

  const currentData = (): { tool: RootCauseTool; data: FiveWhysData | IshikawaData | FiveW2HData | BrainstormData } => {
    if (tool === "5_whys") return { tool, data: fiveWhys };
    if (tool === "ishikawa") return { tool, data: ishikawa };
    if (tool === "5w2h") return { tool, data: fiveW2H };
    return { tool, data: brainstorm };
  };

  const handleSave = async () => {
    const { tool: t, data } = currentData();
    await occurrencesStore.upsert({
      ...occurrence,
      root_cause_tool: t,
      root_cause_data: data,
    });
    toast.success("Análise de causa raiz salva", { description: TOOL_META[t].label });
    setEditing(false);
  };

  const handleCancel = () => {
    setFiveWhys(initial["5_whys"]);
    setIshikawa(initial.ishikawa);
    setBrainstorm(initial.brainstorm);
    setTool(saved ?? "5_whys");
    setEditing(!saved);
  };

  // Modo leitura
  if (!editing && saved && occurrence.root_cause_data) {
    const { Icon, label } = TOOL_META[saved];
    return (
      <section className="lg:col-span-2 bg-card border border-border rounded-lg p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Análise de causa raiz</h3>
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="size-3.5 mr-1" /> Editar
          </Button>
        </div>
        <div className="inline-flex items-center gap-1.5 text-xs font-medium bg-primary/10 text-primary rounded-full px-3 py-1 mb-4">
          <Icon className="size-3.5" /> {label}
        </div>
        {saved === "5_whys" && <FiveWhysView data={occurrence.root_cause_data as FiveWhysData} />}
        {saved === "ishikawa" && <IshikawaView data={occurrence.root_cause_data as IshikawaData} />}
        {saved === "5w2h" && <FiveW2HView data={occurrence.root_cause_data as FiveW2HData} />}
        {saved === "brainstorm" && <BrainstormView data={occurrence.root_cause_data as BrainstormData} />}
      </section>
    );
  }

  // Modo edição
  return (
    <section className="lg:col-span-2 bg-card border border-border rounded-lg p-5 shadow-sm">
      <h3 className="text-sm font-semibold mb-3">Análise de causa raiz</h3>
      <Tabs value={tool} onValueChange={(v) => setTool(v as RootCauseTool)}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="5_whys">
            <ListOrdered className="size-3.5 mr-1" /> 5 Porquês
          </TabsTrigger>
          <TabsTrigger value="ishikawa">
            <Fish className="size-3.5 mr-1" /> Ishikawa
          </TabsTrigger>
          <TabsTrigger value="5w2h">
            <Table2 className="size-3.5 mr-1" /> 5W2H
          </TabsTrigger>
          <TabsTrigger value="brainstorm">
            <Lightbulb className="size-3.5 mr-1" /> Brainstorm
          </TabsTrigger>
        </TabsList>
        <TabsContent value="5_whys" className="pt-4">
          <FiveWhysForm value={fiveWhys} onChange={setFiveWhys} />
        </TabsContent>
        <TabsContent value="ishikawa" className="pt-4">
          <IshikawaForm value={ishikawa} onChange={setIshikawa} />
        </TabsContent>
        <TabsContent value="5w2h" className="pt-4">
          <FiveW2HForm value={fiveW2H} onChange={setFiveW2H} />
        </TabsContent>
        <TabsContent value="brainstorm" className="pt-4">
          <BrainstormForm value={brainstorm} onChange={setBrainstorm} />
        </TabsContent>
      </Tabs>

      <div className={cn("mt-6 flex justify-end gap-2", !saved && "")}>
        {saved && (
          <Button variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
        )}
        <Button onClick={handleSave}>Salvar análise</Button>
      </div>
    </section>
  );
}

// ============================================================================
// Verificação de Eficácia
// ============================================================================
const STATUS_CFG: Record<OccurrenceEffectiveness["status"], { cls: string }> = {
  pendente:   { cls: "bg-yellow-50 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300" },
  eficaz:     { cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" },
  nao_eficaz: { cls: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300" },
  parcial:    { cls: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300" },
};

function EfficacyCard({ occurrenceId }: { occurrenceId: string }) {
  const { user } = useAuth();
  const { meta, loading } = useOccurrenceMeta(occurrenceId);
  const eff = meta.effectiveness;
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<OccurrenceEffectiveness["status"]>("pendente");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setStatus(eff.status);
    setNotes(eff.notes ?? "");
  }, [eff.status, eff.notes]);

  const handleSave = async () => {
    setBusy(true);
    try {
      await updateOccurrenceMeta(
        occurrenceId,
        (prev) => ({
          ...prev,
          effectiveness: {
            status,
            verified_at: new Date().toISOString(),
            verified_by: user?.name ?? null,
            notes: notes.trim() || null,
          },
        }),
        { action: "Eficácia verificada", actor: user?.name ?? null, detail: effectivenessLabel[status] },
      );
      toast.success("Verificação de eficácia registrada");
      setEditing(false);
    } catch {
      toast.error("Falha ao salvar verificação");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <section className="bg-card border border-border rounded-lg p-5 shadow-sm">
        <h3 className="text-sm font-semibold mb-3">Verificação de Eficácia</h3>
        <div className="text-xs text-muted-foreground">Carregando…</div>
      </section>
    );
  }

  if (!editing && eff.status !== "pendente") {
    return (
      <section className="bg-card border border-border rounded-lg p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Verificação de Eficácia</h3>
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="size-3.5 mr-1" /> Editar
          </Button>
        </div>
        <div className={cn("rounded-md px-3 py-2 text-sm font-medium", STATUS_CFG[eff.status].cls)}>
          {effectivenessLabel[eff.status]}
        </div>
        {eff.notes && <p className="text-xs text-muted-foreground mt-2">{eff.notes}</p>}
        {eff.verified_at && (
          <p className="text-[11px] text-muted-foreground mt-1">
            Verificado por {eff.verified_by ?? "—"} em {new Date(eff.verified_at).toLocaleString("pt-BR")}
          </p>
        )}
      </section>
    );
  }

  return (
    <section className="bg-card border border-border rounded-lg p-5 shadow-sm">
      <h3 className="text-sm font-semibold mb-3">Verificação de Eficácia</h3>
      <p className="text-xs text-muted-foreground mb-3">
        Após a execução das ações corretivas, registre se a ocorrência foi efetivamente eliminada.
      </p>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {(["eficaz", "parcial", "nao_eficaz", "pendente"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={cn(
                "rounded-md border px-3 py-2 text-xs font-medium transition-colors text-left",
                status === s ? cn(STATUS_CFG[s].cls, "border-current") : "border-border hover:border-muted-foreground",
              )}
            >
              {effectivenessLabel[s]}
            </button>
          ))}
        </div>
        <div>
          <Label className="text-xs">Observações</Label>
          <Textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Descreva as evidências que comprovam a eficácia…"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        {eff.status !== "pendente" && (
          <Button variant="outline" size="sm" onClick={() => setEditing(false)}>Cancelar</Button>
        )}
        <Button size="sm" onClick={handleSave} disabled={busy}>
          {busy && <span className="size-3.5 animate-spin border-2 border-current border-t-transparent rounded-full mr-1" />}
          Registrar verificação
        </Button>
      </div>
    </section>
  );
}

// ============================================================================
// Vínculos entre módulos
// ============================================================================
function LinksCard({ occurrenceId }: { occurrenceId: string }) {
  const { user } = useAuth();
  const { meta, loading } = useOccurrenceMeta(occurrenceId);
  const risks = useTableStore(risksStore);
  const suppliers = useTableStore(suppliersStore);

  const [riskId, setRiskId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setRiskId(meta.linked_risk_id ?? "");
    setSupplierId(meta.linked_supplier_id ?? "");
  }, [meta.linked_risk_id, meta.linked_supplier_id]);

  const handleSave = async () => {
    setBusy(true);
    try {
      await updateOccurrenceMeta(
        occurrenceId,
        (prev) => ({ ...prev, linked_risk_id: riskId || null, linked_supplier_id: supplierId || null }),
        { action: "Vínculos atualizados", actor: user?.name ?? null },
      );
      toast.success("Vínculos salvos");
    } catch {
      toast.error("Falha ao salvar vínculos");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="bg-card border border-border rounded-lg p-5 shadow-sm">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <Link2 className="size-4" /> Vínculos
      </h3>
      {loading ? (
        <div className="text-xs text-muted-foreground">Carregando…</div>
      ) : (
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Risco relacionado</Label>
            <select
              value={riskId}
              onChange={(e) => setRiskId(e.target.value)}
              className="w-full mt-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">— nenhum —</option>
              {risks.map((r) => (
                <option key={r.id} value={r.id}>{r.process} — {r.description.slice(0, 50)}</option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs">Fornecedor relacionado</Label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full mt-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">— nenhum —</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={handleSave} disabled={busy}>
              {busy && <span className="size-3.5 animate-spin border-2 border-current border-t-transparent rounded-full mr-1" />}
              Salvar vínculos
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

// ============================================================================
// Página
// ============================================================================
function OccDetail() {
  const { id } = Route.useParams();
  const occurrences = useTableStore(occurrencesStore);
  const o = occurrences.find((x) => x.id === id);
  if (!o) {
    return (
      <>
        <Link to="/occurrences" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="size-4 mr-1" /> Voltar
        </Link>
        <PageHeader title="Ocorrência não encontrada" description={id} />
      </>
    );
  }
  return (
    <>
      <Link to="/occurrences" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="size-4 mr-1" /> Voltar
      </Link>
      <PageHeader
        title={o.description}
        description={`${o.id} · ${o.type} · Origem ${o.origin}`}
        actions={<StatusBadge>{o.status}</StatusBadge>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <RootCauseSection occurrence={o} />

        <aside className="space-y-4">
          <section className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-semibold mb-3">Dados</h3>
            <dl className="text-sm space-y-1.5">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Severidade</dt>
                <dd>
                  <StatusBadge>{o.severity}</StatusBadge>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Responsável</dt>
                <dd>{o.responsible ?? "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Identificada</dt>
                <dd>{o.date ?? "—"}</dd>
              </div>
            </dl>
          </section>
          <EfficacyCard occurrenceId={o.id} />
          <LinksCard occurrenceId={o.id} />
        </aside>
      </div>
    </>
  );
}
