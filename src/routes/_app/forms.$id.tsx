import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ArrowLeft, CheckCircle2, XCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forms as seedForms } from "@/lib/mock-data";
import { getForm, listResponses, saveResponse, updateResponse, newId, type CustomForm, type FormResponse } from "@/lib/forms-store";
import { useAuth } from "@/lib/auth";
import { StatusBadge } from "@/components/StatusBadge";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/forms/$id")({ component: FormDetail });

function FormDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const [custom, setCustom] = useState<CustomForm | undefined>();
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [values, setValues] = useState<Record<string, any>>({});

  useEffect(() => {
    setCustom(getForm(id));
    setResponses(listResponses(id));
  }, [id]);

  // Caso o ID seja de um formulário-semente (FORM-001 etc), renderiza versão estática.
  const seed = !custom ? seedForms.find((f) => f.id === id) : undefined;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!custom) {
      toast.success("Formulário submetido com sucesso!");
      return;
    }
    const required = custom.fields.filter((f) => f.required);
    for (const r of required) {
      const v = values[r.id];
      if (v == null || v === "" || (Array.isArray(v) && v.length === 0)) {
        return toast.error(`Campo obrigatório: ${r.label}`);
      }
    }
    const resp: FormResponse = {
      id: newId("R"),
      formId: custom.id,
      values,
      submittedBy: user?.name ?? "—",
      submittedAt: new Date().toISOString(),
      approvalStatus: custom.requiresApproval ? "pending" : "n/a",
    };
    saveResponse(resp);
    setResponses(listResponses(custom.id));
    setValues({});
    toast.success("Resposta enviada", {
      description: custom.requiresApproval ? "Aguardando aprovação." : "Registrada com sucesso.",
    });
  };

  const decide = (rid: string, decision: "approved" | "rejected") => {
    updateResponse(rid, {
      approvalStatus: decision,
      approver: user?.name,
      approvedAt: new Date().toISOString(),
    });
    setResponses(listResponses(custom?.id));
    toast.success(decision === "approved" ? "Resposta aprovada" : "Resposta rejeitada");
  };

  // ----- Formulário-semente (estático) -----
  if (seed) {
    return (
      <>
        <Link to="/forms" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"><ArrowLeft className="size-4 mr-1" /> Voltar</Link>
        <PageHeader title={seed.name} description={`${seed.id} · ${seed.periodicity} · Responsável ${seed.responsible}`} />
        <form className="bg-card border border-border rounded-lg p-6 shadow-sm space-y-4 max-w-2xl" onSubmit={submit}>
          <div className="space-y-2"><Label>Equipamento</Label><Input placeholder="BAL-001 — Balança Analítica" /></div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Data</Label><Input type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></div>
            <div className="space-y-2"><Label>Hora</Label><Input type="time" defaultValue="08:00" /></div>
          </div>
          <div className="space-y-2"><Label>Temperatura medida (°C)</Label><Input type="number" step="0.1" defaultValue="22.5" /></div>
          <div className="space-y-2"><Label>Observações</Label><textarea className="w-full min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm" defaultValue="Equipamento operando dentro dos parâmetros." /></div>
          <div className="flex justify-end gap-2"><Button type="button" variant="outline">Cancelar</Button><Button type="submit">Enviar resposta</Button></div>
        </form>
      </>
    );
  }

  if (!custom) {
    return (
      <>
        <Link to="/forms" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"><ArrowLeft className="size-4 mr-1" /> Voltar</Link>
        <div className="text-sm text-muted-foreground">Formulário não encontrado.</div>
      </>
    );
  }

  // ----- Formulário customizado -----
  return (
    <>
      <Link to="/forms" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"><ArrowLeft className="size-4 mr-1" /> Voltar</Link>
      <PageHeader
        title={custom.title}
        description={`${custom.id} · Criado por ${custom.responsible} · ${custom.fields.length} campos`}
        actions={<span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide bg-primary/10 text-primary rounded px-1.5 py-0.5"><Sparkles className="size-2.5" /> personalizado</span>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
        <form className="bg-card border border-border rounded-lg p-6 shadow-sm space-y-4" onSubmit={submit}>
          {custom.description && <p className="text-sm text-muted-foreground">{custom.description}</p>}
          {custom.fields.map((f) => (
            <div key={f.id} className="space-y-1.5">
              <Label className="text-sm">{f.label} {f.required && <span className="text-destructive">*</span>}</Label>
              {f.type === "text" && <Input value={values[f.id] ?? ""} onChange={(e) => setValues({ ...values, [f.id]: e.target.value })} />}
              {f.type === "textarea" && <textarea className="w-full min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm" value={values[f.id] ?? ""} onChange={(e) => setValues({ ...values, [f.id]: e.target.value })} />}
              {f.type === "number" && <Input type="number" step="any" value={values[f.id] ?? ""} onChange={(e) => setValues({ ...values, [f.id]: e.target.value })} />}
              {f.type === "date" && <Input type="date" value={values[f.id] ?? ""} onChange={(e) => setValues({ ...values, [f.id]: e.target.value })} />}
              {f.type === "select" && (
                <select className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={values[f.id] ?? ""} onChange={(e) => setValues({ ...values, [f.id]: e.target.value })}>
                  <option value="">— selecionar —</option>
                  {(f.options ?? []).map((o, i) => <option key={i} value={o}>{o}</option>)}
                </select>
              )}
              {f.type === "checkbox" && (f.options ?? []).map((o, i) => {
                const arr: string[] = values[f.id] ?? [];
                return (
                  <label key={i} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={arr.includes(o)} onChange={(e) => {
                      const next = e.target.checked ? [...arr, o] : arr.filter((x) => x !== o);
                      setValues({ ...values, [f.id]: next });
                    }} />
                    {o}
                  </label>
                );
              })}
              {f.type === "radio" && (f.options ?? []).map((o, i) => (
                <label key={i} className="flex items-center gap-2 text-sm">
                  <input type="radio" name={f.id} checked={values[f.id] === o} onChange={() => setValues({ ...values, [f.id]: o })} />
                  {o}
                </label>
              ))}
            </div>
          ))}
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={() => setValues({})}>Limpar</Button>
            <Button type="submit">Enviar resposta</Button>
          </div>
        </form>

        <aside className="bg-card border border-border rounded-lg p-5 shadow-sm space-y-3 lg:sticky lg:top-4 self-start">
          <h3 className="text-sm font-semibold">Respostas recebidas ({responses.length})</h3>
          {custom.requiresApproval && (
            <div className="text-[11px] text-muted-foreground bg-muted rounded p-2">
              Este formulário exige aprovação. Aprovadores: {custom.approvers.join(", ")}.
            </div>
          )}
          {responses.length === 0 && <div className="text-xs text-muted-foreground italic">Nenhuma resposta ainda.</div>}
          <div className="space-y-2 max-h-[480px] overflow-y-auto">
            {responses.map((r) => (
              <div key={r.id} className="border border-border rounded-md p-2.5 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{r.submittedBy}</span>
                  <span className="text-muted-foreground">{new Date(r.submittedAt).toLocaleString("pt-BR")}</span>
                </div>
                <div className="text-muted-foreground">
                  {custom.fields.slice(0, 2).map((f) => (
                    <div key={f.id}>{f.label}: <span className="text-foreground">{Array.isArray(r.values[f.id]) ? r.values[f.id].join(", ") : (r.values[f.id] ?? "—")}</span></div>
                  ))}
                </div>
                {r.approvalStatus !== "n/a" && (
                  <div className="flex items-center justify-between pt-1.5 border-t border-border">
                    <StatusBadge>
                      {r.approvalStatus === "pending" ? "Aguardando aprovação" : r.approvalStatus === "approved" ? "Aprovado" : "Reprovado"}
                    </StatusBadge>
                    {r.approvalStatus === "pending" && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="h-6 px-2" onClick={() => decide(r.id, "rejected")}><XCircle className="size-3 text-destructive" /></Button>
                        <Button size="sm" className="h-6 px-2" onClick={() => decide(r.id, "approved")}><CheckCircle2 className="size-3" /></Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </>
  );
}
