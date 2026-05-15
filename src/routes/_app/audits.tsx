import { createFileRoute, useNavigate, useLocation, Outlet } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAuditAccess } from "@/lib/audit";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ChevronDown, ChevronUp, Trash2, UserPlus } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { useTableStore } from "@/lib/table-store";
import {
  auditsStore,
  auditFindingsStore,
  saveAudit,
  saveFinding,
  newId,
  type AuditRow,
  type AuditFindingRow,
} from "@/lib/audits-store";
import {
  writeAuditPlan,
  emptyAuditPlan,
  type AuditPlanMeta,
  type AuditParticipant,
  type ParticipantRole,
} from "@/lib/audit-plan-store";
import { useChecklistTemplates } from "@/lib/audit-meta-store";
import { useAuth } from "@/lib/auth";
import { listProfiles, profilesStore } from "@/lib/profiles-store";
import { listDocuments, documentsStore } from "@/lib/documents-store";
import { sendEmail } from "@/lib/send-email.functions";
import { buildAuditPlannedHtml } from "@/lib/email-templates";
import { actionPlansStore } from "@/lib/action-plans-store";
import { OfflineBanner } from "@/components/OfflineBanner";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/audits")({ component: AuditsPage });

const PARTICIPANT_ROLES: { value: ParticipantRole; label: string }[] = [
  { value: "auditado", label: "Auditado" },
  { value: "observador", label: "Observador" },
  { value: "responsavel_area", label: "Responsável da área" },
  { value: "apoio_tecnico", label: "Apoio técnico" },
];

function effectiveStatus(a: AuditRow, today: string): string {
  if (a.status === "concluida" || a.status === "cancelada") return a.status;
  if (a.status !== "atrasada" && a.planned_at && a.planned_at < today) return "atrasada";
  return a.status;
}

function AuditsPage() {
  useAuditAccess("audits");
  const rows = useTableStore(auditsStore).filter((a) => !a.deleted_at);
  const findings = useTableStore(auditFindingsStore);
  const actionPlans = useTableStore(actionPlansStore);
  useTableStore(profilesStore);
  useTableStore(documentsStore);
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [showTimeline, setShowTimeline] = useState(true);

  if (location.pathname !== "/audits") return <Outlet />;

  const today = new Date().toISOString().slice(0, 10);
  const enriched = rows.map((r) => {
    const fs = findings.filter((f) => f.audit_id === r.id);
    const ncs = fs.filter((f) => f.result === "nao_conforme").length;
    const apsForAudit = actionPlans.filter(
      (ap) => ap.origin_type === "audit_finding" && fs.some((f) => f.id === ap.origin_id),
    );
    const ncWithoutAction = fs.filter(
      (f) => f.result === "nao_conforme" && !apsForAudit.some((ap) => ap.origin_id === f.id),
    ).length;
    return {
      ...r,
      _status: effectiveStatus(r, today),
      _ncs: ncs,
      _actions: apsForAudit.length,
      _pending: ncWithoutAction,
    };
  });

  const counts = {
    planejada: enriched.filter((r) => r._status === "planejada").length,
    em_andamento: enriched.filter((r) => r._status === "em_andamento").length,
    concluida: enriched.filter((r) => r._status === "concluida").length,
    atrasada: enriched.filter((r) => r._status === "atrasada").length,
  };

  const auditsByMonth = (() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 12, 1);
    const months: { month: string; count: number }[] = [];
    const cursor = new Date(start);
    while (cursor < end) {
      const key = cursor.toISOString().slice(0, 7);
      months.push({
        month: key,
        count: rows.filter((r) => r.planned_at && r.planned_at.slice(0, 7) === key).length,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return months;
  })();

  const TOOLTIP_STYLE = { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 };

  return (
    <>
      <PageHeader
        title="Auditorias"
        description="Planejamento, execução e relatórios de auditorias internas e externas"
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" /> Nova auditoria
          </Button>
        }
      />
      <OfflineBanner stores={[auditsStore, auditFindingsStore]} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-xs">
        <div className="bg-card border border-border rounded-lg p-3"><div className="text-muted-foreground">Planejadas</div><div className="text-2xl font-semibold">{counts.planejada}</div></div>
        <div className="bg-card border border-border rounded-lg p-3"><div className="text-muted-foreground">Em andamento</div><div className="text-2xl font-semibold">{counts.em_andamento}</div></div>
        <div className="bg-card border border-border rounded-lg p-3"><div className="text-muted-foreground">Concluídas</div><div className="text-2xl font-semibold">{counts.concluida}</div></div>
        <div className="bg-card border border-border rounded-lg p-3"><div className="text-muted-foreground">Atrasadas</div><div className="text-2xl font-semibold text-destructive">{counts.atrasada}</div></div>
      </div>

      <div className="bg-card border border-border rounded-lg mb-4">
        <button type="button" className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium" onClick={() => setShowTimeline((v) => !v)}>
          <span>Planejamento por mês</span>
          {showTimeline ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </button>
        {showTimeline && (
          <div className="h-48 px-4 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={auditsByMonth} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <DataTable
        data={enriched}
        searchKeys={["id", "code", "scope", "auditor_name", "area", "status", "type"]}
        hideNew
        exportName="auditorias"
        onRowClick={(r) => navigate({ to: "/audits/$id", params: { id: r.id } })}
        columns={[
          { key: "code", header: "Código", render: (r) => <span className="font-mono text-xs">{r.code ?? r.id}</span> },
          { key: "type", header: "Tipo", render: (r) => <StatusBadge tone="info">{r.type}</StatusBadge> },
          { key: "scope", header: "Escopo", render: (r) => <span className="font-medium">{r.scope}</span> },
          { key: "area", header: "Área", render: (r) => r.area ?? "—" },
          { key: "auditor_name", header: "Auditor", render: (r) => r.auditor_name ?? "—" },
          { key: "planned_at", header: "Planejada", render: (r) => r.planned_at ?? "—" },
          { key: "_ncs", header: "NCs", render: (r) => r._ncs },
          { key: "_actions", header: "Ações", render: (r) => r._actions },
          { key: "_pending", header: "Pendências", render: (r) => r._pending > 0 ? <span className="text-destructive font-medium">{r._pending}</span> : r._pending },
          { key: "_status", header: "Status", render: (r) => <StatusBadge>{r._status}</StatusBadge> },
        ]}
      />

      <NewAuditDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

function NewAuditDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const templates = useChecklistTemplates();
  const profiles = listProfiles();
  const documents = listDocuments().filter((d) => !d.deleted_at);

  const [draft, setDraft] = useState({
    scope: "",
    type: "Interna",
    area: "",
    auditor_name: "",
    planned_at: new Date().toISOString().slice(0, 10),
  });
  const [plan, setPlan] = useState<AuditPlanMeta>(emptyAuditPlan());
  const [notify, setNotify] = useState(true);
  const [extName, setExtName] = useState("");
  const [extEmail, setExtEmail] = useState("");
  const [extRole, setExtRole] = useState<ParticipantRole>("auditado");
  const [intUserId, setIntUserId] = useState("");
  const [intRole, setIntRole] = useState<ParticipantRole>("auditado");

  const reset = () => {
    setDraft({ scope: "", type: "Interna", area: "", auditor_name: "", planned_at: new Date().toISOString().slice(0, 10) });
    setPlan(emptyAuditPlan());
    setNotify(true);
    setExtName(""); setExtEmail(""); setExtRole("auditado");
    setIntUserId(""); setIntRole("auditado");
  };

  const addInternal = () => {
    if (!intUserId) return;
    const p = profiles.find((x) => x.id === intUserId);
    if (!p) return;
    if (plan.participants.some((x) => x.user_id === p.id)) {
      toast.error("Participante já adicionado");
      return;
    }
    const np: AuditParticipant = { id: newId("PART"), kind: "internal", user_id: p.id, name: p.name, email: p.email, role: intRole };
    setPlan((s) => ({ ...s, participants: [...s.participants, np] }));
    setIntUserId("");
  };

  const addExternal = () => {
    if (!extName.trim()) return;
    const np: AuditParticipant = { id: newId("PART"), kind: "external", user_id: null, name: extName.trim(), email: extEmail.trim() || null, role: extRole };
    setPlan((s) => ({ ...s, participants: [...s.participants, np] }));
    setExtName(""); setExtEmail("");
  };

  const removeParticipant = (id: string) =>
    setPlan((s) => ({ ...s, participants: s.participants.filter((p) => p.id !== id) }));

  const toggleDoc = (id: string) =>
    setPlan((s) => ({
      ...s,
      document_ref_ids: s.document_ref_ids.includes(id)
        ? s.document_ref_ids.filter((x) => x !== id)
        : [...s.document_ref_ids, id],
    }));

  const [saving, setSaving] = useState(false);

  const create = async () => {
    if (!draft.scope.trim()) {
      toast.error("Informe o escopo da auditoria");
      return;
    }
    setSaving(true);
    const id = newId("AUD");
    const a: AuditRow = {
      id,
      code: id,
      type: draft.type,
      scope: draft.scope.trim(),
      area: draft.area.trim() || null,
      auditor_id: user?.id ?? null,
      auditor_name: draft.auditor_name.trim() || (user?.name ?? null),
      planned_at: draft.planned_at || null,
      performed_at: null,
      status: "planejada",
      findings_count: 0,
      notes: plan.observations.trim() || null,
    };
    try {
    await saveAudit(a);
    await writeAuditPlan(id, plan);

    // Carrega checklist vinculado, se houver
    if (plan.checklist_template_id) {
      const tpl = templates.find((t) => t.id === plan.checklist_template_id);
      if (tpl) {
        let pos = 0;
        for (const req of tpl.requirements) {
          const f: AuditFindingRow = {
            id: newId("F"),
            audit_id: id,
            requirement: req,
            result: "conforme",
            severity: null,
            observation: null,
            position: pos++,
          };
          await saveFinding(f);
        }
        await saveAudit({ ...a, findings_count: tpl.requirements.length });
      }
    }

    // Notificações
    if (notify) {
      const checklistName = plan.checklist_template_id
        ? templates.find((t) => t.id === plan.checklist_template_id)?.name ?? null
        : null;
      const docRefs = plan.document_ref_ids
        .map((did) => documents.find((d) => d.id === did))
        .filter(Boolean)
        .map((d) => `${d!.code} — ${d!.title}`);

      const recipients = new Map<string, string>();
      plan.participants.forEach((p) => { if (p.email) recipients.set(p.email, p.name); });
      const auditor = profiles.find((p) => p.name === a.auditor_name);
      if (auditor?.email) recipients.set(auditor.email, auditor.name);

      for (const [email, name] of recipients) {
        sendEmail({
          data: {
            to: email,
            subject: `Qualilab — Auditoria planejada (${a.code})`,
            html: buildAuditPlannedHtml({
              recipientName: name,
              code: a.code ?? a.id,
              type: a.type,
              scope: a.scope,
              area: a.area,
              auditor: a.auditor_name,
              planned_at: a.planned_at,
              objective: plan.objective || null,
              criterion: plan.criterion || null,
              checklist: checklistName,
              document_refs: docRefs,
            }),
          },
        }).catch(console.warn);
      }
      if (recipients.size > 0) toast.success(`Notificações enviadas (${recipients.size}).`);
    }

    toast.success("Auditoria planejada com sucesso");
    reset();
    onOpenChange(false);
    navigate({ to: "/audits/$id", params: { id } });
    } catch (err) {
      console.error("[audits] create:", err);
      const anyErr = err as Record<string, unknown> | null;
      const desc = anyErr?.message ?? anyErr?.error_description ?? anyErr?.error ?? JSON.stringify(err);
      toast.error("Erro ao criar auditoria", { description: String(desc) });
    } finally {
      setSaving(false);
    }
  };

  const internalOptions = useMemo(
    () => profiles.filter((p) => !plan.participants.some((x) => x.user_id === p.id)),
    [profiles, plan.participants],
  );

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Plus className="size-4" /> Planejar nova auditoria</DialogTitle>
          <DialogDescription>Cadastro completo do planejamento — escopo, objetivo, critério, participantes, checklist e roteiro.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Identificação */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">1. Identificação</h3>
            <div className="space-y-1.5">
              <Label className="text-xs">Escopo *</Label>
              <Input placeholder="Ex: Conformidade NBR ISO/IEC 17025 — Seção 4" value={draft.scope} onChange={(e) => setDraft((d) => ({ ...d, scope: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo</Label>
                <Select value={draft.type} onValueChange={(v) => setDraft((d) => ({ ...d, type: v }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Interna">Interna</SelectItem>
                    <SelectItem value="Externa">Externa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Área</Label>
                <Input placeholder="Ex: Laboratório A" value={draft.area} onChange={(e) => setDraft((d) => ({ ...d, area: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Auditor responsável</Label>
                <Input placeholder={user?.name ?? "Nome do auditor"} value={draft.auditor_name} onChange={(e) => setDraft((d) => ({ ...d, auditor_name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Data planejada</Label>
                <Input type="date" value={draft.planned_at} onChange={(e) => setDraft((d) => ({ ...d, planned_at: e.target.value }))} />
              </div>
            </div>
          </section>

          {/* Objetivo + critério */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">2. Objetivo e critério</h3>
            <div className="space-y-1.5">
              <Label className="text-xs">Objetivo da auditoria</Label>
              <Textarea rows={2} placeholder="Ex: Verificar conformidade dos processos laboratoriais com os requisitos da ABNT NBR ISO/IEC 17025:2017." value={plan.objective} onChange={(e) => setPlan((s) => ({ ...s, objective: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Critério (norma, procedimento, requisito)</Label>
              <Input placeholder="Ex: ABNT NBR ISO/IEC 17025:2017 / Manual da Qualidade" value={plan.criterion} onChange={(e) => setPlan((s) => ({ ...s, criterion: e.target.value }))} />
            </div>
          </section>

          {/* Participantes */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">3. Auditados / participantes</h3>

            <div className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-6 space-y-1">
                <Label className="text-xs">Colaborador interno</Label>
                <Select value={intUserId} onValueChange={setIntUserId}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecionar…" /></SelectTrigger>
                  <SelectContent>
                    {internalOptions.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-4 space-y-1">
                <Label className="text-xs">Papel</Label>
                <Select value={intRole} onValueChange={(v) => setIntRole(v as ParticipantRole)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PARTICIPANT_ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button type="button" size="sm" variant="outline" className="col-span-2" onClick={addInternal} disabled={!intUserId}>
                <UserPlus className="size-4" /> Adicionar
              </Button>
            </div>

            <div className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-4 space-y-1">
                <Label className="text-xs">Externo — nome</Label>
                <Input className="h-9" value={extName} onChange={(e) => setExtName(e.target.value)} />
              </div>
              <div className="col-span-4 space-y-1">
                <Label className="text-xs">E-mail</Label>
                <Input className="h-9" type="email" value={extEmail} onChange={(e) => setExtEmail(e.target.value)} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Papel</Label>
                <Select value={extRole} onValueChange={(v) => setExtRole(v as ParticipantRole)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PARTICIPANT_ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button type="button" size="sm" variant="outline" className="col-span-2" onClick={addExternal} disabled={!extName.trim()}>
                <UserPlus className="size-4" /> Adicionar
              </Button>
            </div>

            {plan.participants.length > 0 && (
              <div className="border border-border rounded-md divide-y">
                {plan.participants.map((p) => (
                  <div key={p.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <div>
                      <span className="font-medium">{p.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {p.kind === "external" ? "externo" : "interno"} · {PARTICIPANT_ROLES.find((r) => r.value === p.role)?.label}
                        {p.email ? ` · ${p.email}` : ""}
                      </span>
                    </div>
                    <button onClick={() => removeParticipant(p.id)} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="size-4" /></button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Checklist */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">4. Checklist vinculado</h3>
            <div className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-8 space-y-1">
                <Label className="text-xs">Template</Label>
                <Select value={plan.checklist_template_id ?? "__none"} onValueChange={(v) => setPlan((s) => ({ ...s, checklist_template_id: v === "__none" ? null : v }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">— Sem checklist —</SelectItem>
                    {templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name} ({t.requirements.length} itens)</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-4 flex items-center gap-2 pb-2">
                <Checkbox id="cklreq" checked={plan.checklist_required} onCheckedChange={(v) => setPlan((s) => ({ ...s, checklist_required: !!v }))} />
                <Label htmlFor="cklreq" className="text-xs">Obrigatório para execução</Label>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Para criar um novo template, abra a auditoria e use “Salvar como template” após montar o checklist.</p>
          </section>

          {/* Roteiro */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">5. Plano / roteiro</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Início previsto</Label>
                <Input type="time" value={plan.start_time ?? ""} onChange={(e) => setPlan((s) => ({ ...s, start_time: e.target.value || null }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Término previsto</Label>
                <Input type="time" value={plan.end_time ?? ""} onChange={(e) => setPlan((s) => ({ ...s, end_time: e.target.value || null }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Processos / áreas avaliados</Label>
              <Input placeholder="Ex: Recebimento de amostras, Calibração, Emissão de laudos" value={plan.scope_areas} onChange={(e) => setPlan((s) => ({ ...s, scope_areas: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Responsáveis por acompanhar</Label>
              <Input placeholder="Ex: João Silva, Maria Souza" value={plan.followers} onChange={(e) => setPlan((s) => ({ ...s, followers: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Observações do roteiro</Label>
              <Textarea rows={2} value={plan.roteiro_notes} onChange={(e) => setPlan((s) => ({ ...s, roteiro_notes: e.target.value }))} />
            </div>
          </section>

          {/* Documentos */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">6. Documentos de referência</h3>
            {documents.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Nenhum documento cadastrado.</p>
            ) : (
              <div className="border border-border rounded-md max-h-40 overflow-y-auto divide-y">
                {documents.map((d) => (
                  <label key={d.id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-accent/40">
                    <Checkbox checked={plan.document_ref_ids.includes(d.id)} onCheckedChange={() => toggleDoc(d.id)} />
                    <span className="font-mono text-xs text-muted-foreground">{d.code}</span>
                    <span>{d.title}</span>
                  </label>
                ))}
              </div>
            )}
          </section>

          {/* Observações + notificações */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">7. Observações e notificações</h3>
            <div className="space-y-1.5">
              <Label className="text-xs">Observações gerais</Label>
              <Textarea rows={2} value={plan.observations} onChange={(e) => setPlan((s) => ({ ...s, observations: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="notify" checked={notify} onCheckedChange={(v) => setNotify(!!v)} />
              <Label htmlFor="notify" className="text-xs">Notificar auditor e participantes por e-mail</Label>
            </div>
          </section>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={() => { onOpenChange(false); reset(); }} disabled={saving}>Cancelar</Button>
          <Button onClick={create} disabled={saving}>{saving ? "Criando…" : "Criar auditoria"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
