import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAuditAccess } from "@/lib/audit";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import {
  occurrencesStore,
  type OccurrenceRow,
  TYPE_OPTIONS,
  ORIGIN_OPTIONS,
  SEVERITY_OPTIONS,
  STATUS_OPTIONS,
  typeLabel,
  originLabel,
  statusLabel,
} from "@/lib/occurrences-store";
import { useTableStore } from "@/lib/table-store";
import { useAllOccurrenceMeta, updateOccurrenceMeta } from "@/lib/occurrence-meta-store";
import { profilesStore, profileName } from "@/lib/profiles-store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { exportTablePdf } from "@/lib/pdf-export";
import { AlertTriangle, CheckCircle2, Clock, FileText, TrendingUp } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/occurrences")({ component: OccPage });

function newId() {
  return `OC-${Date.now().toString(36).toUpperCase()}`;
}

function isOverdue(deadline: string | null, status: string) {
  if (!deadline || status === "concluida" || status === "cancelada") return false;
  return new Date(deadline + "T23:59:59").getTime() < Date.now();
}

function OccPage() {
  useAuditAccess("occurrences");
  const occurrences = useTableStore(occurrencesStore);
  useTableStore(profilesStore);
  const navigate = useNavigate();
  const ids = useMemo(() => occurrences.map((o) => o.id), [occurrences]);
  const metaMap = useAllOccurrenceMeta(ids);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<OccurrenceRow>>({
    type: "nao_conformidade",
    origin: "interno",
    severity: "media",
    status: "aberta",
    occurred_at: new Date().toISOString().slice(0, 10),
  });
  const [draftDeadline, setDraftDeadline] = useState<string>("");

  const kpis = useMemo(() => {
    let abertas = 0, analise = 0, concluidas = 0, atrasadas = 0;
    occurrences.forEach((o) => {
      if (o.status === "concluida") concluidas++;
      else if (o.status === "em_analise" || o.status === "em_tratamento") analise++;
      else if (o.status === "aberta") abertas++;
      const m = metaMap[o.id];
      if (m && isOverdue(m.deadline, o.status)) atrasadas++;
    });
    return { abertas, analise, concluidas, atrasadas, total: occurrences.length };
  }, [occurrences, metaMap]);

  // Tendência últimos 6 meses
  const trend = useMemo(() => {
    const months: { label: string; key: string; count: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        label: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        count: 0,
      });
    }
    occurrences.forEach((o) => {
      if (!o.occurred_at) return;
      const k = o.occurred_at.slice(0, 7);
      const m = months.find((x) => x.key === k);
      if (m) m.count++;
    });
    const max = Math.max(1, ...months.map((m) => m.count));
    return { months, max };
  }, [occurrences]);

  const handleCreate = async () => {
    if (!draft.description?.trim()) {
      toast.error("Informe a descrição");
      return;
    }
    const row: OccurrenceRow = {
      id: newId(),
      code: null,
      type: draft.type ?? "nao_conformidade",
      origin: draft.origin ?? "interno",
      description: draft.description!,
      occurred_at: draft.occurred_at ?? new Date().toISOString().slice(0, 10),
      responsible_id: draft.responsible_id ?? null,
      severity: draft.severity ?? "media",
      status: "aberta",
      immediate_action: draft.immediate_action ?? null,
      root_cause: null,
      linked_audit_id: null,
      linked_document_id: null,
    };
    await occurrencesStore.upsert(row);
    if (draftDeadline) {
      await updateOccurrenceMeta(
        row.id,
        (prev) => ({ ...prev, deadline: draftDeadline }),
        { action: "Ocorrência criada", detail: row.description.slice(0, 80) },
      );
    } else {
      await updateOccurrenceMeta(
        row.id,
        (prev) => prev,
        { action: "Ocorrência criada", detail: row.description.slice(0, 80) },
      );
    }
    setOpen(false);
    setDraft({
      type: "nao_conformidade",
      origin: "interno",
      severity: "media",
      status: "aberta",
      occurred_at: new Date().toISOString().slice(0, 10),
    });
    setDraftDeadline("");
    toast.success("Ocorrência registrada");
    navigate({ to: "/occurrences/$id", params: { id: row.id } });
  };

  const exportPdf = () => {
    exportTablePdf({
      title: "Relatório de Ocorrências",
      subtitle: `${occurrences.length} registros`,
      columns: ["Código", "Tipo", "Origem", "Data", "Responsável", "Prazo", "Severidade", "Status"],
      rows: occurrences.map((o) => {
        const m = metaMap[o.id];
        return [
          o.code ?? o.id,
          typeLabel(o.type),
          originLabel(o.origin),
          o.occurred_at,
          profileName(o.responsible_id),
          m?.deadline ?? "—",
          o.severity,
          statusLabel(o.status),
        ];
      }),
      filename: "ocorrencias",
    });
  };

  return (
    <>
      <PageHeader
        title="Ocorrências e Não Conformidades"
        description="Tratamento de NCs, reclamações, desvios e oportunidades de melhoria"
        actions={
          <Button variant="outline" size="sm" onClick={exportPdf}>
            <FileText className="size-4 mr-1" /> Exportar PDF
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <Kpi label="Total" value={kpis.total} icon={<FileText className="size-4" />} />
        <Kpi label="Abertas" value={kpis.abertas} tone="warning" icon={<Clock className="size-4" />} />
        <Kpi label="Em análise/tratamento" value={kpis.analise} tone="info" icon={<TrendingUp className="size-4" />} />
        <Kpi label="Atrasadas" value={kpis.atrasadas} tone="danger" icon={<AlertTriangle className="size-4" />} />
        <Kpi label="Concluídas" value={kpis.concluidas} tone="success" icon={<CheckCircle2 className="size-4" />} />
      </div>

      <section className="bg-card border border-border rounded-lg p-4 shadow-sm mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Tendência (últimos 6 meses)</h3>
          <span className="text-xs text-muted-foreground">Total por mês</span>
        </div>
        <div className="flex items-end gap-2 h-24">
          {trend.months.map((m) => (
            <div key={m.key} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full bg-primary/80 rounded-t-sm transition-all"
                style={{ height: `${(m.count / trend.max) * 100}%`, minHeight: m.count > 0 ? 4 : 0 }}
                title={`${m.count} ocorrência(s)`}
              />
              <span className="text-[10px] text-muted-foreground capitalize">{m.label}</span>
              <span className="text-[10px] font-mono">{m.count}</span>
            </div>
          ))}
        </div>
      </section>

      <DataTable
        data={occurrences}
        searchKeys={["id", "code", "type", "origin", "description", "status"]}
        newLabel="Nova ocorrência"
        exportName="ocorrencias"
        onNew={() => setOpen(true)}
        onRowClick={(r) => navigate({ to: "/occurrences/$id", params: { id: r.id } })}
        columns={[
          { key: "code", header: "Código", render: (r) => <span className="font-mono text-xs">{r.code ?? r.id}</span> },
          { key: "type", header: "Tipo", render: (r) => typeLabel(r.type) },
          { key: "origin", header: "Origem", render: (r) => originLabel(r.origin) },
          { key: "description", header: "Descrição", render: (r) => <span className="max-w-md truncate inline-block">{r.description}</span> },
          { key: "occurred_at", header: "Identificada em" },
          { key: "responsible_id", header: "Responsável", render: (r) => profileName(r.responsible_id) },
          {
            key: "deadline",
            header: "Prazo",
            render: (r) => {
              const d = metaMap[r.id]?.deadline;
              if (!d) return "—";
              const overdue = isOverdue(d, r.status);
              return (
                <span className={overdue ? "text-destructive font-medium" : ""}>
                  {d}{overdue && " ⚠"}
                </span>
              );
            },
          },
          { key: "severity", header: "Severidade", render: (r) => <StatusBadge>{r.severity}</StatusBadge> },
          { key: "status", header: "Status", render: (r) => <StatusBadge>{statusLabel(r.status)}</StatusBadge> },
        ]}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nova ocorrência / não conformidade</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label>Descrição *</Label>
              <Textarea
                rows={3}
                value={draft.description ?? ""}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder="O que aconteceu?"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={draft.type} onValueChange={(v) => setDraft({ ...draft, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((o) => <SelectItem key={o} value={o}>{typeLabel(o)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Origem</Label>
              <Select value={draft.origin} onValueChange={(v) => setDraft({ ...draft, origin: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ORIGIN_OPTIONS.map((o) => <SelectItem key={o} value={o}>{originLabel(o)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Severidade</Label>
              <Select value={draft.severity} onValueChange={(v) => setDraft({ ...draft, severity: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SEVERITY_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Identificada em</Label>
              <Input
                type="date"
                value={draft.occurred_at ?? ""}
                onChange={(e) => setDraft({ ...draft, occurred_at: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Responsável</Label>
              <Select
                value={draft.responsible_id ?? ""}
                onValueChange={(v) => setDraft({ ...draft, responsible_id: v || null })}
              >
                <SelectTrigger><SelectValue placeholder="Selecionar…" /></SelectTrigger>
                <SelectContent>
                  {profilesStore.list().map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Prazo de tratamento</Label>
              <Input
                type="date"
                value={draftDeadline}
                onChange={(e) => setDraftDeadline(e.target.value)}
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Ação imediata (opcional)</Label>
              <Textarea
                rows={2}
                value={draft.immediate_action ?? ""}
                onChange={(e) => setDraft({ ...draft, immediate_action: e.target.value })}
                placeholder="Contenção / ação realizada no momento"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate}>Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Kpi({ label, value, tone, icon }: { label: string; value: number; tone?: "info" | "success" | "warning" | "danger"; icon?: React.ReactNode }) {
  const toneClass = {
    info: "text-blue-600",
    success: "text-emerald-600",
    warning: "text-amber-600",
    danger: "text-destructive",
  }[tone ?? "info"];
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-sm">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className={tone ? toneClass : ""}>{icon}</span>
      </div>
      <div className={`text-2xl font-bold ${tone ? toneClass : ""}`}>{value}</div>
    </div>
  );
}
