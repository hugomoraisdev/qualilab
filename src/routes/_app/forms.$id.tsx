import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAuditAccess } from "@/lib/audit";
import { PageHeader } from "@/components/PageHeader";
import { ArrowLeft, CheckCircle2, XCircle, Sparkles, Download, Link2, Clock, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  formsStore, responsesStore, saveResponse, updateResponse, newId,
  type FormField, type FormResponseRow,
} from "@/lib/forms-store";
import {
  useFormMeta, useResponseMeta, upsertResponseMeta,
  LINKABLE_MODULES, type LinkableModule,
} from "@/lib/form-meta-store";
import { useTableStore } from "@/lib/table-store";
import { documentsStore } from "@/lib/documents-store";
import { occurrencesStore } from "@/lib/occurrences-store";
import { risksStore } from "@/lib/risks-store";
import { auditsStore } from "@/lib/audits-store";
import { suppliersStore } from "@/lib/suppliers-store";
import { calibrationsStore } from "@/lib/calibrations-store";
import { equipmentsStore } from "@/lib/equipments-store";
import { useAuth } from "@/lib/auth";
import { StatusBadge } from "@/components/StatusBadge";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/forms/$id")({ component: FormDetail });

type RecordOption = { id: string; label: string };

function FormDetail() {
  useAuditAccess("forms");
  const { id } = Route.useParams();
  const { user } = useAuth();
  const forms = useTableStore(formsStore);
  const responses = useTableStore(responsesStore).filter((r) => r.form_id === id);
  const custom = forms.find((f) => f.id === id);
  const formMeta = useFormMeta(id).current;
  const respMeta = useResponseMeta(id);

  const documents = useTableStore(documentsStore);
  const occurrences = useTableStore(occurrencesStore);
  const risks = useTableStore(risksStore);
  const audits = useTableStore(auditsStore);
  const suppliers = useTableStore(suppliersStore);
  const calibrations = useTableStore(calibrationsStore);
  const equipments = useTableStore(equipmentsStore);

  const [values, setValues] = useState<Record<string, any>>({});
  const [linkModule, setLinkModule] = useState<LinkableModule | "">("");
  const [linkRecordId, setLinkRecordId] = useState("");

  const linkOptions: RecordOption[] = useMemo(() => {
    if (!linkModule) return [];
    switch (linkModule) {
      case "documents": return documents.map((d) => ({ id: d.id, label: `${d.code} — ${d.title}` }));
      case "occurrences": return occurrences.map((o) => ({ id: o.id, label: `${o.code ?? o.id} — ${o.description.slice(0, 60)}` }));
      case "risks": return risks.map((r) => ({ id: r.id, label: `${r.code ?? r.id} — ${r.description.slice(0, 60)}` }));
      case "audits": return audits.map((a) => ({ id: a.id, label: `${a.code ?? a.id} — ${a.scope}` }));
      case "suppliers": return suppliers.map((s) => ({ id: s.id, label: `${s.code ?? s.id} — ${s.name}` }));
      case "calibrations": return calibrations.map((c) => ({ id: c.id, label: `${c.id} — ${c.certificate_number ?? "s/cert."}` }));
      case "equipments": return equipments.map((e) => ({ id: e.id, label: `${e.code} — ${e.name}` }));
      default: return [];
    }
  }, [linkModule, documents, occurrences, risks, audits, suppliers, calibrations, equipments]);

  if (!custom) {
    return (
      <>
        <Link to="/forms" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"><ArrowLeft className="size-4 mr-1" /> Voltar</Link>
        <div className="text-sm text-muted-foreground">Formulário não encontrado.</div>
      </>
    );
  }

  const handleFile = async (fieldId: string, file: File | undefined) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Arquivo muito grande (máx 2 MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setValues({ ...values, [fieldId]: { name: file.name, type: file.type, dataUrl: reader.result as string } });
    };
    reader.readAsDataURL(file);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const required = custom.fields.filter((f: FormField) => f.required);
    for (const r of required) {
      const v = values[r.id];
      if (v == null || v === "" || (Array.isArray(v) && v.length === 0)) {
        return toast.error(`Campo obrigatório: ${r.label}`);
      }
    }
    const submittedAt = new Date();
    const resp: FormResponseRow = {
      id: newId("R"),
      form_id: custom.id,
      values,
      submitted_by: user?.id ?? null,
      submitted_by_name: user?.name ?? "—",
      submitted_at: submittedAt.toISOString(),
      approval_status: custom.requires_approval ? "pending" : "n/a",
      approver_id: null,
      approved_at: null,
    };
    await saveResponse(resp);

    // Metadados (vínculo + prazo)
    const deadlineDays = formMeta?.deadline_days ?? null;
    const deadlineAt = deadlineDays != null
      ? new Date(submittedAt.getTime() + deadlineDays * 86400000).toISOString()
      : null;
    const linkLabel = linkOptions.find((o) => o.id === linkRecordId)?.label ?? null;
    if (linkModule || deadlineAt) {
      await upsertResponseMeta({
        response_id: resp.id,
        linked_module: (linkModule as LinkableModule) || null,
        linked_record_id: linkRecordId || null,
        linked_record_label: linkLabel,
        deadline_at: deadlineAt,
      });
    }

    setValues({});
    setLinkModule("");
    setLinkRecordId("");
    toast.success("Resposta enviada", {
      description: custom.requires_approval ? "Aguardando aprovação." : "Registrada com sucesso.",
    });
  };

  const decide = async (rid: string, decision: "approved" | "rejected") => {
    await updateResponse(rid, {
      approval_status: decision,
      approver_id: user?.id ?? null,
      approved_at: new Date().toISOString(),
    });
    toast.success(decision === "approved" ? "Resposta aprovada" : "Resposta rejeitada");
  };

  const exportCsv = () => {
    const headers = ["protocolo", "enviado_em", "enviado_por", "status_aprovacao", "vinculo_modulo", "vinculo_registro", "prazo_em", ...custom.fields.map((f) => f.label)];
    const escape = (v: any) => {
      const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };
    const lines = [headers.map(escape).join(",")];
    for (const r of responses) {
      const meta = respMeta.byId[r.id];
      lines.push([
        r.id,
        new Date(r.submitted_at).toLocaleString("pt-BR"),
        r.submitted_by_name ?? "",
        r.approval_status,
        meta?.linked_module ?? "",
        meta?.linked_record_label ?? "",
        meta?.deadline_at ? new Date(meta.deadline_at).toLocaleDateString("pt-BR") : "",
        ...custom.fields.map((f) => {
          const v = r.values[f.id];
          if (v && typeof v === "object" && "name" in v) return v.name;
          return Array.isArray(v) ? v.join("; ") : (v ?? "");
        }),
      ].map(escape).join(","));
    }
    const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${custom.title.replace(/\s+/g, "_")}_respostas.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const allowedModules = formMeta?.linked_modules ?? [];
  const allowedModuleDefs = LINKABLE_MODULES.filter((m) => allowedModules.includes(m.value));

  return (
    <>
      <Link to="/forms" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"><ArrowLeft className="size-4 mr-1" /> Voltar</Link>
      <PageHeader
        title={custom.title}
        description={`${custom.id} · ${custom.fields.length} campos${formMeta?.deadline_days ? ` · prazo ${formMeta.deadline_days}d` : ""}`}
        actions={
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide bg-primary/10 text-primary rounded px-1.5 py-0.5"><Sparkles className="size-2.5" /> personalizado</span>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={responses.length === 0}>
              <Download className="size-4" /> Exportar CSV
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4">
        <form className="bg-card border border-border rounded-lg p-6 shadow-sm space-y-4" onSubmit={submit}>
          {custom.description && <p className="text-sm text-muted-foreground">{custom.description}</p>}

          {allowedModuleDefs.length > 0 && (
            <div className="bg-muted/30 border border-border rounded-md p-3 space-y-2">
              <div className="text-xs font-semibold flex items-center gap-1.5"><Link2 className="size-3" /> Vincular esta resposta a um registro</div>
              <div className="grid sm:grid-cols-2 gap-2">
                <select
                  value={linkModule}
                  onChange={(e) => { setLinkModule(e.target.value as LinkableModule | ""); setLinkRecordId(""); }}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                >
                  <option value="">— sem vínculo —</option>
                  {allowedModuleDefs.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <select
                  value={linkRecordId}
                  onChange={(e) => setLinkRecordId(e.target.value)}
                  disabled={!linkModule}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                >
                  <option value="">— selecionar registro —</option>
                  {linkOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </div>
            </div>
          )}

          {custom.fields.map((f: FormField) => (
            <div key={f.id} className="space-y-1.5">
              <Label className="text-sm">{f.label} {f.required && <span className="text-destructive">*</span>}</Label>
              {f.type === "text" && <Input value={values[f.id] ?? ""} onChange={(e) => setValues({ ...values, [f.id]: e.target.value })} />}
              {f.type === "textarea" && <textarea className="w-full min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm" value={values[f.id] ?? ""} onChange={(e) => setValues({ ...values, [f.id]: e.target.value })} />}
              {f.type === "number" && <Input type="number" step="any" value={values[f.id] ?? ""} onChange={(e) => setValues({ ...values, [f.id]: e.target.value })} />}
              {f.type === "date" && <Input type="date" value={values[f.id] ?? ""} onChange={(e) => setValues({ ...values, [f.id]: e.target.value })} />}
              {f.type === "file" && (
                <div className="space-y-1">
                  <Input type="file" onChange={(e) => handleFile(f.id, e.target.files?.[0])} />
                  {values[f.id]?.name && <div className="text-xs text-muted-foreground">📎 {values[f.id].name}</div>}
                </div>
              )}
              {f.type === "select" && (
                <select className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={values[f.id] ?? ""} onChange={(e) => setValues({ ...values, [f.id]: e.target.value })}>
                  <option value="">— selecionar —</option>
                  {(f.options ?? []).map((o: string, i: number) => <option key={i} value={o}>{o}</option>)}
                </select>
              )}
              {f.type === "checkbox" && (f.options ?? []).map((o: string, i: number) => {
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
              {f.type === "radio" && (f.options ?? []).map((o: string, i: number) => (
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
          <h3 className="text-sm font-semibold flex items-center gap-1.5"><History className="size-4" /> Histórico de respostas ({responses.length})</h3>
          {custom.requires_approval && (
            <div className="text-[11px] text-muted-foreground bg-muted rounded p-2">
              Este formulário exige aprovação. Aprovadores: {custom.approvers.join(", ")}.
            </div>
          )}
          {responses.length === 0 && <div className="text-xs text-muted-foreground italic">Nenhuma resposta ainda.</div>}
          <div className="space-y-2 max-h-[560px] overflow-y-auto">
            {responses.map((r) => {
              const meta = respMeta.byId[r.id];
              const overdue = meta?.deadline_at && new Date(meta.deadline_at).getTime() < Date.now() && r.approval_status !== "approved";
              return (
                <div key={r.id} className="border border-border rounded-md p-2.5 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{r.submitted_by_name ?? "—"}</span>
                    <span className="text-muted-foreground">{new Date(r.submitted_at).toLocaleString("pt-BR")}</span>
                  </div>
                  <div className="font-mono text-[10px] text-muted-foreground">{r.id}</div>
                  {meta?.linked_record_label && (
                    <div className="flex items-center gap-1 text-[11px] text-primary"><Link2 className="size-3" /> {meta.linked_record_label}</div>
                  )}
                  {meta?.deadline_at && (
                    <div className={`flex items-center gap-1 text-[11px] ${overdue ? "text-destructive" : "text-muted-foreground"}`}>
                      <Clock className="size-3" /> Prazo: {new Date(meta.deadline_at).toLocaleDateString("pt-BR")} {overdue && "(vencido)"}
                    </div>
                  )}
                  <div className="text-muted-foreground">
                    {custom.fields.slice(0, 2).map((f: FormField) => {
                      const v = r.values[f.id];
                      const display = v && typeof v === "object" && "name" in v ? `📎 ${v.name}` : (Array.isArray(v) ? v.join(", ") : (v ?? "—"));
                      return <div key={f.id}>{f.label}: <span className="text-foreground">{display}</span></div>;
                    })}
                  </div>
                  {r.approval_status !== "n/a" && (
                    <div className="flex items-center justify-between pt-1.5 border-t border-border">
                      <StatusBadge>
                        {r.approval_status === "pending" ? "Aguardando aprovação" : r.approval_status === "approved" ? "Aprovado" : "Reprovado"}
                      </StatusBadge>
                      {r.approval_status === "pending" && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" className="h-6 px-2" onClick={() => decide(r.id, "rejected")}><XCircle className="size-3 text-destructive" /></Button>
                          <Button size="sm" className="h-6 px-2" onClick={() => decide(r.id, "approved")}><CheckCircle2 className="size-3" /></Button>
                        </div>
                      )}
                    </div>
                  )}
                  {r.approved_at && (
                    <div className="text-[10px] text-muted-foreground">Decidido em {new Date(r.approved_at).toLocaleString("pt-BR")}</div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </>
  );
}
