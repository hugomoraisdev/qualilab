import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { ArrowLeft, Plus, Trash2, FileDown, Paperclip, ListPlus, BookmarkPlus, ExternalLink } from "lucide-react";
import { useTableStore } from "@/lib/table-store";
import {
  auditsStore, auditFindingsStore, saveAudit, saveFinding, deleteFinding, newId,
  type AuditFindingRow,
} from "@/lib/audits-store";
import {
  useAllFindingMeta, updateFindingMeta, useChecklistTemplates, saveTemplate,
  type ChecklistTemplate,
} from "@/lib/audit-meta-store";
import { actionPlansStore, saveActionPlan, type ActionPlanRow } from "@/lib/action-plans-store";
import { OfflineBanner } from "@/components/OfflineBanner";
import { exportAuditReportPdf } from "@/lib/pdf-export";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/audits/$id")({ component: AuditDetail });

const RESULTS = ["conforme", "nao_conforme", "nao_aplicavel", "observacao"];
const SEVERITIES = ["—", "menor", "maior", "critica"];

function AuditDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const audits = useTableStore(auditsStore);
  const findings = useTableStore(auditFindingsStore).filter((f) => f.audit_id === id);
  const actionPlans = useTableStore(actionPlansStore);
  const a = audits.find((x) => x.id === id);

  const findingIds = useMemo(() => findings.map((f) => f.id), [findings]);
  const metaMap = useAllFindingMeta(findingIds);
  const templates = useChecklistTemplates();

  const [reqText, setReqText] = useState("");
  const [tplId, setTplId] = useState<string>("");
  const [saveTplOpen, setSaveTplOpen] = useState(false);
  const [tplName, setTplName] = useState("");
  const [tplDesc, setTplDesc] = useState("");

  const [actionDlg, setActionDlg] = useState<{ finding: AuditFindingRow } | null>(null);
  const [actDesc, setActDesc] = useState("");
  const [actResp, setActResp] = useState("");
  const [actDeadline, setActDeadline] = useState("");
  const [actPriority, setActPriority] = useState("media");

  if (!a) {
    return (
      <>
        <Link to="/audits" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="size-4 mr-1" /> Voltar
        </Link>
        <div className="text-sm text-muted-foreground">Auditoria não encontrada.</div>
      </>
    );
  }

  const updateAudit = async (patch: Partial<typeof a>) => {
    await saveAudit({ ...a, ...patch });
  };

  const addFinding = async (text?: string) => {
    const requirement = (text ?? reqText).trim();
    if (!requirement) return;
    const f: AuditFindingRow = {
      id: newId("F"),
      audit_id: a.id,
      requirement,
      result: "conforme",
      severity: null,
      observation: null,
      position: findings.length,
    };
    await saveFinding(f);
    setReqText("");
  };

  const updateFinding = async (f: AuditFindingRow, patch: Partial<AuditFindingRow>) => {
    await saveFinding({ ...f, ...patch });
  };

  const loadTemplate = async () => {
    const t = templates.find((x) => x.id === tplId);
    if (!t) return;
    let pos = findings.length;
    for (const req of t.requirements) {
      await saveFinding({
        id: newId("F"),
        audit_id: a.id,
        requirement: req,
        result: "conforme",
        severity: null,
        observation: null,
        position: pos++,
      });
    }
    toast.success(`Template "${t.name}" carregado (${t.requirements.length} itens).`);
    setTplId("");
  };

  const saveAsTemplate = async () => {
    if (!tplName.trim() || findings.length === 0) return;
    const t: ChecklistTemplate = {
      id: newId("TPL"),
      name: tplName.trim(),
      description: tplDesc.trim() || null,
      requirements: findings.map((f) => f.requirement),
      created_at: new Date().toISOString(),
    };
    await saveTemplate(t);
    toast.success("Template salvo.");
    setSaveTplOpen(false);
    setTplName("");
    setTplDesc("");
  };

  const openActionFor = (f: AuditFindingRow) => {
    const meta = metaMap[f.id];
    setActionDlg({ finding: f });
    setActDesc(`Tratar achado: ${f.requirement}${f.observation ? " — " + f.observation : ""}`);
    setActResp(meta?.responsible ?? "");
    setActDeadline(meta?.deadline ?? "");
    setActPriority(f.severity === "critica" ? "alta" : f.severity === "maior" ? "alta" : "media");
  };

  const createActionPlan = async () => {
    if (!actionDlg) return;
    const f = actionDlg.finding;
    const ap: ActionPlanRow = {
      id: newId("AP"),
      code: null,
      origin_type: "audit_finding",
      origin_id: f.id,
      description: actDesc.trim(),
      responsible_id: actResp.trim() || null,
      deadline: actDeadline || null,
      priority: actPriority,
      status: "pendente",
      progress: 0,
      notes: `Auditoria ${a.code ?? a.id}`,
    };
    await saveActionPlan(ap);
    await updateFindingMeta(f.id, (prev) => ({
      ...prev, action_plan_id: ap.id, responsible: actResp.trim() || null, deadline: actDeadline || null,
    }));
    toast.success("Plano de ação criado.");
    setActionDlg(null);
  };

  const counts = useMemo(() => {
    const c = { conforme: 0, nao_conforme: 0, observacao: 0, nao_aplicavel: 0 };
    findings.forEach((f) => { c[f.result as keyof typeof c] = (c[f.result as keyof typeof c] ?? 0) + 1; });
    return c;
  }, [findings]);

  return (
    <>
      <Link to="/audits" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="size-4 mr-1" /> Voltar
      </Link>
      <PageHeader
        title={a.scope}
        description={`${a.code ?? a.id} · ${a.type}${a.area ? " · Área " + a.area : ""}`}
        actions={
          <>
            <StatusBadge>{a.status}</StatusBadge>
            <Button size="sm" variant="outline" onClick={() => exportAuditReportPdf({
              code: a.code ?? a.id,
              type: a.type,
              scope: a.scope,
              area: a.area,
              auditor: a.auditor_name,
              planned_at: a.planned_at,
              performed_at: a.performed_at,
              status: a.status,
              notes: a.notes,
              findings: findings.map((f) => {
                const m = metaMap[f.id];
                const ap = m?.action_plan_id ? actionPlans.find((x) => x.id === m.action_plan_id) : null;
                return {
                  requirement: f.requirement,
                  result: f.result,
                  severity: f.severity,
                  observation: f.observation,
                  evidence: m?.evidence_urls?.length
                    ? m.evidence_urls.join("\n") + (m.evidence_notes ? "\n" + m.evidence_notes : "")
                    : (m?.evidence_notes ?? null),
                  responsible: ap?.responsible ?? m?.responsible ?? null,
                  deadline: ap?.deadline ?? m?.deadline ?? null,
                  action_status: ap?.status ?? null,
                };
              }),
            })}>
              <FileDown className="size-4" /> Exportar PDF
            </Button>
          </>
        }
      />
      <OfflineBanner stores={[auditsStore, auditFindingsStore]} />

      <div className="grid grid-cols-4 gap-3 mb-4 text-xs">
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="text-muted-foreground">Conformes</div>
          <div className="text-2xl font-semibold">{counts.conforme}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="text-muted-foreground">Não conformes</div>
          <div className="text-2xl font-semibold text-destructive">{counts.nao_conforme}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="text-muted-foreground">Observações</div>
          <div className="text-2xl font-semibold">{counts.observacao}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="text-muted-foreground">N/A</div>
          <div className="text-2xl font-semibold">{counts.nao_aplicavel}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card border border-border rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
            <h3 className="text-sm font-semibold">Checklist da auditoria ({findings.length})</h3>
            <div className="flex items-center gap-2">
              <select
                value={tplId}
                onChange={(e) => setTplId(e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
              >
                <option value="">Carregar template…</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} ({t.requirements.length})</option>
                ))}
              </select>
              <Button size="sm" variant="outline" disabled={!tplId} onClick={loadTemplate}>
                <ListPlus className="size-4" /> Carregar
              </Button>
              <Button size="sm" variant="outline" disabled={findings.length === 0} onClick={() => setSaveTplOpen(true)}>
                <BookmarkPlus className="size-4" /> Salvar como template
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {findings.map((c) => {
              const meta = metaMap[c.id];
              const ap = meta?.action_plan_id ? actionPlans.find((x) => x.id === meta.action_plan_id) : null;
              const isNC = c.result === "nao_conforme" || c.result === "observacao";
              return (
                <div key={c.id} className="border border-border rounded-md p-3 bg-background/40">
                  <div className="flex gap-2 items-start">
                    <Input
                      className="h-8 flex-1 font-medium"
                      value={c.requirement}
                      onChange={(e) => updateFinding(c, { requirement: e.target.value })}
                    />
                    <select
                      value={c.result}
                      onChange={(e) => updateFinding(c, { result: e.target.value })}
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                    >
                      {RESULTS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <select
                      value={c.severity ?? "—"}
                      onChange={(e) => updateFinding(c, { severity: e.target.value === "—" ? null : e.target.value })}
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                    >
                      {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <button onClick={() => deleteFinding(c.id)} className="text-muted-foreground hover:text-destructive p-1.5">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                    <Input
                      className="h-8"
                      placeholder="Observação"
                      value={c.observation ?? ""}
                      onChange={(e) => updateFinding(c, { observation: e.target.value })}
                    />
                    <Input
                      className="h-8"
                      placeholder="Evidência (URL — anexo, foto, link)"
                      value={meta?.evidence_urls?.[0] ?? ""}
                      onChange={(e) => updateFindingMeta(c.id, (p) => ({ ...p, evidence_urls: e.target.value ? [e.target.value] : [] }))}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      {meta?.evidence_urls?.[0] && (
                        <a href={meta.evidence_urls[0]} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-foreground">
                          <Paperclip className="size-3" /> ver evidência
                        </a>
                      )}
                      {ap && (
                        <button
                          onClick={() => navigate({ to: "/action-plans" })}
                          className="inline-flex items-center gap-1 hover:text-foreground"
                        >
                          <ExternalLink className="size-3" />
                          Plano: {ap.responsible_id ?? "sem responsável"} · {ap.deadline ?? "sem prazo"} · {ap.status}
                        </button>
                      )}
                    </div>
                    {isNC && !ap && (
                      <Button size="sm" variant="outline" onClick={() => openActionFor(c)}>
                        <Plus className="size-3" /> Gerar plano de ação
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
            {findings.length === 0 && (
              <div className="py-4 text-center text-xs text-muted-foreground italic">Nenhum requisito avaliado.</div>
            )}
          </div>

          <div className="mt-3 flex gap-2">
            <Input
              placeholder="Adicionar requisito (ex: 4.1 Imparcialidade)"
              value={reqText}
              onChange={(e) => setReqText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addFinding()}
            />
            <Button size="sm" variant="outline" onClick={() => addFinding()}>
              <Plus className="size-4" /> Adicionar
            </Button>
          </div>
        </div>

        <aside className="space-y-4">
          <section className="bg-card border border-border rounded-lg p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-semibold">Dados da auditoria</h3>
            <div className="space-y-2 text-sm">
              <div className="space-y-1"><Label className="text-xs">Tipo</Label>
                <select value={a.type} onChange={(e) => updateAudit({ type: e.target.value })} className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs">
                  <option>Interna</option><option>Externa</option>
                </select>
              </div>
              <div className="space-y-1"><Label className="text-xs">Escopo</Label><Input className="h-8" value={a.scope} onChange={(e) => updateAudit({ scope: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs">Área</Label><Input className="h-8" value={a.area ?? ""} onChange={(e) => updateAudit({ area: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs">Auditor</Label><Input className="h-8" value={a.auditor_name ?? ""} onChange={(e) => updateAudit({ auditor_name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Planejada</Label><Input className="h-8" type="date" value={a.planned_at ?? ""} onChange={(e) => updateAudit({ planned_at: e.target.value || null })} /></div>
                <div><Label className="text-xs">Realizada</Label><Input className="h-8" type="date" value={a.performed_at ?? ""} onChange={(e) => updateAudit({ performed_at: e.target.value || null })} /></div>
              </div>
              <div className="space-y-1"><Label className="text-xs">Status</Label>
                <select value={a.status} onChange={(e) => updateAudit({ status: e.target.value })} className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs">
                  <option value="planejada">Planejada</option>
                  <option value="em_andamento">Em andamento</option>
                  <option value="concluida">Concluída</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>
              <div className="space-y-1"><Label className="text-xs">Observações gerais</Label>
                <Textarea rows={3} value={a.notes ?? ""} onChange={(e) => updateAudit({ notes: e.target.value })} />
              </div>
              <Button size="sm" className="w-full" onClick={() => updateAudit({ findings_count: findings.length })}>
                Atualizar contador de achados
              </Button>
            </div>
          </section>
        </aside>
      </div>

      {/* Save template dialog */}
      <Dialog open={saveTplOpen} onOpenChange={setSaveTplOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salvar checklist como template</DialogTitle>
            <DialogDescription>Reaproveite os {findings.length} requisitos atuais em futuras auditorias.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <div><Label className="text-xs">Nome</Label><Input value={tplName} onChange={(e) => setTplName(e.target.value)} /></div>
            <div><Label className="text-xs">Descrição</Label><Textarea rows={2} value={tplDesc} onChange={(e) => setTplDesc(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveTplOpen(false)}>Cancelar</Button>
            <Button onClick={saveAsTemplate} disabled={!tplName.trim()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action plan dialog */}
      <Dialog open={!!actionDlg} onOpenChange={(o) => !o && setActionDlg(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerar plano de ação</DialogTitle>
            <DialogDescription>Vincula este achado a um plano de ação corretivo.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <div><Label className="text-xs">Descrição da ação</Label>
              <Textarea rows={3} value={actDesc} onChange={(e) => setActDesc(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Responsável</Label>
                <Input value={actResp} onChange={(e) => setActResp(e.target.value)} placeholder={user?.name ?? ""} />
              </div>
              <div><Label className="text-xs">Prazo</Label>
                <Input type="date" value={actDeadline} onChange={(e) => setActDeadline(e.target.value)} />
              </div>
            </div>
            <div><Label className="text-xs">Prioridade</Label>
              <select value={actPriority} onChange={(e) => setActPriority(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDlg(null)}>Cancelar</Button>
            <Button onClick={createActionPlan} disabled={!actDesc.trim()}>Criar ação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
