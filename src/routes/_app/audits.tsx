import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useTableStore } from "@/lib/table-store";
import { auditsStore, auditFindingsStore, saveAudit, newId, type AuditRow } from "@/lib/audits-store";
import { useAuth } from "@/lib/auth";
import { OfflineBanner } from "@/components/OfflineBanner";

export const Route = createFileRoute("/_app/audits")({ component: AuditsPage });

function AuditsPage() {
  const rows = useTableStore(auditsStore).filter((a) => !a.deleted_at);
  const navigate = useNavigate();
  const { user } = useAuth();

  const today = new Date().toISOString().slice(0, 10);
  const counts = {
    planejada: rows.filter((r) => r.status === "planejada").length,
    em_andamento: rows.filter((r) => r.status === "em_andamento").length,
    concluida: rows.filter((r) => r.status === "concluida").length,
    atrasada: rows.filter((r) => r.status !== "concluida" && r.status !== "cancelada" && r.planned_at && r.planned_at < today).length,
  };

  const create = async () => {
    const id = newId("AUD");
    const a: AuditRow = {
      id,
      code: id,
      type: "Interna",
      scope: "Nova auditoria",
      area: null,
      auditor_id: user?.id ?? null,
      auditor_name: user?.name ?? null,
      planned_at: new Date().toISOString().slice(0, 10),
      performed_at: null,
      status: "planejada",
      findings_count: 0,
      notes: null,
    };
    await saveAudit(a);
    navigate({ to: "/audits/$id", params: { id: a.id } });
  };

  return (
    <>
      <PageHeader
        title="Auditorias"
        description="Auditorias internas e externas com checklist e achados"
        actions={<Button onClick={create}><Plus className="size-4" /> Nova auditoria</Button>}
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
    </>
  );
}
