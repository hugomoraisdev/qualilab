import { createFileRoute, useNavigate, useLocation, Outlet } from "@tanstack/react-router";
import { useState } from "react";
import { useAuditAccess } from "@/lib/audit";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useTableStore } from "@/lib/table-store";
import { auditsStore, auditFindingsStore, saveAudit, newId, type AuditRow } from "@/lib/audits-store";
import { useAuth } from "@/lib/auth";
import { OfflineBanner } from "@/components/OfflineBanner";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/audits")({ component: AuditsPage });

function AuditsPage() {
  useAuditAccess("audits");
  const rows = useTableStore(auditsStore).filter((a) => !a.deleted_at);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ scope: "", type: "Interna", area: "", auditor_name: "", planned_at: new Date().toISOString().slice(0, 10) });

  const today = new Date().toISOString().slice(0, 10);
  const counts = {
    planejada: rows.filter((r) => r.status === "planejada").length,
    em_andamento: rows.filter((r) => r.status === "em_andamento").length,
    concluida: rows.filter((r) => r.status === "concluida").length,
    atrasada: rows.filter((r) => r.status !== "concluida" && r.status !== "cancelada" && r.planned_at && r.planned_at < today).length,
  };

  const create = async () => {
    if (!draft.scope.trim()) { toast.error("Informe o escopo da auditoria"); return; }
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
      notes: null,
    };
    await saveAudit(a);
    setOpen(false);
    navigate({ to: "/audits/$id", params: { id: a.id } });
  };

  return (
    <>
      <PageHeader
        title="Auditorias"
        description="Auditorias internas e externas com checklist e achados"
        actions={<Button onClick={() => setOpen(true)}><Plus className="size-4" /> Nova auditoria</Button>}
      />
      <OfflineBanner stores={[auditsStore, auditFindingsStore]} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-xs">
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="text-muted-foreground">Planejadas</div>
          <div className="text-2xl font-semibold">{counts.planejada}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="text-muted-foreground">Em andamento</div>
          <div className="text-2xl font-semibold">{counts.em_andamento}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="text-muted-foreground">Concluídas</div>
          <div className="text-2xl font-semibold">{counts.concluida}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <div className="text-muted-foreground">Atrasadas</div>
          <div className="text-2xl font-semibold text-destructive">{counts.atrasada}</div>
        </div>
      </div>

      <DataTable
        data={rows}
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
          { key: "performed_at", header: "Realizada", render: (r) => r.performed_at ?? "—" },
          { key: "findings_count", header: "Achados" },
          { key: "status", header: "Status", render: (r) => <StatusBadge>{r.status}</StatusBadge> },
        ]}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Plus className="size-4" /> Nova auditoria</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Escopo *</Label>
              <Input
                placeholder="Ex: Conformidade NBR ISO/IEC 17025 — Seção 4"
                value={draft.scope}
                onChange={(e) => setDraft((d) => ({ ...d, scope: e.target.value }))}
              />
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
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Auditor</Label>
                <Input placeholder={user?.name ?? "Nome do auditor"} value={draft.auditor_name} onChange={(e) => setDraft((d) => ({ ...d, auditor_name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Data planejada</Label>
                <Input type="date" value={draft.planned_at} onChange={(e) => setDraft((d) => ({ ...d, planned_at: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={create}>Criar auditoria</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
