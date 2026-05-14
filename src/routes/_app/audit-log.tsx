import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type AuditRow = {
  id: string;
  occurred_at: string;
  actor_name: string | null;
  actor_email: string | null;
  module: string;
  action: string;
  record_id: string | null;
  record_label: string | null;
};

export const Route = createFileRoute("/_app/audit-log")({ component: AuditLogPage });

const ACTION_LABEL: Record<string, string> = {
  created: "Criou",
  updated: "Editou",
  deleted: "Excluiu",
  login: "Login",
  logout: "Logout",
};

const ACTION_COLOR: Record<string, string> = {
  created: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  updated: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  deleted: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
  login: "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  logout: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "medium" });
}

function exportCsv(rows: AuditRow[]) {
  const header = ["Data e hora", "Usuário", "E-mail", "Módulo", "Ação", "Registro", "ID"];
  const lines = rows.map((r) => [
    formatDateTime(r.occurred_at),
    r.actor_name ?? "",
    r.actor_email ?? "",
    r.module,
    ACTION_LABEL[r.action] ?? r.action,
    r.record_label ?? "",
    r.record_id ?? "",
  ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
  const csv = [header.join(","), ...lines].join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function AuditLogPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await (supabase as any)
        .from("audit_logs")
        .select("id, occurred_at, actor_name, actor_email, module, action, record_id, record_label")
        .order("occurred_at", { ascending: false })
        .limit(1000);
      if (!active) return;
      if (error) {
        toast.error("Não foi possível carregar o log de auditoria.");
        console.error(error);
      } else {
        setRows((data ?? []) as AuditRow[]);
      }
      setLoading(false);
    })();

    const channel = supabase
      .channel("audit_logs_stream")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "audit_logs" }, (payload) => {
        setRows((prev) => [payload.new as AuditRow, ...prev].slice(0, 1000));
      })
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <>
      <PageHeader
        title="Log de Auditoria"
        description="Rastreabilidade de todas as ações realizadas no sistema (últimos 1.000 eventos)"
      />
      <DataTable
        data={rows}
        searchKeys={["actor_name", "actor_email", "module", "action", "record_label"]}
        newLabel="Exportar CSV"
        onNew={() => exportCsv(rows)}
        
        columns={[
          {
            key: "occurred_at",
            header: "Data e hora",
            render: (r) => <span className="font-mono text-xs">{formatDateTime(r.occurred_at)}</span>,
          },
          {
            key: "actor_name",
            header: "Usuário",
            render: (r) => (
              <div className="leading-tight">
                <div className="text-sm">{r.actor_name ?? "—"}</div>
                {r.actor_email && <div className="text-[11px] text-muted-foreground">{r.actor_email}</div>}
              </div>
            ),
          },
          { key: "module", header: "Módulo" },
          {
            key: "action",
            header: "Ação",
            render: (r) => (
              <Badge variant="secondary" className={ACTION_COLOR[r.action] ?? ""}>
                {ACTION_LABEL[r.action] ?? r.action}
              </Badge>
            ),
          },
          {
            key: "record_label",
            header: "Registro",
            render: (r) => <span className="text-xs">{r.record_label ?? "—"}</span>,
          },
          {
            key: "record_id",
            header: "ID",
            render: (r) => <span className="font-mono text-[10px] text-muted-foreground">{r.record_id?.slice(0, 8) ?? ""}</span>,
          },
        ]}
      />
    </>
  );
}
