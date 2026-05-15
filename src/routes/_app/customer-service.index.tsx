import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAuditAccess } from "@/lib/audit";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { useTableStore } from "@/lib/table-store";
import { ticketsStore } from "@/lib/sac-store";
import {
  Plus,
  Headset,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Star,
  Clock,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  ReferenceLine,
} from "recharts";

export const Route = createFileRoute("/_app/customer-service/")({ component: SacPage });

const STATUS_LABEL: Record<string, string> = {
  aberto: "Aberto",
  em_andamento: "Em andamento",
  aguardando_cliente: "Aguardando cliente",
  encerrado: "Encerrado",
};
const TYPE_LABEL: Record<string, string> = {
  reclamacao: "Reclamação",
  sugestao: "Sugestão",
  elogio: "Elogio",
  duvida: "Dúvida",
};

const PIE_COLORS = [
  "var(--info)",
  "var(--success)",
  "var(--warning)",
  "var(--destructive)",
  "var(--primary)",
];
const TOOLTIP_STYLE = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
};

type Period = "30d" | "90d" | "180d" | "ano";
const SLA_HOURS: Record<string, number> = { critica: 4, alta: 24, media: 72, baixa: 168 };

function cutoffDate(period: Period): Date {
  const d = new Date();
  if (period === "30d") d.setDate(d.getDate() - 30);
  else if (period === "90d") d.setDate(d.getDate() - 90);
  else if (period === "180d") d.setDate(d.getDate() - 180);
  else d.setFullYear(d.getFullYear() - 1);
  return d;
}

function SacPage() {
  useAuditAccess("customer_service");
  const navigate = useNavigate();
  const tickets = useTableStore(ticketsStore).filter((t) => !t.deleted_at);
  const [period, setPeriod] = useState<Period>("90d");

  const filtered = useMemo(() => {
    const cutoff = cutoffDate(period);
    return tickets.filter((t) => !t.created_at || new Date(t.created_at) >= cutoff);
  }, [tickets, period]);

  const stats = useMemo(() => {
    const now = Date.now();
    const overdue = tickets.filter((t) => {
      if (t.status === "encerrado") return false;
      if (!t.created_at) return false;
      const age = (now - new Date(t.created_at).getTime()) / 3600000;
      return age > (SLA_HOURS[t.priority] ?? 72);
    }).length;
    return {
      total: tickets.length,
      open: tickets.filter((t) => t.status !== "encerrado").length,
      overdue,
      high: tickets.filter((t) => t.priority === "alta" || t.priority === "critica").length,
      closed: tickets.filter((t) => t.status === "encerrado").length,
    };
  }, [tickets]);

  const ticketsByMonth = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of filtered) {
      if (!t.created_at) continue;
      const m = t.created_at.slice(0, 7);
      map[m] = (map[m] ?? 0) + 1;
    }
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, value]) => ({ month: month.slice(5) + "/" + month.slice(2, 4), value }));
  }, [filtered]);

  const ticketsByType = useMemo(
    () =>
      Object.entries(TYPE_LABEL)
        .map(([key, name]) => ({
          name,
          value: filtered.filter((t) => t.type === key).length,
        }))
        .filter((x) => x.value > 0),
    [filtered],
  );

  const ticketsByOrigin = useMemo(
    () =>
      [
        { name: "Portal /sac", value: filtered.filter((t) => t.origin === "portal").length },
        { name: "Interno", value: filtered.filter((t) => t.origin === "interno").length },
      ].filter((x) => x.value > 0),
    [filtered],
  );

  const satisfaction = useMemo(() => {
    const scored = filtered.filter((t) => t.satisfaction_score != null);
    if (scored.length === 0) return { avg: null, data: [] };
    const avg = scored.reduce((s, t) => s + (t.satisfaction_score ?? 0), 0) / scored.length;
    const map: Record<string, { sum: number; count: number }> = {};
    for (const t of scored) {
      if (!t.created_at) continue;
      const m = t.created_at.slice(0, 7);
      if (!map[m]) map[m] = { sum: 0, count: 0 };
      map[m].sum += t.satisfaction_score ?? 0;
      map[m].count += 1;
    }
    const data = Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, { sum, count }]) => ({
        month: month.slice(5) + "/" + month.slice(2, 4),
        avg: Math.round((sum / count) * 10) / 10,
      }));
    return { avg: Math.round(avg * 10) / 10, data };
  }, [filtered]);

  return (
    <>
      <PageHeader
        title="SAC — Atendimento ao Cliente"
        description="Registre, acompanhe e gerencie atendimentos do cliente"
        actions={
          <Button onClick={() => navigate({ to: "/customer-service/new" })}>
            <Plus className="size-4" /> Novo atendimento
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <Card icon={Headset} label="Total" value={stats.total} />
        <Card icon={MessageSquare} label="Em aberto" value={stats.open} tone="warning" />
        <Card
          icon={Clock}
          label="Atrasados"
          value={stats.overdue}
          tone={stats.overdue > 0 ? "destructive" : "info"}
        />
        <Card icon={AlertTriangle} label="Alta / Crítica" value={stats.high} tone="destructive" />
        <Card icon={CheckCircle2} label="Encerrados" value={stats.closed} tone="success" />
      </div>

      {/* Analytics panel */}
      <div className="bg-card border border-border rounded-lg p-4 shadow-sm mb-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Análise de atendimentos</h3>
          <div className="flex gap-1">
            {(["30d", "90d", "180d", "ano"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                  period === p
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                {p === "ano" ? "1 ano" : p}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1">
            <p className="text-xs text-muted-foreground mb-2">Tickets por mês</p>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ticketsByMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="value" name="Tickets" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-2">Por tipo</p>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ticketsByType}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={65}
                    label={({ percent }) => `${Math.round(percent * 100)}%`}
                  >
                    {ticketsByType.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-2">Por origem</p>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ticketsByOrigin}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={65}
                    label={({ percent }) => `${Math.round(percent * 100)}%`}
                  >
                    {ticketsByOrigin.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Satisfaction panel */}
      <div className="bg-card border border-border rounded-lg p-4 shadow-sm mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Star className="size-4 text-warning-foreground" />
          <h3 className="text-sm font-semibold">Satisfação dos clientes</h3>
          {satisfaction.avg !== null && (
            <span
              className={`ml-auto text-xl font-bold ${satisfaction.avg >= 4 ? "text-success" : satisfaction.avg >= 3 ? "text-warning-foreground" : "text-destructive"}`}
            >
              {satisfaction.avg.toFixed(1)} / 5
            </span>
          )}
        </div>
        {satisfaction.data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Nenhuma avaliação de satisfação no período.
          </p>
        ) : (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={satisfaction.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis
                  domain={[0, 5]}
                  ticks={[0, 1, 2, 3, 4, 5]}
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <ReferenceLine
                  y={4}
                  stroke="var(--success)"
                  strokeDasharray="4 4"
                  label={{
                    value: "Meta 4.0",
                    position: "right",
                    fontSize: 10,
                    fill: "var(--success)",
                  }}
                />
                <Bar dataKey="avg" name="Nota média" fill="var(--info)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <DataTable
        data={tickets}
        searchKeys={["protocol", "customer_name", "type", "status", "assigned_to_name"]}
        hideNew
        exportName="sac"
        onRowClick={(r) => navigate({ to: "/customer-service/$id", params: { id: r.id } })}
        columns={[
          {
            key: "protocol",
            header: "Protocolo",
            render: (r) => <span className="font-mono text-xs">{r.protocol}</span>,
          },
          {
            key: "customer_name",
            header: "Cliente",
            render: (r) => <span className="font-medium">{r.customer_name}</span>,
          },
          { key: "type", header: "Tipo", render: (r) => TYPE_LABEL[r.type] ?? r.type },
          {
            key: "priority",
            header: "Prioridade",
            render: (r) => <StatusBadge>{r.priority}</StatusBadge>,
          },
          {
            key: "status",
            header: "Status",
            render: (r) => <StatusBadge>{STATUS_LABEL[r.status] ?? r.status}</StatusBadge>,
          },
          {
            key: "origin",
            header: "Origem",
            render: (r) => (
              <span className="text-xs">{r.origin === "portal" ? "Portal /sac" : "Interno"}</span>
            ),
          },
          {
            key: "satisfaction_score",
            header: "Satisfação",
            render: (r) =>
              r.satisfaction_score != null ? (
                <span
                  className={`text-xs font-medium ${r.satisfaction_score >= 4 ? "text-success" : r.satisfaction_score >= 3 ? "text-warning-foreground" : "text-destructive"}`}
                >
                  {r.satisfaction_score}/5
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              ),
          },
          {
            key: "assigned_to_name",
            header: "Responsável",
            render: (r) => r.assigned_to_name ?? "—",
          },
          {
            key: "created_at",
            header: "Aberto em",
            render: (r) => (r.created_at ? new Date(r.created_at).toLocaleString("pt-BR") : "—"),
          },
        ]}
      />

      <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        Portal público de reclamações disponível em{" "}
        <a href="/sac" target="_blank" className="text-primary underline">
          /sac
        </a>{" "}
        (sem login).
        <button
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-border rounded px-2 py-0.5"
          onClick={() => {
            void navigator.clipboard.writeText(window.location.origin + "/sac");
            toast.success("Link copiado!");
          }}
        >
          <Copy className="size-3" /> Copiar link
        </button>
      </div>
    </>
  );
}

function Card({
  icon: Icon,
  label,
  value,
  tone = "info",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone?: "info" | "warning" | "destructive" | "success";
}) {
  const colors: Record<string, string> = {
    info: "bg-info/10 text-info",
    warning: "bg-warning/10 text-warning-foreground",
    destructive: "bg-destructive/10 text-destructive",
    success: "bg-success/10 text-success",
  };
  return (
    <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`size-9 rounded-lg grid place-items-center ${colors[tone]}`}>
          <Icon className="size-4" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-xl font-semibold">{value}</div>
        </div>
      </div>
    </div>
  );
}
