import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuditAccess } from "@/lib/audit";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import {
  occurrencesStore,
  type OccurrenceRow,
  type RootCauseTool,
  type FiveWhysData,
  type IshikawaData,
  type BrainstormData,
  type FiveW2HData as RootCauseFiveW2HData,
  STATUS_OPTIONS,
  SEVERITY_OPTIONS,
  TYPE_OPTIONS,
  ORIGIN_OPTIONS,
  typeLabel,
  originLabel,
  statusLabel,
} from "@/lib/occurrences-store";
import {
  useOccurrenceMeta,
  updateOccurrenceMeta,
  emptyFiveW2H,
  effectivenessLabel,
  type FiveW2HData,
  type OccurrenceAttachment,
  type OccurrenceCustomField,
} from "@/lib/occurrence-meta-store";
import { useTableStore } from "@/lib/table-store";
import { profilesStore, profileName } from "@/lib/profiles-store";
import { risksStore } from "@/lib/risks-store";
import { suppliersStore } from "@/lib/suppliers-store";
import { auditsStore } from "@/lib/audits-store";
import { documentsStore } from "@/lib/documents-store";
import { actionPlansStore } from "@/lib/action-plans-store";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Lightbulb,
  Fish,
  ListOrdered,
  Pencil,
  Paperclip,
  History,
  Link2,
  ClipboardList,
  ShieldCheck,
  AlertTriangle,
  Save,
  Loader2,
  LayoutGrid,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_app/occurrences/$id")({ component: OccDetail });

// ========== Helpers ==========
const TOOL_META: Record<RootCauseTool, { label: string; Icon: typeof ListOrdered }> = {
  "5_whys": { label: "5 Porquês", Icon: ListOrdered },
  ishikawa: { label: "Ishikawa (6M)", Icon: Fish },
  brainstorm: { label: "Brainstorm", Icon: Lightbulb },
  "5w2h": { label: "5W2H", Icon: LayoutGrid },
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

function newId(_prefix?: string) {
  return crypto.randomUUID();
}

function isOverdue(deadline: string | null, status: string) {
  if (!deadline || status === "concluida" || status === "cancelada") return false;
  return new Date(deadline + "T23:59:59").getTime() < Date.now();
}

// ============================================================================
// 5 Porquês
// ============================================================================
function FiveWhysForm({
  value,
  onChange,
}: {
  value: FiveWhysData;
  onChange: (v: FiveWhysData) => void;
}) {
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
                <span className="text-muted-foreground font-normal">
                  {" "}
                  — sobre: "{value.whys[i - 1] || "…"}"
                </span>
              )}
            </Label>
            <Input
              value={w}
              onChange={(e) =>
                onChange({
                  ...value,
                  whys: value.whys.map((x, j) => (j === i ? e.target.value : x)),
                })
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
function IshikawaForm({
  value,
  onChange,
}: {
  value: IshikawaData;
  onChange: (v: IshikawaData) => void;
}) {
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
        {items.length === 0 && (
          <div className="text-[11px] text-muted-foreground italic">Sem causas listadas</div>
        )}
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-1 text-xs bg-muted rounded px-2 py-1">
            <span className="flex-1">{it}</span>
            <button
              onClick={() => onRemove(i)}
              className="text-muted-foreground hover:text-destructive"
            >
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
// Brainstorm
// ============================================================================
function BrainstormForm({
  value,
  onChange,
}: {
  value: BrainstormData;
  onChange: (v: BrainstormData) => void;
}) {
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
      <p className="text-xs text-muted-foreground">
        Liste todas as ideias da equipe e selecione a mais provável.
      </p>
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
          <div className="text-xs text-muted-foreground italic">
            Nenhuma ideia registrada ainda.
          </div>
        )}
        {value.ideas.map((idea, i) => (
          <div
            key={i}
            className="flex items-center gap-2 border border-border rounded-md px-3 py-2 hover:bg-accent/30"
          >
            <span className="text-sm flex-1">{idea}</span>
            <button
              onClick={() => remove(i)}
              className="text-muted-foreground hover:text-destructive"
            >
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
// 5W2H (causa raiz)
// ============================================================================
const EMPTY_5W2H: RootCauseFiveW2HData = { what: "", why: "", where: "", when: "", who: "", how: "", how_much: "" };
const W2H_FIELDS: { key: keyof RootCauseFiveW2HData; label: string; placeholder: string; multiline?: boolean }[] = [
  { key: "what", label: "What — O quê?", placeholder: "O que ocorreu / qual o problema", multiline: true },
  { key: "why", label: "Why — Por quê?", placeholder: "Por que aconteceu", multiline: true },
  { key: "where", label: "Where — Onde?", placeholder: "Onde foi identificado" },
  { key: "when", label: "When — Quando?", placeholder: "Quando ocorreu" },
  { key: "who", label: "Who — Quem?", placeholder: "Quem está envolvido / responsável" },
  { key: "how", label: "How — Como?", placeholder: "Como será tratado", multiline: true },
  { key: "how_much", label: "How Much — Quanto custa?", placeholder: "Custo estimado do tratamento" },
];
function RootCauseFiveW2HForm({ value, onChange }: { value: RootCauseFiveW2HData; onChange: (v: RootCauseFiveW2HData) => void }) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Estruture a análise da causa raiz usando os 7 elementos do 5W2H.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {W2H_FIELDS.map((f) => (
          <div key={f.key} className={cn("space-y-1.5", f.multiline && "md:col-span-2")}>
            <Label className="text-xs">{f.label}</Label>
            {f.multiline ? (
              <Textarea rows={2} value={value[f.key]} onChange={(e) => onChange({ ...value, [f.key]: e.target.value })} placeholder={f.placeholder} />
            ) : (
              <Input value={value[f.key]} onChange={(e) => onChange({ ...value, [f.key]: e.target.value })} placeholder={f.placeholder} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
function RootCauseFiveW2HView({ data }: { data: RootCauseFiveW2HData }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {W2H_FIELDS.filter((f) => data[f.key]).map((f) => (
        <div key={f.key} className={cn("border border-border rounded-md p-3 bg-background", f.multiline && "md:col-span-2")}>
          <div className="text-xs font-semibold mb-1">{f.label}</div>
          <div className="text-sm">{data[f.key]}</div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Causa raiz (todas as ferramentas)
// ============================================================================
function RootCauseSection({ occurrence }: { occurrence: OccurrenceRow }) {
  const saved = occurrence.root_cause_tool ?? null;
  const [editing, setEditing] = useState(!saved);
  const [tool, setTool] = useState<RootCauseTool>(saved ?? "5_whys");

  const initial = useMemo(() => {
    const base = {
      "5_whys": { whys: ["", "", "", "", ""], rootCause: "" } as FiveWhysData,
      ishikawa: emptyIshikawa(),
      brainstorm: { ideas: [], selected: "" } as BrainstormData,
      "5w2h": { ...EMPTY_5W2H } as RootCauseFiveW2HData,
    };
    if (saved && occurrence.root_cause_data) {
      (base as any)[saved] = occurrence.root_cause_data;
    }
    return base;
  }, [saved, occurrence.root_cause_data]);

  const [fiveWhys, setFiveWhys] = useState<FiveWhysData>(initial["5_whys"]);
  const [ishikawa, setIshikawa] = useState<IshikawaData>(initial.ishikawa);
  const [brainstorm, setBrainstorm] = useState<BrainstormData>(initial.brainstorm);
  const [fiveW2h, setFiveW2h] = useState<RootCauseFiveW2HData>(initial["5w2h"]);

  useEffect(() => {
    setFiveWhys(initial["5_whys"]);
    setIshikawa(initial.ishikawa);
    setBrainstorm(initial.brainstorm);
    setFiveW2h(initial["5w2h"]);
    setTool(saved ?? "5_whys");
    setEditing(!saved);
  }, [initial, saved]);

  const currentData = () => {
    if (tool === "5_whys") return { tool, data: fiveWhys };
    if (tool === "ishikawa") return { tool, data: ishikawa };
    if (tool === "5w2h") return { tool, data: fiveW2h };
    return { tool, data: brainstorm };
  };

  const handleSave = async () => {
    const { tool: t, data } = currentData();
    await occurrencesStore.upsert({ ...occurrence, root_cause_tool: t, root_cause_data: data });
    await updateOccurrenceMeta(occurrence.id, (p) => p, {
      action: "Análise de causa raiz salva",
      detail: TOOL_META[t].label,
    });
    toast.success("Análise de causa raiz salva");
    setEditing(false);
  };

  if (!editing && saved && occurrence.root_cause_data) {
    const { Icon, label } = TOOL_META[saved];
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="inline-flex items-center gap-1.5 text-xs font-medium bg-primary/10 text-primary rounded-full px-3 py-1">
            <Icon className="size-3.5" /> {label}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="size-3.5 mr-1" /> Editar
          </Button>
        </div>
        {saved === "5_whys" && <FiveWhysView data={occurrence.root_cause_data as FiveWhysData} />}
        {saved === "ishikawa" && <IshikawaView data={occurrence.root_cause_data as IshikawaData} />}
        {saved === "brainstorm" && (
          <BrainstormView data={occurrence.root_cause_data as BrainstormData} />
        )}
        {saved === "5w2h" && <RootCauseFiveW2HView data={occurrence.root_cause_data as RootCauseFiveW2HData} />}
      </div>
    );
  }

  return (
    <div>
      <Tabs value={tool} onValueChange={(v) => setTool(v as RootCauseTool)}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="5_whys">
            <ListOrdered className="size-3.5 mr-1" /> 5 Porquês
          </TabsTrigger>
          <TabsTrigger value="ishikawa">
            <Fish className="size-3.5 mr-1" /> Ishikawa
          </TabsTrigger>
          <TabsTrigger value="brainstorm">
            <Lightbulb className="size-3.5 mr-1" /> Brainstorm
          </TabsTrigger>
          <TabsTrigger value="5w2h">
            <LayoutGrid className="size-3.5 mr-1" /> 5W2H
          </TabsTrigger>
        </TabsList>
        <TabsContent value="5_whys" className="pt-4">
          <FiveWhysForm value={fiveWhys} onChange={setFiveWhys} />
        </TabsContent>
        <TabsContent value="ishikawa" className="pt-4">
          <IshikawaForm value={ishikawa} onChange={setIshikawa} />
        </TabsContent>
        <TabsContent value="brainstorm" className="pt-4">
          <BrainstormForm value={brainstorm} onChange={setBrainstorm} />
        </TabsContent>
        <TabsContent value="5w2h" className="pt-4">
          <RootCauseFiveW2HForm value={fiveW2h} onChange={setFiveW2h} />
        </TabsContent>
      </Tabs>
      <div className={cn("mt-6 flex justify-end gap-2")}>
        {saved && (
          <Button variant="outline" onClick={() => setEditing(false)}>
            Cancelar
          </Button>
        )}
        <Button onClick={handleSave}>
          <Save className="size-4 mr-1" /> Salvar análise
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// 5W2H
// ============================================================================
function FiveW2HSection({
  occurrenceId,
  value,
}: {
  occurrenceId: string;
  value: FiveW2HData | null;
}) {
  const [data, setData] = useState<FiveW2HData>(value ?? emptyFiveW2H());
  useEffect(() => {
    setData(value ?? emptyFiveW2H());
  }, [value]);

  const fields: { key: keyof FiveW2HData; label: string; placeholder: string; type?: string }[] = [
    { key: "what", label: "What — O quê", placeholder: "O que será feito" },
    { key: "why", label: "Why — Por quê", placeholder: "Justificativa" },
    { key: "where", label: "Where — Onde", placeholder: "Local / processo" },
    { key: "when", label: "When — Quando", placeholder: "Data alvo", type: "date" },
    { key: "who", label: "Who — Quem", placeholder: "Responsável" },
    { key: "how", label: "How — Como", placeholder: "Método / passos" },
    { key: "how_much", label: "How much — Quanto", placeholder: "Custo estimado" },
  ];

  const save = async () => {
    await updateOccurrenceMeta(occurrenceId, (prev) => ({ ...prev, five_w2h: data }), {
      action: "5W2H atualizado",
    });
    toast.success("5W2H salvo");
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Estruture o plano de tratamento da ocorrência usando 5W2H.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {fields.map((f) => (
          <div key={f.key} className="space-y-1.5">
            <Label className="text-xs">{f.label}</Label>
            {f.key === "how" || f.key === "what" || f.key === "why" ? (
              <Textarea
                rows={2}
                value={data[f.key]}
                onChange={(e) => setData({ ...data, [f.key]: e.target.value })}
                placeholder={f.placeholder}
              />
            ) : (
              <Input
                type={f.type ?? "text"}
                value={data[f.key]}
                onChange={(e) => setData({ ...data, [f.key]: e.target.value })}
                placeholder={f.placeholder}
              />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <Button onClick={save}>
          <Save className="size-4 mr-1" /> Salvar 5W2H
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Visão geral / edição inline
// ============================================================================
function OverviewSection({
  occurrence,
  deadline,
  onSaved,
}: {
  occurrence: OccurrenceRow;
  deadline: string | null;
  onSaved: () => void;
}) {
  const profiles = useTableStore(profilesStore);
  const risks = useTableStore(risksStore);
  const suppliers = useTableStore(suppliersStore);
  const audits = useTableStore(auditsStore);
  const documents = useTableStore(documentsStore);
  const { meta } = useOccurrenceMeta(occurrence.id);

  const [draft, setDraft] = useState<OccurrenceRow>(occurrence);
  const [draftDeadline, setDraftDeadline] = useState<string>(deadline ?? "");
  const [linkedRisk, setLinkedRisk] = useState<string>(meta.linked_risk_id ?? "");
  const [linkedSupplier, setLinkedSupplier] = useState<string>(meta.linked_supplier_id ?? "");

  useEffect(() => {
    setDraft(occurrence);
  }, [occurrence]);
  useEffect(() => {
    setDraftDeadline(deadline ?? "");
  }, [deadline]);
  useEffect(() => {
    setLinkedRisk(meta.linked_risk_id ?? "");
    setLinkedSupplier(meta.linked_supplier_id ?? "");
  }, [meta.linked_risk_id, meta.linked_supplier_id]);

  const save = async () => {
    const changed: string[] = [];
    if (draft.status !== occurrence.status) changed.push(`status → ${statusLabel(draft.status)}`);
    if (draft.severity !== occurrence.severity) changed.push(`severidade → ${draft.severity}`);
    if (draft.responsible_id !== occurrence.responsible_id) changed.push(`responsável alterado`);
    if (draft.type !== occurrence.type) changed.push(`tipo → ${typeLabel(draft.type)}`);

    await occurrencesStore.upsert(draft);
    await updateOccurrenceMeta(
      occurrence.id,
      (p) => ({
        ...p,
        deadline: draftDeadline || null,
        linked_risk_id: linkedRisk || null,
        linked_supplier_id: linkedSupplier || null,
      }),
      changed.length ? { action: "Ocorrência atualizada", detail: changed.join(", ") } : undefined,
    );
    toast.success("Alterações salvas");
    onSaved();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1.5 md:col-span-2">
          <Label className="text-xs">Descrição</Label>
          <Textarea
            rows={2}
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Tipo</Label>
          <Select value={draft.type} onValueChange={(v) => setDraft({ ...draft, type: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map((o) => (
                <SelectItem key={o} value={o}>
                  {typeLabel(o)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Origem</Label>
          <Select value={draft.origin} onValueChange={(v) => setDraft({ ...draft, origin: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ORIGIN_OPTIONS.map((o) => (
                <SelectItem key={o} value={o}>
                  {originLabel(o)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Severidade</Label>
          <Select value={draft.severity} onValueChange={(v) => setDraft({ ...draft, severity: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEVERITY_OPTIONS.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Status</Label>
          <Select value={draft.status} onValueChange={(v) => setDraft({ ...draft, status: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o} value={o}>
                  {statusLabel(o)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Identificada em</Label>
          <Input
            type="date"
            value={draft.occurred_at ?? ""}
            onChange={(e) => setDraft({ ...draft, occurred_at: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Prazo de tratamento</Label>
          <Input
            type="date"
            value={draftDeadline}
            onChange={(e) => setDraftDeadline(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Responsável</Label>
          <Select
            value={draft.responsible_id ?? ""}
            onValueChange={(v) => setDraft({ ...draft, responsible_id: v || null })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecionar…" />
            </SelectTrigger>
            <SelectContent>
              {profiles.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label className="text-xs">Ação imediata / contenção</Label>
          <Textarea
            rows={2}
            value={draft.immediate_action ?? ""}
            onChange={(e) => setDraft({ ...draft, immediate_action: e.target.value })}
          />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label className="text-xs">Causa raiz (resumo livre)</Label>
          <Textarea
            rows={2}
            value={draft.root_cause ?? ""}
            onChange={(e) => setDraft({ ...draft, root_cause: e.target.value })}
            placeholder="Resumo da causa raiz (também pode usar as ferramentas na aba Causa Raiz)"
          />
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <h4 className="text-xs font-semibold mb-3 flex items-center gap-1.5">
          <Link2 className="size-3.5" /> Vínculos
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Auditoria</Label>
            <Select
              value={draft.linked_audit_id ?? "__none"}
              onValueChange={(v) =>
                setDraft({ ...draft, linked_audit_id: v === "__none" ? null : v })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Nenhuma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Nenhuma</SelectItem>
                {audits.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.code ?? a.id} — {a.scope}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Documento</Label>
            <Select
              value={draft.linked_document_id ?? "__none"}
              onValueChange={(v) =>
                setDraft({ ...draft, linked_document_id: v === "__none" ? null : v })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Nenhum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Nenhum</SelectItem>
                {documents.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.code} — {d.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Risco</Label>
            <Select
              value={linkedRisk || "__none"}
              onValueChange={(v) => setLinkedRisk(v === "__none" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Nenhum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Nenhum</SelectItem>
                {risks.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.process} — {r.description.slice(0, 50)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Fornecedor</Label>
            <Select
              value={linkedSupplier || "__none"}
              onValueChange={(v) => setLinkedSupplier(v === "__none" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Nenhum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Nenhum</SelectItem>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={save}>
          <Save className="size-4 mr-1" /> Salvar alterações
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Plano de ação
// ============================================================================
function ActionPlansSection({ occurrenceId }: { occurrenceId: string }) {
  const allPlans = useTableStore(actionPlansStore);
  const profiles = useTableStore(profilesStore);
  const linked = useMemo(
    () => allPlans.filter((p) => p.origin_type === "occurrence" && p.origin_id === occurrenceId),
    [allPlans, occurrenceId],
  );

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({
    description: "",
    responsible_id: "",
    deadline: "",
    priority: "media",
  });

  const create = async () => {
    if (!draft.description.trim()) {
      toast.error("Informe a ação");
      return;
    }
    await actionPlansStore.upsert({
      id: newId("AP"),
      origin_type: "occurrence",
      origin_id: occurrenceId,
      description: draft.description,
      responsible_id: draft.responsible_id || null,
      deadline: draft.deadline || null,
      priority: draft.priority,
      status: "pendente",
      progress: 0,
    } as any);
    await updateOccurrenceMeta(occurrenceId, (p) => p, {
      action: "Ação criada",
      detail: draft.description.slice(0, 80),
    });
    toast.success("Ação registrada");
    setOpen(false);
    setDraft({ description: "", responsible_id: "", deadline: "", priority: "media" });
  };

  const updateProgress = async (id: string, progress: number) => {
    const plan = linked.find((p) => p.id === id);
    if (!plan) return;
    const status = progress >= 100 ? "concluida" : progress > 0 ? "em_andamento" : "pendente";
    await actionPlansStore.upsert({ ...plan, progress, status } as any);
  };

  const remove = async (id: string) => {
    await actionPlansStore.remove(id);
    await updateOccurrenceMeta(occurrenceId, (p) => p, { action: "Ação removida" });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {linked.length} ação(ões) vinculada(s) a esta ocorrência.
        </p>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="size-4 mr-1" /> Nova ação
        </Button>
      </div>

      {linked.length === 0 && (
        <div className="text-sm text-muted-foreground italic py-6 text-center border border-dashed border-border rounded">
          Nenhuma ação registrada ainda.
        </div>
      )}

      {linked.map((p: any) => {
        const overdue = isOverdue(p.deadline, p.status);
        return (
          <div
            key={p.id}
            className={cn(
              "border rounded-md p-3 space-y-2",
              overdue ? "border-destructive/50 bg-destructive/5" : "border-border",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="text-sm font-medium">{p.description}</div>
                <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                  <span>Resp.: {profileName(p.responsible_id)}</span>
                  {p.deadline && (
                    <span className={overdue ? "text-destructive font-medium" : ""}>
                      Prazo: {p.deadline}
                      {overdue && " ⚠ vencida"}
                    </span>
                  )}
                  <span>Prioridade: {p.priority}</span>
                  <StatusBadge>{p.status}</StatusBadge>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => remove(p.id)}>
                <Trash2 className="size-3.5 text-destructive" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={100}
                step={10}
                value={p.progress ?? 0}
                onChange={(e) => updateProgress(p.id, Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-xs font-mono w-10 text-right">{p.progress ?? 0}%</span>
            </div>
          </div>
        );
      })}

      {open && (
        <div className="border border-border rounded-md p-3 space-y-2 bg-accent/30">
          <Textarea
            rows={2}
            placeholder="Descrição da ação"
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          />
          <div className="grid grid-cols-3 gap-2">
            <Select
              value={draft.responsible_id}
              onValueChange={(v) => setDraft({ ...draft, responsible_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Responsável" />
              </SelectTrigger>
              <SelectContent>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={draft.deadline}
              onChange={(e) => setDraft({ ...draft, deadline: e.target.value })}
            />
            <Select
              value={draft.priority}
              onValueChange={(v) => setDraft({ ...draft, priority: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="baixa">Baixa</SelectItem>
                <SelectItem value="media">Média</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="critica">Crítica</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={create}>
              Adicionar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Eficácia
// ============================================================================
function EffectivenessSection({ occurrenceId, value }: { occurrenceId: string; value: any }) {
  const profiles = useTableStore(profilesStore);
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  const save = async () => {
    await updateOccurrenceMeta(occurrenceId, (p) => ({ ...p, effectiveness: draft }), {
      action: `Eficácia: ${effectivenessLabel[draft.status as keyof typeof effectivenessLabel]}`,
    });
    toast.success("Verificação registrada");
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Após implementadas as ações, registre a verificação de eficácia.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Status</Label>
          <Select value={draft.status} onValueChange={(v) => setDraft({ ...draft, status: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(effectivenessLabel).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Verificado em</Label>
          <Input
            type="date"
            value={draft.verified_at ?? ""}
            onChange={(e) => setDraft({ ...draft, verified_at: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Verificado por</Label>
          <Select
            value={draft.verified_by ?? ""}
            onValueChange={(v) => setDraft({ ...draft, verified_by: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecionar…" />
            </SelectTrigger>
            <SelectContent>
              {profiles.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Observações</Label>
        <Textarea
          rows={3}
          value={draft.notes ?? ""}
          onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
          placeholder="Evidências da verificação, indicadores monitorados, etc."
        />
      </div>
      <div className="flex justify-end">
        <Button onClick={save}>
          <ShieldCheck className="size-4 mr-1" /> Registrar verificação
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Anexos
// ============================================================================
function AttachmentsSection({
  occurrenceId,
  items,
}: {
  occurrenceId: string;
  items: OccurrenceAttachment[];
}) {
  const [draft, setDraft] = useState({ name: "", url: "", description: "" });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileUpload(file: File) {
    setUploading(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `evidence/occ-${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("certificates")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("certificates").getPublicUrl(path);
      setDraft((d) => ({ ...d, name: d.name || file.name, url: urlData.publicUrl }));
      toast.success("Arquivo carregado", { description: file.name });
    } catch (err) {
      toast.error("Falha no upload", { description: (err as Error).message });
    } finally {
      setUploading(false);
    }
  }

  const add = async () => {
    if (!draft.name.trim() || !draft.url.trim()) {
      toast.error("Informe nome e URL");
      return;
    }
    const att: OccurrenceAttachment = {
      id: newId("AT"),
      name: draft.name,
      url: draft.url,
      description: draft.description || null,
      uploaded_at: new Date().toISOString(),
    };
    await updateOccurrenceMeta(
      occurrenceId,
      (p) => ({ ...p, attachments: [att, ...p.attachments] }),
      { action: "Evidência anexada", detail: att.name },
    );
    setDraft({ name: "", url: "", description: "" });
    toast.success("Evidência adicionada");
  };

  const remove = async (id: string) => {
    await updateOccurrenceMeta(
      occurrenceId,
      (p) => ({ ...p, attachments: p.attachments.filter((a) => a.id !== id) }),
      { action: "Evidência removida" },
    );
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <Input
          placeholder="Nome do arquivo / evidência"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        />
        <div className="flex gap-1.5">
          <Input
            placeholder="URL ou faça upload →"
            className="flex-1"
            value={draft.url}
            onChange={(e) => setDraft({ ...draft, url: e.target.value })}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFileUpload(f);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            title="Fazer upload de arquivo"
            disabled={uploading}
            className="h-9 px-2.5 rounded-md border border-input bg-background text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50 shrink-0"
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Paperclip className="size-4" />
            )}
          </button>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Descrição (opcional)"
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          />
          <Button onClick={add}>
            <Plus className="size-4" />
          </Button>
        </div>
      </div>
      {items.length === 0 ? (
        <div className="text-sm text-muted-foreground italic py-6 text-center border border-dashed border-border rounded">
          Nenhuma evidência anexada.
        </div>
      ) : (
        <div className="space-y-1.5">
          {items.map((a) => (
            <div key={a.id} className="flex items-center gap-2 border border-border rounded-md p-2">
              <Paperclip className="size-3.5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <a
                  href={a.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium hover:underline truncate block"
                >
                  {a.name}
                </a>
                {a.description && (
                  <div className="text-xs text-muted-foreground truncate">{a.description}</div>
                )}
                <div className="text-[10px] text-muted-foreground">
                  {new Date(a.uploaded_at).toLocaleString("pt-BR")}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => remove(a.id)}>
                <Trash2 className="size-3.5 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Campos personalizados
// ============================================================================
function CustomFieldsSection({
  occurrenceId,
  items,
}: {
  occurrenceId: string;
  items: OccurrenceCustomField[];
}) {
  const [list, setList] = useState<OccurrenceCustomField[]>(items);
  useEffect(() => setList(items), [items]);

  const add = () => setList([...list, { id: newId("CF"), label: "", value: "" }]);
  const update = (id: string, patch: Partial<OccurrenceCustomField>) =>
    setList(list.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  const remove = (id: string) => setList(list.filter((f) => f.id !== id));

  const save = async () => {
    const cleaned = list.filter((f) => f.label.trim());
    await updateOccurrenceMeta(occurrenceId, (p) => ({ ...p, custom_fields: cleaned }), {
      action: "Campos personalizados atualizados",
    });
    toast.success("Campos personalizados salvos");
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Adicione campos específicos do seu processo (ex: número do lote, cliente, etc.).
      </p>
      {list.map((f) => (
        <div key={f.id} className="flex gap-2 items-center">
          <Input
            className="w-1/3"
            placeholder="Rótulo"
            value={f.label}
            onChange={(e) => update(f.id, { label: e.target.value })}
          />
          <Input
            className="flex-1"
            placeholder="Valor"
            value={f.value}
            onChange={(e) => update(f.id, { value: e.target.value })}
          />
          <Button variant="ghost" size="sm" onClick={() => remove(f.id)}>
            <Trash2 className="size-3.5 text-destructive" />
          </Button>
        </div>
      ))}
      <div className="flex justify-between">
        <Button variant="outline" size="sm" onClick={add}>
          <Plus className="size-3.5 mr-1" /> Adicionar campo
        </Button>
        <Button size="sm" onClick={save}>
          <Save className="size-3.5 mr-1" /> Salvar campos
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Histórico
// ============================================================================
function HistorySection({ events }: { events: any[] }) {
  if (events.length === 0) {
    return (
      <div className="text-sm text-muted-foreground italic py-6 text-center">
        Sem eventos registrados ainda.
      </div>
    );
  }
  return (
    <ol className="relative border-l border-border ml-2 space-y-3">
      {events.map((e) => (
        <li key={e.id} className="ml-4">
          <div className="absolute -left-[5px] mt-1.5 size-2.5 rounded-full bg-primary" />
          <div className="text-sm font-medium">{e.action}</div>
          {e.detail && <div className="text-xs text-muted-foreground">{e.detail}</div>}
          <div className="text-[11px] text-muted-foreground">
            {new Date(e.at).toLocaleString("pt-BR")}
            {e.actor && <> · {e.actor}</>}
          </div>
        </li>
      ))}
    </ol>
  );
}

// ============================================================================
// Página
// ============================================================================
function OccDetail() {
  useAuditAccess("occurrences");
  const { id } = Route.useParams();
  const occurrences = useTableStore(occurrencesStore);
  const o = occurrences.find((x) => x.id === id);
  const { meta, refresh } = useOccurrenceMeta(id);

  if (!o) {
    return (
      <>
        <Link
          to="/occurrences"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="size-4 mr-1" /> Voltar
        </Link>
        <PageHeader title="Ocorrência não encontrada" description={id} />
      </>
    );
  }

  const overdue = isOverdue(meta.deadline, o.status);

  return (
    <>
      <Link
        to="/occurrences"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="size-4 mr-1" /> Voltar
      </Link>
      <PageHeader
        title={o.description.length > 80 ? o.description.slice(0, 80) + "…" : o.description}
        description={`${o.code ?? o.id} · ${typeLabel(o.type)} · Origem ${originLabel(o.origin)}`}
        actions={
          <div className="flex items-center gap-2">
            {overdue && (
              <span className="inline-flex items-center gap-1 text-xs bg-destructive/10 text-destructive font-medium rounded-full px-3 py-1">
                <AlertTriangle className="size-3.5" /> Prazo vencido
              </span>
            )}
            <StatusBadge>{statusLabel(o.status)}</StatusBadge>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="lg:col-span-2 bg-card border border-border rounded-lg p-5 shadow-sm">
          <Tabs defaultValue="overview">
            <TabsList className="grid grid-cols-7 w-full text-xs">
              <TabsTrigger value="overview">Visão geral</TabsTrigger>
              <TabsTrigger value="root_cause">Causa raiz</TabsTrigger>
              <TabsTrigger value="five_w2h">5W2H</TabsTrigger>
              <TabsTrigger value="actions">
                <ClipboardList className="size-3.5 mr-1" /> Ações
              </TabsTrigger>
              <TabsTrigger value="effectiveness">Eficácia</TabsTrigger>
              <TabsTrigger value="attachments">
                <Paperclip className="size-3.5" />
              </TabsTrigger>
              <TabsTrigger value="history">
                <History className="size-3.5" />
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="pt-4">
              <OverviewSection occurrence={o} deadline={meta.deadline} onSaved={refresh} />
            </TabsContent>
            <TabsContent value="root_cause" className="pt-4">
              <RootCauseSection occurrence={o} />
            </TabsContent>
            <TabsContent value="five_w2h" className="pt-4">
              <FiveW2HSection occurrenceId={o.id} value={meta.five_w2h} />
            </TabsContent>
            <TabsContent value="actions" className="pt-4">
              <ActionPlansSection occurrenceId={o.id} />
            </TabsContent>
            <TabsContent value="effectiveness" className="pt-4">
              <EffectivenessSection occurrenceId={o.id} value={meta.effectiveness} />
            </TabsContent>
            <TabsContent value="attachments" className="pt-4">
              <AttachmentsSection occurrenceId={o.id} items={meta.attachments} />
            </TabsContent>
            <TabsContent value="history" className="pt-4">
              <HistorySection events={meta.history} />
            </TabsContent>
          </Tabs>
        </section>

        <aside className="space-y-4">
          <section className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-semibold mb-3">Resumo</h3>
            <dl className="text-sm space-y-1.5">
              <Row k="Severidade" v={<StatusBadge>{o.severity}</StatusBadge>} />
              <Row k="Status" v={<StatusBadge>{statusLabel(o.status)}</StatusBadge>} />
              <Row k="Responsável" v={profileName(o.responsible_id)} />
              <Row k="Identificada" v={o.occurred_at ?? "—"} />
              <Row
                k="Prazo"
                v={
                  meta.deadline ? (
                    <span className={overdue ? "text-destructive font-medium" : ""}>
                      {meta.deadline}
                    </span>
                  ) : (
                    "—"
                  )
                }
              />
              <Row k="Eficácia" v={effectivenessLabel[meta.effectiveness.status]} />
              <Row k="Anexos" v={meta.attachments.length} />
              <Row
                k="Ações"
                v={
                  actionPlansStore
                    .list()
                    .filter((p: any) => p.origin_type === "occurrence" && p.origin_id === o.id)
                    .length
                }
              />
            </dl>
          </section>

          <section className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-semibold mb-3">Campos personalizados</h3>
            <CustomFieldsSection occurrenceId={o.id} items={meta.custom_fields} />
          </section>
        </aside>
      </div>
    </>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="text-right">{v}</dd>
    </div>
  );
}
