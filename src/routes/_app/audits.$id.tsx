import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useTableStore } from "@/lib/table-store";
import {
  auditsStore, auditFindingsStore, saveAudit, saveFinding, deleteFinding, newId,
  type AuditFindingRow,
} from "@/lib/audits-store";
import { OfflineBanner } from "@/components/OfflineBanner";

export const Route = createFileRoute("/_app/audits/$id")({ component: AuditDetail });

const RESULTS = ["conforme", "nao_conforme", "nao_aplicavel", "observacao"];
const SEVERITIES = ["—", "menor", "maior", "critica"];

function AuditDetail() {
  const { id } = Route.useParams();
  const audits = useTableStore(auditsStore);
  const findings = useTableStore(auditFindingsStore).filter((f) => f.audit_id === id);
  const a = audits.find((x) => x.id === id);

  const [reqText, setReqText] = useState("");

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

  const addFinding = async () => {
    if (!reqText.trim()) return;
    const f: AuditFindingRow = {
      id: newId("F"),
      audit_id: a.id,
      requirement: reqText.trim(),
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

  return (
    <>
      <Link to="/audits" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="size-4 mr-1" /> Voltar
      </Link>
      <PageHeader title={a.scope} description={`${a.code ?? a.id} · ${a.type}${a.area ? " · Área " + a.area : ""}`} actions={<StatusBadge>{a.status}</StatusBadge>} />
      <OfflineBanner stores={[auditsStore, auditFindingsStore]} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card border border-border rounded-lg p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-3">Checklist da auditoria ({findings.length})</h3>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground"><tr className="text-left"><th className="py-1.5">Requisito</th><th>Resultado</th><th>Severidade</th><th>Observação</th><th></th></tr></thead>
            <tbody>
              {findings.map((c) => (
                <tr key={c.id} className="border-t border-border align-top">
                  <td className="py-2 font-medium pr-2">
                    <Input className="h-8" value={c.requirement} onChange={(e) => updateFinding(c, { requirement: e.target.value })} />
                  </td>
                  <td className="pr-2">
                    <select value={c.result} onChange={(e) => updateFinding(c, { result: e.target.value })} className="h-8 rounded-md border border-input bg-background px-2 text-xs">
                      {RESULTS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td className="pr-2">
                    <select value={c.severity ?? "—"} onChange={(e) => updateFinding(c, { severity: e.target.value === "—" ? null : e.target.value })} className="h-8 rounded-md border border-input bg-background px-2 text-xs">
                      {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="pr-2">
                    <Input className="h-8" value={c.observation ?? ""} onChange={(e) => updateFinding(c, { observation: e.target.value })} />
                  </td>
                  <td>
                    <button onClick={() => deleteFinding(c.id)} className="text-muted-foreground hover:text-destructive p-1.5"><Trash2 className="size-4" /></button>
                  </td>
                </tr>
              ))}
              {findings.length === 0 && (
                <tr><td colSpan={5} className="py-4 text-center text-xs text-muted-foreground italic">Nenhum requisito avaliado.</td></tr>
              )}
            </tbody>
          </table>
          <div className="mt-3 flex gap-2">
            <Input placeholder="Adicionar requisito (ex: 4.1 Imparcialidade)" value={reqText} onChange={(e) => setReqText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addFinding()} />
            <Button size="sm" variant="outline" onClick={addFinding}><Plus className="size-4" /> Adicionar</Button>
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
              <Button size="sm" className="w-full" onClick={() => updateAudit({ findings_count: findings.length })}>Atualizar contador de achados</Button>
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
