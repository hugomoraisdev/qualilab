import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import {
  risksStore,
  saveRisk,
  RISK_STATUS_OPTIONS,
  statusLabel,
  classifyScore,
  type RiskRow,
} from "@/lib/risks-store";
import {
  useRiskMeta,
  updateRiskMeta,
  type RiskAttachment,
  type RiskCustomField,
} from "@/lib/risk-meta-store";
import { useTableStore } from "@/lib/table-store";
import { profilesStore, profileName } from "@/lib/profiles-store";
import { documentsStore } from "@/lib/documents-store";
import { occurrencesStore } from "@/lib/occurrences-store";
import { actionPlansStore, saveActionPlan, ORIGIN_TYPE_LABEL } from "@/lib/action-plans-store";
import {
  ArrowLeft, Plus, Trash2, Paperclip, History, Link2,
  ClipboardList, ShieldCheck, Save, Pencil,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/risks/$id")({ component: RiskDetail });

function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}

function isOverdue(deadline: string | null, status: string) {
  if (!deadline) return false;
  if (["mitigado", "encerrado", "aceito", "transferido"].includes(status)) return false;
  return new Date(deadline + "T23:59:59").getTime() < Date.now();
}

function RiskDetail() {
  const { id } = Route.useParams();
  const risks = useTableStore(risksStore);
  const r = risks.find((x) => x.id === id);
  const { meta, refresh } = useRiskMeta(id);
  const profiles = useTableStore(profilesStore);
  const docs = useTableStore(documentsStore);
  const occurrences = useTableStore(occurrencesStore);
  const actions = useTableStore(actionPlansStore);

  if (!r) {
    return (
      <>
        <Link to="/risks" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"><ArrowLeft className="size-4 mr-1" /> Voltar</Link>
        <PageHeader title="Risco não encontrado" description={id} />
      </>
    );
  }

  const score = r.probability * r.impact;
  const cls = classifyScore(score);
  const linkedActions = actions.filter((a) => a.origin_type === "risk" && a.origin_id === id);
  const overdueDays = (() => {
    const d = meta.treatment_deadline;
    if (!d) return null;
    const diff = Math.round((new Date(d + "T00:00:00").getTime() - Date.now()) / 86_400_000);
    return diff;
  })();

  return (
    <>
      <Link to="/risks" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="size-4 mr-1" /> Voltar
      </Link>
      <PageHeader
        title={r.description}
        description={`${r.code ?? r.id.slice(0, 8)} · Processo ${r.process}`}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge tone={cls.tone === "danger" ? "destructive" : cls.tone}>{`${cls.label} (${score})`}</StatusBadge>
            <StatusBadge>{statusLabel(r.status)}</StatusBadge>
            <EditRiskDialog risk={r} />
          </div>
        }
      />

      {meta.treatment_deadline && isOverdue(meta.treatment_deadline, r.status) && (
        <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          Tratamento atrasado em {String(Math.abs(overdueDays ?? 0))} dia(s) (prazo: {meta.treatment_deadline}).
        </div>
      )}

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
          <TabsTrigger value="treatment">Tratamento e ações</TabsTrigger>
          <TabsTrigger value="links">Vínculos</TabsTrigger>
          <TabsTrigger value="attachments">Evidências</TabsTrigger>
          <TabsTrigger value="custom">Campos personalizados</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        {/* ============= OVERVIEW ============= */}
        <TabsContent value="overview" className="mt-4">
          <div className="bg-card border border-border rounded-lg p-5 shadow-sm grid sm:grid-cols-2 gap-4 text-sm">
            <div><div className="text-xs text-muted-foreground">Causa</div>{r.cause ?? "—"}</div>
            <div><div className="text-xs text-muted-foreground">Consequência</div>{r.consequence ?? "—"}</div>
            <div><div className="text-xs text-muted-foreground">Probabilidade</div>{r.probability}</div>
            <div><div className="text-xs text-muted-foreground">Impacto</div>{r.impact}</div>
            <div><div className="text-xs text-muted-foreground">Nível</div><span className="font-mono">{score}</span></div>
            <div><div className="text-xs text-muted-foreground">Classificação</div>{r.classification ?? cls.label}</div>
            <div><div className="text-xs text-muted-foreground">Responsável</div>{profileName(r.responsible_id)}</div>
            <div><div className="text-xs text-muted-foreground">Status</div>{statusLabel(r.status)}</div>
            <div className="sm:col-span-2"><div className="text-xs text-muted-foreground">Estratégia de tratamento</div>{r.treatment ?? "—"}</div>
          </div>
        </TabsContent>

        {/* ============= TREATMENT & ACTIONS ============= */}
        <TabsContent value="treatment" className="mt-4 space-y-4">
          <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><ShieldCheck className="size-4" /> Tratamento e contingência</h3>
            <TreatmentEditor riskId={id} meta={meta} onSaved={refresh} actor={profileName(r.responsible_id)} />
          </div>

          <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm flex items-center gap-2"><ClipboardList className="size-4" /> Ações de mitigação</h3>
              <NewActionDialog riskId={id} riskCode={r.code ?? r.id.slice(0, 8)} responsibleId={r.responsible_id} onSaved={refresh} />
            </div>
            {linkedActions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma ação vinculada. Crie ações de mitigação a partir deste risco.</p>
            ) : (
              <div className="space-y-2">
                {linkedActions.map((a) => (
                  <Link key={a.id} to="/action-plans" className="block rounded-md border border-border p-3 hover:bg-accent/30">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-sm">{a.description}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {ORIGIN_TYPE_LABEL[a.origin_type] ?? a.origin_type} · Resp.: {profileName(a.responsible_id)} · Prazo: {a.deadline ?? "—"}
                        </div>
                      </div>
                      <StatusBadge>{a.status}</StatusBadge>
                    </div>
                    <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${a.progress}%` }} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ============= LINKS ============= */}
        <TabsContent value="links" className="mt-4">
          <div className="bg-card border border-border rounded-lg p-5 shadow-sm space-y-4">
            <h3 className="font-semibold text-sm flex items-center gap-2"><Link2 className="size-4" /> Vínculos do risco</h3>
            <p className="text-xs text-muted-foreground">Processo: <span className="font-medium text-foreground">{r.process}</span> (campo do cadastro)</p>

            <div>
              <Label className="mb-2 block">Documentos vinculados</Label>
              <MultiSelectList
                items={docs.map((d) => ({ id: d.id, label: `${d.code} — ${d.title}` }))}
                selected={meta.linked_document_ids}
                onChange={async (ids) => {
                  await updateRiskMeta(id, (p) => ({ ...p, linked_document_ids: ids }), {
                    action: "Vínculos de documentos atualizados",
                    detail: `${ids.length} documento(s)`,
                  });
                  refresh();
                }}
                emptyHint="Nenhum documento cadastrado."
                renderLink={(i) => <Link to="/documents/$id" params={{ id: i.id }} className="text-primary hover:underline">{i.label}</Link>}
              />
            </div>

            <div>
              <Label className="mb-2 block">Ocorrências / Não conformidades vinculadas</Label>
              <MultiSelectList
                items={occurrences.map((o) => ({ id: o.id, label: `${o.code ?? o.id.slice(0, 6)} — ${o.description.slice(0, 60)}` }))}
                selected={meta.linked_occurrence_ids}
                onChange={async (ids) => {
                  await updateRiskMeta(id, (p) => ({ ...p, linked_occurrence_ids: ids }), {
                    action: "Vínculos de ocorrências atualizados",
                    detail: `${ids.length} ocorrência(s)`,
                  });
                  refresh();
                }}
                emptyHint="Nenhuma ocorrência cadastrada."
                renderLink={(i) => <Link to="/occurrences/$id" params={{ id: i.id }} className="text-primary hover:underline">{i.label}</Link>}
              />
            </div>
          </div>
        </TabsContent>

        {/* ============= ATTACHMENTS ============= */}
        <TabsContent value="attachments" className="mt-4">
          <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm flex items-center gap-2"><Paperclip className="size-4" /> Evidências e anexos</h3>
              <AddAttachmentDialog riskId={id} onSaved={refresh} />
            </div>
            {meta.attachments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma evidência anexada.</p>
            ) : (
              <ul className="divide-y divide-border">
                {meta.attachments.map((a) => (
                  <li key={a.id} className="py-2 flex items-start justify-between gap-3">
                    <div>
                      <a href={a.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary hover:underline">{a.name}</a>
                      {a.description && <div className="text-xs text-muted-foreground">{a.description}</div>}
                      <div className="text-[10px] text-muted-foreground mt-1">{new Date(a.uploaded_at).toLocaleString("pt-BR")}</div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={async () => {
                      await updateRiskMeta(id, (p) => ({ ...p, attachments: p.attachments.filter((x) => x.id !== a.id) }), {
                        action: "Evidência removida", detail: a.name,
                      });
                      refresh();
                    }}><Trash2 className="size-4" /></Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </TabsContent>

        {/* ============= CUSTOM FIELDS ============= */}
        <TabsContent value="custom" className="mt-4">
          <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <h3 className="font-semibold text-sm mb-3">Campos personalizados</h3>
            <CustomFieldsEditor riskId={id} fields={meta.custom_fields} onSaved={refresh} />
          </div>
        </TabsContent>

        {/* ============= HISTORY ============= */}
        <TabsContent value="history" className="mt-4">
          <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><History className="size-4" /> Histórico de alterações</h3>
            {meta.history.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum evento registrado ainda.</p>
            ) : (
              <ol className="space-y-2">
                {meta.history.map((h) => (
                  <li key={h.id} className="flex items-start gap-3 border-l-2 border-primary/40 pl-3 py-1">
                    <div>
                      <div className="text-sm font-medium">{h.action}</div>
                      {h.detail && <div className="text-xs text-muted-foreground">{h.detail}</div>}
                      <div className="text-[10px] text-muted-foreground mt-0.5">{new Date(h.at).toLocaleString("pt-BR")}{h.actor ? ` · ${h.actor}` : ""}</div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}

// ============= EDIT DIALOG =============
function EditRiskDialog({ risk }: { risk: RiskRow }) {
  const [open, setOpen] = useState(false);
  const profiles = useTableStore(profilesStore);
  const [form, setForm] = useState<RiskRow>(risk);
  const score = form.probability * form.impact;
  const cls = classifyScore(score);

  const submit = async () => {
    try {
      await saveRisk({ ...form });
      await updateRiskMeta(risk.id, (p) => p, {
        action: "Risco atualizado",
        detail: `P=${form.probability} I=${form.impact} status=${form.status}`,
      });
      toast.success("Risco atualizado");
      setOpen(false);
    } catch (e) {
      toast.error("Falha ao salvar", { description: String((e as Error).message) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline"><Pencil className="size-4" /> Editar</Button></DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Editar risco</DialogTitle></DialogHeader>
        <div className="grid sm:grid-cols-2 gap-3">
          <div><Label>Código</Label><Input value={form.code ?? ""} onChange={(e) => setForm({ ...form, code: e.target.value || null })} /></div>
          <div><Label>Processo</Label><Input value={form.process} onChange={(e) => setForm({ ...form, process: e.target.value })} /></div>
          <div className="sm:col-span-2"><Label>Descrição</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div><Label>Causa</Label><Textarea rows={2} value={form.cause ?? ""} onChange={(e) => setForm({ ...form, cause: e.target.value })} /></div>
          <div><Label>Consequência</Label><Textarea rows={2} value={form.consequence ?? ""} onChange={(e) => setForm({ ...form, consequence: e.target.value })} /></div>
          <div><Label>Probabilidade</Label>
            <Select value={String(form.probability)} onValueChange={(v) => setForm({ ...form, probability: Number(v) })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Impacto</Label>
            <Select value={String(form.impact)} onValueChange={(v) => setForm({ ...form, impact: Number(v) })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Responsável</Label>
            <Select value={form.responsible_id ?? "none"} onValueChange={(v) => setForm({ ...form, responsible_id: v === "none" ? null : v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Sem responsável —</SelectItem>
                {profiles.map((p) => <SelectItem key={p.id} value={p.id}>{p.name || p.email}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{RISK_STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2"><Label>Estratégia de tratamento</Label><Textarea rows={2} value={form.treatment ?? ""} onChange={(e) => setForm({ ...form, treatment: e.target.value })} /></div>
          <div className="sm:col-span-2 flex items-center gap-3 rounded-md border border-border bg-muted/40 p-3">
            <span className="text-xs text-muted-foreground">Nível</span>
            <span className="font-mono text-lg">{score}</span>
            <StatusBadge tone={cls.tone === "danger" ? "destructive" : cls.tone}>{cls.label}</StatusBadge>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit}><Save className="size-4" /> Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============= TREATMENT EDITOR =============
function TreatmentEditor({ riskId, meta, onSaved, actor }: { riskId: string; meta: { treatment_deadline: string | null; contingency_plan: string | null }; onSaved: () => void; actor: string }) {
  const [deadline, setDeadline] = useState(meta.treatment_deadline ?? "");
  const [contingency, setContingency] = useState(meta.contingency_plan ?? "");
  const save = async () => {
    await updateRiskMeta(riskId, (p) => ({
      ...p,
      treatment_deadline: deadline || null,
      contingency_plan: contingency || null,
    }), { action: "Tratamento atualizado", detail: `Prazo: ${deadline || "—"}`, actor });
    toast.success("Tratamento atualizado");
    onSaved();
  };
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      <div>
        <Label>Prazo de tratamento</Label>
        <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
      </div>
      <div className="sm:col-span-2">
        <Label>Plano de contingência</Label>
        <Textarea rows={3} value={contingency} onChange={(e) => setContingency(e.target.value)} placeholder="Ações a executar caso o risco se materialize..." />
      </div>
      <div className="sm:col-span-2 flex justify-end">
        <Button size="sm" onClick={save}><Save className="size-4" /> Salvar</Button>
      </div>
    </div>
  );
}

// ============= NEW ACTION DIALOG =============
function NewActionDialog({ riskId, riskCode, responsibleId, onSaved }: { riskId: string; riskCode: string; responsibleId: string | null; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const profiles = useTableStore(profilesStore);
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [responsible, setResponsible] = useState(responsibleId ?? "");
  const [priority, setPriority] = useState("media");
  const [kind, setKind] = useState<"mitigacao" | "contingencia">("mitigacao");

  const submit = async () => {
    if (!description) return toast.error("Informe a descrição da ação");
    try {
      const id = crypto.randomUUID();
      await saveActionPlan({
        id,
        code: null,
        origin_type: "risk",
        origin_id: riskId,
        description: `[${kind === "mitigacao" ? "Mitigação" : "Contingência"}] ${description}`,
        responsible_id: responsible || null,
        deadline: deadline || null,
        priority,
        status: "pendente",
        progress: 0,
        notes: `Risco ${riskCode}`,
      });
      await updateRiskMeta(riskId, (p) => p, {
        action: `Ação de ${kind === "mitigacao" ? "mitigação" : "contingência"} criada`,
        detail: description.slice(0, 80),
      });
      toast.success("Ação criada");
      setOpen(false);
      setDescription("");
      onSaved();
    } catch (e) {
      toast.error("Falha ao criar ação", { description: String((e as Error).message) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="size-4" /> Nova ação</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova ação vinculada ao risco</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label>Tipo</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as "mitigacao" | "contingencia")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mitigacao">Mitigação</SelectItem>
                <SelectItem value="contingencia">Contingência</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Responsável</Label>
              <Select value={responsible || "none"} onValueChange={(v) => setResponsible(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Sem responsável —</SelectItem>
                  {profiles.map((p) => <SelectItem key={p.id} value={p.id}>{p.name || p.email}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prazo</Label>
              <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Prioridade</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="baixa">Baixa</SelectItem>
                <SelectItem value="media">Média</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="critica">Crítica</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit}>Criar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============= MULTI SELECT =============
function MultiSelectList({
  items, selected, onChange, emptyHint, renderLink,
}: {
  items: { id: string; label: string }[];
  selected: string[];
  onChange: (ids: string[]) => void;
  emptyHint: string;
  renderLink: (i: { id: string; label: string }) => React.ReactNode;
}) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">{emptyHint}</p>;
  return (
    <div className="space-y-3">
      {selected.length > 0 && (
        <ul className="space-y-1">
          {selected.map((sid) => {
            const it = items.find((x) => x.id === sid);
            if (!it) return null;
            return (
              <li key={sid} className="flex items-center justify-between gap-2 text-sm">
                {renderLink(it)}
                <button onClick={() => onChange(selected.filter((x) => x !== sid))} className="text-xs text-destructive hover:underline">remover</button>
              </li>
            );
          })}
        </ul>
      )}
      <details className="rounded-md border border-border">
        <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-muted-foreground">Adicionar / remover ({items.length} disponível(eis))</summary>
        <div className="p-3 max-h-64 overflow-auto space-y-1.5">
          {items.map((i) => {
            const checked = selected.includes(i.id);
            return (
              <label key={i.id} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={checked} onCheckedChange={(c) => onChange(c ? [...selected, i.id] : selected.filter((x) => x !== i.id))} />
                <span className="truncate">{i.label}</span>
              </label>
            );
          })}
        </div>
      </details>
    </div>
  );
}

// ============= ATTACHMENTS =============
function AddAttachmentDialog({ riskId, onSaved }: { riskId: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const submit = async () => {
    if (!name || !url) return toast.error("Nome e URL são obrigatórios");
    const att: RiskAttachment = {
      id: newId("att"), name, url,
      description: description || null,
      uploaded_at: new Date().toISOString(),
    };
    await updateRiskMeta(riskId, (p) => ({ ...p, attachments: [att, ...p.attachments] }), {
      action: "Evidência anexada", detail: name,
    });
    toast.success("Anexo adicionado");
    setOpen(false); setName(""); setUrl(""); setDescription("");
    onSaved();
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="size-4" /> Anexar</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova evidência</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>URL</Label><Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." /></div>
          <div><Label>Descrição (opcional)</Label><Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============= CUSTOM FIELDS =============
function CustomFieldsEditor({ riskId, fields, onSaved }: { riskId: string; fields: RiskCustomField[]; onSaved: () => void }) {
  const [local, setLocal] = useState<RiskCustomField[]>(fields);
  const add = () => setLocal([...local, { id: newId("cf"), label: "", value: "" }]);
  const remove = (id: string) => setLocal(local.filter((f) => f.id !== id));
  const upd = (id: string, patch: Partial<RiskCustomField>) => setLocal(local.map((f) => f.id === id ? { ...f, ...patch } : f));
  const save = async () => {
    await updateRiskMeta(riskId, (p) => ({ ...p, custom_fields: local }), {
      action: "Campos personalizados atualizados", detail: `${local.length} campo(s)`,
    });
    toast.success("Campos salvos");
    onSaved();
  };
  return (
    <div className="space-y-3">
      {local.length === 0 && <p className="text-sm text-muted-foreground">Nenhum campo. Adicione para coletar informações específicas.</p>}
      {local.map((f) => (
        <div key={f.id} className="grid grid-cols-[1fr_2fr_auto] gap-2 items-end">
          <div><Label>Rótulo</Label><Input value={f.label} onChange={(e) => upd(f.id, { label: e.target.value })} /></div>
          <div><Label>Valor</Label><Input value={f.value} onChange={(e) => upd(f.id, { value: e.target.value })} /></div>
          <Button variant="ghost" size="icon" onClick={() => remove(f.id)}><Trash2 className="size-4" /></Button>
        </div>
      ))}
      <div className="flex justify-between">
        <Button variant="outline" size="sm" onClick={add}><Plus className="size-4" /> Adicionar campo</Button>
        <Button size="sm" onClick={save}><Save className="size-4" /> Salvar</Button>
      </div>
    </div>
  );
}
