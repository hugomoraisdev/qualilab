import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuditAccess } from "@/lib/audit";
import { PageHeader } from "@/components/PageHeader";
import { ArrowLeft, Plus, Trash2, GripVertical, Link2, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { saveForm, newId, type FormField, type FieldType, type FormRow } from "@/lib/forms-store";
import { upsertFormMeta, LINKABLE_MODULES, type LinkableModule } from "@/lib/form-meta-store";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/forms/new")({ component: FormBuilder });

const TYPE_LABELS: Record<FieldType, string> = {
  text: "Texto curto",
  textarea: "Texto longo (observação)",
  number: "Número",
  date: "Data",
  select: "Lista (select)",
  checkbox: "Múltipla escolha",
  radio: "Opção única (radio)",
  file: "Anexo (arquivo)",
};

function FormBuilder() {
  useAuditAccess("forms");
  const navigate = useNavigate();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [fields, setFields] = useState<FormField[]>([]);
  const [linkedModules, setLinkedModules] = useState<LinkableModule[]>([]);
  const [deadlineDays, setDeadlineDays] = useState<string>("");

  const addField = (type: FieldType) => {
    setFields([...fields, {
      id: newId("F"), type,
      label: TYPE_LABELS[type],
      required: false,
      options: ["select", "checkbox", "radio"].includes(type) ? ["Opção 1", "Opção 2"] : undefined,
    }]);
  };

  const update = (id: string, patch: Partial<FormField>) => {
    setFields(fields.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const remove = (id: string) => setFields(fields.filter((f) => f.id !== id));

  const toggleModule = (m: LinkableModule) => {
    setLinkedModules((cur) => cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m]);
  };

  const save = async () => {
    if (!title.trim()) return toast.error("Defina um título para o formulário.");
    if (fields.length === 0) return toast.error("Adicione ao menos um campo.");
    const form: FormRow = {
      id: newId("FORM"),
      title: title.trim(),
      description: description.trim() || null,
      responsible_id: user?.id ?? null,
      fields,
      requires_approval: requiresApproval,
      approvers: requiresApproval ? ["Carla Administradora", "Roberto Gestor"] : [],
      status: "active",
    };
    await saveForm(form);
    await upsertFormMeta({
      form_id: form.id,
      linked_modules: linkedModules,
      deadline_days: deadlineDays ? Number(deadlineDays) : null,
    });
    toast.success("Formulário criado", { description: `${form.title} (${fields.length} campos)` });
    navigate({ to: "/forms/$id", params: { id: form.id } });
  };

  return (
    <>
      <Link to="/forms" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="size-4 mr-1" /> Voltar
      </Link>
      <PageHeader title="Novo formulário" description="Crie campos personalizados de forma autônoma — sem necessidade de TI." />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
        <section className="bg-card border border-border rounded-lg p-5 shadow-sm space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Título do formulário *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Inspeção de Bancada" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Descrição</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Curta explicação do uso" />
            </div>
          </div>

          <div className="border-t border-border pt-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold"><Link2 className="size-4" /> Vínculos com módulos</div>
            <p className="text-xs text-muted-foreground">Selecione os módulos aos quais este formulário poderá ser vinculado em cada resposta.</p>
            <div className="flex flex-wrap gap-2">
              {LINKABLE_MODULES.map((m) => {
                const active = linkedModules.includes(m.value);
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => toggleModule(m.value)}
                    className={`text-xs px-2.5 py-1 rounded-full border ${active ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-border pt-4 grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5"><Clock className="size-3" /> Prazo (dias após envio)</Label>
              <Input type="number" min={0} value={deadlineDays} onChange={(e) => setDeadlineDays(e.target.value)} placeholder="Ex: 7" />
            </div>
            <div className="flex items-end gap-2 pb-1">
              <Switch id="approval" checked={requiresApproval} onCheckedChange={setRequiresApproval} />
              <Label htmlFor="approval" className="text-sm cursor-pointer">Respostas exigem aprovação</Label>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Campos do formulário</h3>
              <span className="text-xs text-muted-foreground">{fields.length} campo(s)</span>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {(Object.keys(TYPE_LABELS) as FieldType[]).map((t) => (
                <Button key={t} type="button" variant="outline" size="sm" onClick={() => addField(t)}>
                  <Plus className="size-3" /> {TYPE_LABELS[t]}
                </Button>
              ))}
            </div>

            <div className="space-y-2">
              {fields.length === 0 && (
                <div className="border border-dashed border-border rounded-md p-8 text-center text-sm text-muted-foreground">
                  Nenhum campo ainda. Clique em um dos botões acima para adicionar.
                </div>
              )}
              {fields.map((f, idx) => (
                <div key={f.id} className="border border-border rounded-md p-3 bg-background">
                  <div className="flex items-start gap-2">
                    <GripVertical className="size-4 text-muted-foreground mt-2 shrink-0" />
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-[1fr_180px_auto] gap-2 items-start">
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Rótulo (campo {idx + 1})</Label>
                        <Input value={f.label} onChange={(e) => update(f.id, { label: e.target.value })} className="h-8" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Tipo</Label>
                        <select
                          value={f.type}
                          onChange={(e) => update(f.id, { type: e.target.value as FieldType })}
                          className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                        >
                          {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      </div>
                      <label className="flex items-center gap-1.5 mt-5 text-xs">
                        <input type="checkbox" checked={f.required} onChange={(e) => update(f.id, { required: e.target.checked })} />
                        obrigatório
                      </label>
                    </div>
                    <button onClick={() => remove(f.id)} className="text-muted-foreground hover:text-destructive p-1.5 mt-1">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  {["select", "checkbox", "radio"].includes(f.type) && (
                    <div className="ml-6 mt-2 space-y-1">
                      <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Opções (uma por linha)</Label>
                      <textarea
                        className="w-full min-h-16 rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                        value={(f.options ?? []).join("\n")}
                        onChange={(e) => update(f.id, { options: e.target.value.split("\n").filter(Boolean) })}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="outline" onClick={() => navigate({ to: "/forms" })}>Cancelar</Button>
            <Button onClick={save}>Salvar formulário</Button>
          </div>
        </section>

        <aside className="bg-card border border-border rounded-lg p-5 shadow-sm space-y-3 lg:sticky lg:top-4 self-start">
          <h3 className="text-sm font-semibold">Preview ao vivo</h3>
          <div className="border border-dashed border-border rounded-md p-4 space-y-3">
            <div>
              <div className="text-base font-semibold">{title || "Título do formulário"}</div>
              {description && <div className="text-xs text-muted-foreground">{description}</div>}
            </div>
            {fields.length === 0 && <div className="text-xs text-muted-foreground italic">Os campos aparecerão aqui conforme você adiciona.</div>}
            {fields.map((f) => (
              <div key={f.id} className="space-y-1">
                <Label className="text-xs">{f.label} {f.required && <span className="text-destructive">*</span>}</Label>
                {f.type === "text" && <Input className="h-8" disabled placeholder="texto curto" />}
                {f.type === "textarea" && <textarea className="w-full min-h-16 rounded-md border border-input bg-background px-2 py-1.5 text-xs" disabled placeholder="texto longo / observação" />}
                {f.type === "number" && <Input type="number" className="h-8" disabled placeholder="0" />}
                {f.type === "date" && <Input type="date" className="h-8" disabled />}
                {f.type === "file" && <Input type="file" className="h-8" disabled />}
                {f.type === "select" && (
                  <select className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs" disabled>
                    {(f.options ?? []).map((o, i) => <option key={i}>{o}</option>)}
                  </select>
                )}
                {f.type === "checkbox" && (f.options ?? []).map((o, i) => (
                  <label key={i} className="flex items-center gap-1.5 text-xs"><input type="checkbox" disabled /> {o}</label>
                ))}
                {f.type === "radio" && (f.options ?? []).map((o, i) => (
                  <label key={i} className="flex items-center gap-1.5 text-xs"><input type="radio" disabled name={`prev-${f.id}`} /> {o}</label>
                ))}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </>
  );
}
