import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuditAccess } from "@/lib/audit";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Save, Trash2, Plus, X, History, FileText, AlertTriangle, Target, Activity,
  ArrowDown, GripVertical, Workflow,
} from "lucide-react";
import { useProcesses, upsertProcess, softDeleteProcess, type ProcessRow, type ProcessStep } from "@/lib/processes-store";
import { useTableStore } from "@/lib/table-store";
import { profilesStore, profileName } from "@/lib/profiles-store";
import { documentsStore } from "@/lib/documents-store";
import { risksStore } from "@/lib/risks-store";
import { occurrencesStore } from "@/lib/occurrences-store";
import { indicatorsStore } from "@/lib/indicators-store";
import { actionPlansStore } from "@/lib/action-plans-store";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/process-map/$id")({ component: ProcessDetailPage });

function ProcessDetailPage() {
  useAuditAccess("process_map");
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { get, loading, reload } = useProcesses();
  const profiles = useTableStore(profilesStore);
  const documents = useTableStore(documentsStore);
  const risks = useTableStore(risksStore);
  const occurrences = useTableStore(occurrencesStore);
  const indicators = useTableStore(indicatorsStore);
  const actions = useTableStore(actionPlansStore);

  const [draft, setDraft] = useState<ProcessRow | null>(null);

  useEffect(() => {
    if (loading) return;
    const p = get(id);
    if (p) setDraft({ ...p });
  }, [id, loading, get]);

  if (loading || !draft) {
    return (
      <>
        <PageHeader title="Processo" description="Carregando…" />
        <div className="text-sm text-muted-foreground">Carregando processo…</div>
      </>
    );
  }

  const update = (patch: Partial<ProcessRow>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  const save = async (action = "updated", detail?: string) => {
    if (!draft) return;
    await upsertProcess(draft, { action, detail });
    await reload();
    toast.success("Processo salvo");
  };

  const remove = async () => {
    if (!confirm("Excluir este processo? O histórico será preservado.")) return;
    await softDeleteProcess(draft.id);
    toast.success("Processo excluído");
    navigate({ to: "/process-map" });
  };

  const addItem = (key: "inputs" | "outputs", value: string) => {
    if (!value.trim()) return;
    update({ [key]: [...draft[key], value.trim()] });
  };
  const removeItem = (key: "inputs" | "outputs", idx: number) => {
    update({ [key]: draft[key].filter((_, i) => i !== idx) });
  };

  const addStep = () => {
    const step: ProcessStep = {
      id: `s-${Date.now().toString(36)}`,
      order: draft.steps.length + 1,
      title: "",
      responsible_id: null,
      description: null,
    };
    update({ steps: [...draft.steps, step] });
  };
  const updateStep = (sid: string, patch: Partial<ProcessStep>) => {
    update({ steps: draft.steps.map((s) => (s.id === sid ? { ...s, ...patch } : s)) });
  };
  const removeStep = (sid: string) => update({ steps: draft.steps.filter((s) => s.id !== sid).map((s, i) => ({ ...s, order: i + 1 })) });
  const moveStep = (sid: string, dir: -1 | 1) => {
    const arr = [...draft.steps];
    const i = arr.findIndex((s) => s.id === sid);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    update({ steps: arr.map((s, k) => ({ ...s, order: k + 1 })) });
  };

  const toggleLink = (key: "linked_document_ids" | "linked_risk_ids" | "linked_occurrence_ids" | "linked_indicator_ids" | "linked_action_ids", id: string) => {
    const set = new Set(draft[key]);
    set.has(id) ? set.delete(id) : set.add(id);
    update({ [key]: Array.from(set) } as Partial<ProcessRow>);
  };

  return (
    <>
      <PageHeader
        title={draft.name || "Novo processo"}
        description={`${draft.code} · ${draft.area ?? "Sem área"}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild><Link to="/process-map"><ArrowLeft className="size-4" /> Voltar</Link></Button>
            <Button variant="outline" onClick={remove}><Trash2 className="size-4" /> Excluir</Button>
            <Button onClick={() => save()}><Save className="size-4" /> Salvar</Button>
          </div>
        }
      />

      <Tabs defaultValue="overview">
        <TabsList className="mb-4 flex-wrap h-auto">
          <TabsTrigger value="overview"><Workflow className="size-3 mr-1" /> Geral</TabsTrigger>
          <TabsTrigger value="io"><ArrowDown className="size-3 mr-1" /> Entradas/Saídas</TabsTrigger>
          <TabsTrigger value="steps"><GripVertical className="size-3 mr-1" /> Etapas / Fluxo</TabsTrigger>
          <TabsTrigger value="links"><FileText className="size-3 mr-1" /> Vínculos</TabsTrigger>
          <TabsTrigger value="actions"><Activity className="size-3 mr-1" /> Ações</TabsTrigger>
          <TabsTrigger value="history"><History className="size-3 mr-1" /> Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="bg-card border border-border rounded-lg p-5 grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="space-y-1.5"><Label className="text-xs">Código</Label><Input value={draft.code} onChange={(e) => update({ code: e.target.value })} /></div>
            <div className="lg:col-span-2 space-y-1.5"><Label className="text-xs">Nome</Label><Input value={draft.name} onChange={(e) => update({ name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Área / Setor</Label><Input value={draft.area ?? ""} onChange={(e) => update({ area: e.target.value || null })} /></div>
            <div className="space-y-1.5">
              <Label className="text-xs">Responsável (dono)</Label>
              <select value={draft.owner_id ?? ""} onChange={(e) => update({ owner_id: e.target.value || null })} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="">— Selecione —</option>
                {profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="lg:col-span-3 space-y-1.5"><Label className="text-xs">Objetivo</Label><Textarea rows={2} value={draft.objective ?? ""} onChange={(e) => update({ objective: e.target.value || null })} /></div>
            <div className="lg:col-span-3 space-y-1.5"><Label className="text-xs">Notas</Label><Textarea rows={3} value={draft.notes ?? ""} onChange={(e) => update({ notes: e.target.value || null })} /></div>
          </div>
        </TabsContent>

        <TabsContent value="io">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <IOList title="Entradas" items={draft.inputs} onAdd={(v) => addItem("inputs", v)} onRemove={(i) => removeItem("inputs", i)} />
            <IOList title="Saídas" items={draft.outputs} onAdd={(v) => addItem("outputs", v)} onRemove={(i) => removeItem("outputs", i)} />
          </div>
        </TabsContent>

        <TabsContent value="steps">
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="font-medium">Etapas do processo (workflow)</div>
              <Button size="sm" onClick={addStep}><Plus className="size-3" /> Etapa</Button>
            </div>
            {draft.steps.length === 0 ? (
              <div className="text-sm text-muted-foreground italic">Nenhuma etapa cadastrada.</div>
            ) : (
              <ol className="space-y-2">
                {draft.steps.map((s, idx) => (
                  <li key={s.id} className="border border-border rounded-md p-3 grid grid-cols-1 lg:grid-cols-12 gap-2 items-start">
                    <div className="lg:col-span-1 flex flex-col items-center pt-2">
                      <span className="text-xs font-mono text-muted-foreground">#{s.order}</span>
                      <button className="text-muted-foreground hover:text-foreground text-xs mt-1" onClick={() => moveStep(s.id, -1)} disabled={idx === 0}>↑</button>
                      <button className="text-muted-foreground hover:text-foreground text-xs" onClick={() => moveStep(s.id, 1)} disabled={idx === draft.steps.length - 1}>↓</button>
                    </div>
                    <div className="lg:col-span-4 space-y-1.5"><Label className="text-xs">Título</Label><Input value={s.title} onChange={(e) => updateStep(s.id, { title: e.target.value })} placeholder="Ex: Receber amostra" /></div>
                    <div className="lg:col-span-3 space-y-1.5">
                      <Label className="text-xs">Responsável</Label>
                      <select value={s.responsible_id ?? ""} onChange={(e) => updateStep(s.id, { responsible_id: e.target.value || null })} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
                        <option value="">— —</option>
                        {profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div className="lg:col-span-3 space-y-1.5"><Label className="text-xs">Descrição</Label><Input value={s.description ?? ""} onChange={(e) => updateStep(s.id, { description: e.target.value || null })} /></div>
                    <div className="lg:col-span-1 flex justify-end pt-5"><Button size="icon" variant="ghost" onClick={() => removeStep(s.id)}><X className="size-3" /></Button></div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </TabsContent>

        <TabsContent value="links">
          <div className="space-y-4">
            <LinkPicker
              title="Documentos vinculados" icon={FileText}
              options={documents.map((d) => ({ id: d.id, label: `${d.code} — ${d.title}` }))}
              selected={draft.linked_document_ids}
              onToggle={(id) => toggleLink("linked_document_ids", id)}
            />
            <LinkPicker
              title="Riscos vinculados" icon={AlertTriangle}
              options={risks.map((r) => ({ id: r.id, label: `${r.code ?? r.id} — ${r.description}` }))}
              selected={draft.linked_risk_ids}
              onToggle={(id) => toggleLink("linked_risk_ids", id)}
            />
            <LinkPicker
              title="Ocorrências / Não conformidades vinculadas" icon={AlertTriangle}
              options={occurrences.filter((o) => !o.deleted_at).map((o) => ({ id: o.id, label: `${o.code ?? o.id} — ${o.type} · ${o.description.slice(0, 60)}` }))}
              selected={draft.linked_occurrence_ids}
              onToggle={(id) => toggleLink("linked_occurrence_ids", id)}
            />
            <LinkPicker
              title="Indicadores vinculados" icon={Target}
              options={indicators.filter((i) => !i.deleted_at).map((i) => ({ id: i.id, label: `${i.code ?? i.id} — ${i.name}` }))}
              selected={draft.linked_indicator_ids}
              onToggle={(id) => toggleLink("linked_indicator_ids", id)}
            />
          </div>
        </TabsContent>

        <TabsContent value="actions">
          <LinkPicker
            title="Planos de ação relacionados" icon={Activity}
            options={actions.map((a) => ({ id: a.id, label: `${a.code ?? a.id} — ${a.description.slice(0, 80)} (${a.status})` }))}
            selected={draft.linked_action_ids}
            onToggle={(id) => toggleLink("linked_action_ids", id)}
          />
          <div className="text-xs text-muted-foreground mt-3">
            Use Planos de Ação para rastrear melhorias, correções e tratamentos relacionados a este processo.
            <Link to="/action-plans" className="text-primary hover:underline ml-1">Ir para planos →</Link>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="font-medium mb-3 flex items-center gap-2"><History className="size-4" /> Histórico de alterações</div>
            {draft.history.length === 0 ? (
              <div className="text-sm text-muted-foreground italic">Sem registros. Salve o processo para iniciar o histórico.</div>
            ) : (
              <ul className="space-y-2 text-xs">
                {draft.history.map((h) => (
                  <li key={h.id} className="border-l-2 border-primary/40 pl-3 py-1">
                    <div className="flex justify-between">
                      <span className="font-medium uppercase">{h.action}</span>
                      <span className="text-muted-foreground">{new Date(h.at).toLocaleString("pt-BR")}</span>
                    </div>
                    {h.detail && <div className="text-muted-foreground">{h.detail}</div>}
                    {h.actor && <div className="text-muted-foreground">por {profileName(h.actor)}</div>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}

function IOList({ title, items, onAdd, onRemove }: { title: string; items: string[]; onAdd: (v: string) => void; onRemove: (i: number) => void }) {
  const [v, setV] = useState("");
  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="font-medium mb-3">{title}</div>
      <div className="flex gap-2 mb-3">
        <Input value={v} onChange={(e) => setV(e.target.value)} placeholder={`Adicionar ${title.toLowerCase().slice(0, -1)}…`} onKeyDown={(e) => { if (e.key === "Enter") { onAdd(v); setV(""); } }} />
        <Button size="sm" onClick={() => { onAdd(v); setV(""); }}><Plus className="size-3" /></Button>
      </div>
      {items.length === 0 ? (
        <div className="text-xs text-muted-foreground italic">Nada cadastrado.</div>
      ) : (
        <ul className="space-y-1">
          {items.map((it, i) => (
            <li key={i} className="flex items-center justify-between text-sm bg-muted/30 rounded px-2 py-1">
              <span>{it}</span>
              <button onClick={() => onRemove(i)} className="text-muted-foreground hover:text-destructive"><X className="size-3" /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function LinkPicker({ title, icon: Icon, options, selected, onToggle }: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  options: { id: string; label: string }[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const filtered = options.filter((o) => !q || o.label.toLowerCase().includes(q.toLowerCase()));
  const selSet = new Set(selected);
  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="font-medium flex items-center gap-2"><Icon className="size-4" /> {title}</div>
        <span className="text-xs text-muted-foreground">{selected.length} selecionado(s)</span>
      </div>
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" className="h-8 text-xs mb-2" />
      <div className="max-h-64 overflow-y-auto border border-border rounded-md divide-y divide-border">
        {filtered.length === 0 && <div className="p-3 text-xs text-muted-foreground italic">Nada encontrado.</div>}
        {filtered.map((o) => {
          const active = selSet.has(o.id);
          return (
            <label key={o.id} className="flex items-center gap-2 p-2 text-xs hover:bg-muted/40 cursor-pointer">
              <input type="checkbox" checked={active} onChange={() => onToggle(o.id)} />
              <span className={active ? "font-medium" : ""}>{o.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
