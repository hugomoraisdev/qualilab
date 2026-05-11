import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { occurrences } from "@/lib/mock-data";
import { ArrowLeft, Plus, Trash2, Lightbulb, Fish, ListOrdered, FileQuestion } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/occurrences/$id")({ component: OccDetail });

// ============================================================================
// 5 PORQUÊS
// ============================================================================
function FiveWhys() {
  const [whys, setWhys] = useState(["", "", "", "", ""]);
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Pergunte "Por quê?" cinco vezes em cascata até identificar a causa raiz.
      </p>
      {whys.map((w, i) => (
        <div key={i} className="flex gap-2 items-start">
          <div className="size-7 rounded-full bg-primary/10 text-primary text-xs font-bold grid place-items-center shrink-0 mt-1">{i + 1}</div>
          <div className="flex-1 space-y-1">
            <Label className="text-xs">Por que {i === 0 ? "aconteceu?" : i === 4 ? "(causa raiz)?" : `${i + 1}?`}</Label>
            <Input value={w} onChange={(e) => setWhys(whys.map((x, j) => (j === i ? e.target.value : x)))} placeholder={`Resposta ${i + 1}`} />
          </div>
        </div>
      ))}
      <div className="bg-primary/5 border border-primary/30 rounded-md p-3 mt-4">
        <div className="text-xs font-semibold text-primary mb-1">Causa raiz identificada</div>
        <div className="text-sm">{whys[4] || <span className="text-muted-foreground italic">Preencha as 5 perguntas acima…</span>}</div>
      </div>
    </div>
  );
}

// ============================================================================
// 5W2H
// ============================================================================
const W2H_FIELDS = [
  { key: "what", label: "What — O que será feito?" },
  { key: "why", label: "Why — Por que será feito?" },
  { key: "where", label: "Where — Onde será feito?" },
  { key: "when", label: "When — Quando será feito?" },
  { key: "who", label: "Who — Quem fará?" },
  { key: "how", label: "How — Como será feito?" },
  { key: "howMuch", label: "How much — Quanto custará?" },
] as const;

function FiveW2H() {
  const [data, setData] = useState<Record<string, string>>({});
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {W2H_FIELDS.map((f) => (
        <div key={f.key} className="space-y-1.5">
          <Label className="text-xs">{f.label}</Label>
          <Input value={data[f.key] ?? ""} onChange={(e) => setData({ ...data, [f.key]: e.target.value })} />
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Ishikawa (6M)
// ============================================================================
const ISHIKAWA_GROUPS = [
  { key: "method", label: "Método" },
  { key: "machine", label: "Máquina" },
  { key: "material", label: "Material" },
  { key: "manpower", label: "Mão de obra" },
  { key: "measurement", label: "Medição" },
  { key: "environment", label: "Meio ambiente" },
] as const;

function Ishikawa() {
  const [effect, setEffect] = useState("");
  const [causes, setCauses] = useState<Record<string, string[]>>({});
  const add = (k: string, v: string) => {
    if (!v.trim()) return;
    setCauses({ ...causes, [k]: [...(causes[k] ?? []), v.trim()] });
  };
  const remove = (k: string, idx: number) => {
    setCauses({ ...causes, [k]: (causes[k] ?? []).filter((_, i) => i !== idx) });
  };
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs">Efeito / problema central</Label>
        <Input value={effect} onChange={(e) => setEffect(e.target.value)} placeholder="Ex: Resultado fora da especificação" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {ISHIKAWA_GROUPS.map((g) => (
          <CauseGroup key={g.key} label={g.label} items={causes[g.key] ?? []} onAdd={(v) => add(g.key, v)} onRemove={(i) => remove(g.key, i)} />
        ))}
      </div>
      <div className="text-[11px] text-muted-foreground italic">Diagrama visual (espinha de peixe) disponível como evolução no roadmap.</div>
    </div>
  );
}
function CauseGroup({ label, items, onAdd, onRemove }: { label: string; items: string[]; onAdd: (v: string) => void; onRemove: (i: number) => void }) {
  const [val, setVal] = useState("");
  return (
    <div className="border border-border rounded-md p-3 bg-background">
      <div className="text-xs font-semibold mb-2">{label}</div>
      <div className="space-y-1 mb-2">
        {items.length === 0 && <div className="text-[11px] text-muted-foreground italic">Sem causas listadas</div>}
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-1 text-xs bg-muted rounded px-2 py-1">
            <span className="flex-1">{it}</span>
            <button onClick={() => onRemove(i)} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-3" /></button>
          </div>
        ))}
      </div>
      <div className="flex gap-1">
        <Input value={val} onChange={(e) => setVal(e.target.value)} placeholder="Adicionar causa…" className="h-8 text-xs"
          onKeyDown={(e) => { if (e.key === "Enter") { onAdd(val); setVal(""); } }} />
        <Button type="button" size="sm" variant="outline" className="h-8 px-2" onClick={() => { onAdd(val); setVal(""); }}>
          <Plus className="size-3" />
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Brainstorm
// ============================================================================
function Brainstorm() {
  const [ideas, setIdeas] = useState<{ id: string; text: string; selected: boolean }[]>([]);
  const [val, setVal] = useState("");
  const add = () => {
    if (!val.trim()) return;
    setIdeas([...ideas, { id: Math.random().toString(36).slice(2), text: val.trim(), selected: false }]);
    setVal("");
  };
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Liste todas as ideias geradas pela equipe. Marque as causas mais prováveis.</p>
      <div className="flex gap-2">
        <Input value={val} onChange={(e) => setVal(e.target.value)} placeholder="Nova ideia…" onKeyDown={(e) => e.key === "Enter" && add()} />
        <Button type="button" onClick={add}><Plus className="size-4" /> Adicionar</Button>
      </div>
      <div className="space-y-1.5">
        {ideas.length === 0 && <div className="text-xs text-muted-foreground italic">Nenhuma ideia registrada ainda.</div>}
        {ideas.map((i) => (
          <label key={i.id} className={cn("flex items-center gap-2 border rounded-md px-3 py-2 cursor-pointer transition-colors",
            i.selected ? "border-primary bg-primary/5" : "border-border hover:bg-accent/30")}>
            <input
              type="checkbox" checked={i.selected}
              onChange={(e) => setIdeas(ideas.map((x) => (x.id === i.id ? { ...x, selected: e.target.checked } : x)))}
            />
            <span className="text-sm flex-1">{i.text}</span>
            {i.selected && <span className="text-[10px] uppercase tracking-wide text-primary font-semibold">causa provável</span>}
            <button onClick={() => setIdeas(ideas.filter((x) => x.id !== i.id))} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="size-3.5" />
            </button>
          </label>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Página
// ============================================================================
function OccDetail() {
  const { id } = Route.useParams();
  const o = occurrences.find(x => x.id === id) ?? occurrences[0];
  return (
    <>
      <Link to="/occurrences" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="size-4 mr-1" /> Voltar
      </Link>
      <PageHeader title={o.description} description={`${o.id} · ${o.type} · Origem ${o.origin}`} actions={<StatusBadge>{o.status}</StatusBadge>} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="lg:col-span-2 bg-card border border-border rounded-lg p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-3">Análise de causa raiz</h3>
          <Tabs defaultValue="five_whys">
            <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full">
              <TabsTrigger value="five_whys"><ListOrdered className="size-3.5 mr-1" /> 5 Porquês</TabsTrigger>
              <TabsTrigger value="five_w2h"><FileQuestion className="size-3.5 mr-1" /> 5W2H</TabsTrigger>
              <TabsTrigger value="ishikawa"><Fish className="size-3.5 mr-1" /> Ishikawa</TabsTrigger>
              <TabsTrigger value="brainstorm"><Lightbulb className="size-3.5 mr-1" /> Brainstorm</TabsTrigger>
            </TabsList>
            <TabsContent value="five_whys" className="pt-4"><FiveWhys /></TabsContent>
            <TabsContent value="five_w2h" className="pt-4"><FiveW2H /></TabsContent>
            <TabsContent value="ishikawa" className="pt-4"><Ishikawa /></TabsContent>
            <TabsContent value="brainstorm" className="pt-4"><Brainstorm /></TabsContent>
          </Tabs>

          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline">Cancelar</Button>
            <Button onClick={() => toast.success("Análise de causa salva", { description: `Ocorrência ${o.id}` })}>Salvar análise</Button>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-semibold mb-3">Dados</h3>
            <dl className="text-sm space-y-1.5">
              <div className="flex justify-between"><dt className="text-muted-foreground">Severidade</dt><dd><StatusBadge>{o.severity}</StatusBadge></dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Responsável</dt><dd>{o.responsible}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Identificada</dt><dd>{o.date}</dd></div>
            </dl>
          </section>
          <section className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-semibold mb-3">Ações associadas</h3>
            <ul className="text-sm space-y-1.5">
              <li>• <span className="font-medium">Corretiva:</span> Tratar imediatamente o equipamento envolvido.</li>
              <li>• <span className="font-medium">Preventiva:</span> Implantar painel de alertas no QualiLab.</li>
            </ul>
          </section>
        </aside>
      </div>
    </>
  );
}
