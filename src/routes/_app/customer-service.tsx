import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { listTickets, type CustomerTicket } from "@/lib/sac-store";
import { Plus, Headset, MessageSquare, AlertTriangle, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_app/customer-service")({ component: SacPage });

function SacPage() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<CustomerTicket[]>([]);

  useEffect(() => { setTickets(listTickets()); }, []);

  const stats = useMemo(() => ({
    total: tickets.length,
    open: tickets.filter((t) => t.status !== "encerrado").length,
    high: tickets.filter((t) => t.priority === "alta" || t.priority === "critica").length,
    closed: tickets.filter((t) => t.status === "encerrado").length,
  }), [tickets]);

  const STATUS_LABEL: Record<string, string> = {
    aberto: "Aberto", em_andamento: "Em andamento", aguardando_cliente: "Aguardando cliente", encerrado: "Encerrado",
  };
  const TYPE_LABEL: Record<string, string> = {
    reclamacao: "Reclamação", sugestao: "Sugestão", elogio: "Elogio", duvida: "Dúvida",
  };

  return (
    <>
      <PageHeader
        title="SAC — Atendimento ao Cliente"
        description="Registre, acompanhe e gerencie atendimentos do cliente"
        actions={<Button onClick={() => navigate({ to: "/customer-service/new" })}><Plus className="size-4" /> Novo atendimento</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Card icon={Headset} label="Total" value={stats.total} />
        <Card icon={MessageSquare} label="Em aberto" value={stats.open} tone="warning" />
        <Card icon={AlertTriangle} label="Alta / Crítica" value={stats.high} tone="destructive" />
        <Card icon={CheckCircle2} label="Encerrados" value={stats.closed} tone="success" />
      </div>

      <DataTable
        data={tickets}
        searchKeys={["protocol", "customerName", "type", "status", "assignedTo"]}
        hideNew
        exportName="sac"
        onRowClick={(r) => navigate({ to: "/customer-service/$id", params: { id: r.id } })}
        columns={[
          { key: "protocol", header: "Protocolo", render: (r) => <span className="font-mono text-xs">{r.protocol}</span> },
          { key: "customerName", header: "Cliente", render: (r) => <span className="font-medium">{r.customerName}</span> },
          { key: "type", header: "Tipo", render: (r) => TYPE_LABEL[r.type] },
          { key: "priority", header: "Prioridade", render: (r) => <StatusBadge>{r.priority}</StatusBadge> },
          { key: "status", header: "Status", render: (r) => <StatusBadge>{STATUS_LABEL[r.status]}</StatusBadge> },
          { key: "origin", header: "Origem", render: (r) => <span className="text-xs">{r.origin === "portal" ? "Portal /sac" : "Interno"}</span> },
          { key: "assignedTo", header: "Responsável" },
          { key: "createdAt", header: "Aberto em" },
        ]}
      />

      <div className="mt-4 text-xs text-muted-foreground">
        Portal público de reclamações disponível em <a href="/sac" target="_blank" className="text-primary underline">/sac</a> (sem login).
      </div>
    </>
  );
}

function Card({ icon: Icon, label, value, tone = "info" }: { icon: any; label: string; value: number; tone?: "info" | "warning" | "destructive" | "success" }) {
  const colors: Record<string, string> = {
    info: "bg-info/10 text-info",
    warning: "bg-warning/10 text-warning-foreground",
    destructive: "bg-destructive/10 text-destructive",
    success: "bg-success/10 text-success",
  };
  return (
    <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`size-9 rounded-lg grid place-items-center ${colors[tone]}`}><Icon className="size-4" /></div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-xl font-semibold">{value}</div>
        </div>
      </div>
    </div>
  );
}
