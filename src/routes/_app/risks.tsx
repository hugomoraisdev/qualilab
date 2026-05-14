import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuditAccess } from "@/lib/audit";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import {
  risksStore,
  saveRisk,
  RISK_STATUS_OPTIONS,
  statusLabel,
  classifyScore,
  type RiskRow,
} from "@/lib/risks-store";
import { useTableStore } from "@/lib/table-store";
import { profilesStore, profileName } from "@/lib/profiles-store";
import { useAllRiskMeta } from "@/lib/risk-meta-store";
import { Grid3x3, ListIcon, FileText, AlertTriangle, ShieldCheck, Activity, Clock } from "lucide-react";
import { useMemo, useState } from "react";
import { DataTable } from "@/components/DataTable";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { exportRisksMatrixPdf } from "@/lib/pdf-export";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/risks")({ component: RisksPage });

const isOverdue = (deadline: string | null | undefined, status: string) => {
  if (!deadline) return false;
  if (["mitigado", "encerrado", "aceito", "transferido"].includes(status)) return false;
  return new Date(deadline + "T23:59:59").getTime() < Date.now();
};

function MatrixCell({ p, i, risks }: { p: number; i: number; risks: RiskRow[] }) {
  const items = risks.filter((r) => r.probability === p && r.impact === i);
  const score = p * i;
  let bg = "bg-success/20";
  if (score >= 15) bg = "bg-destructive/30";
  else if (score >= 10) bg = "bg-destructive/15";
  else if (score >= 6) bg = "bg-warning/25";
  return (
    <div className={`relative rounded-md border border-border ${bg} min-h-[64px] p-1.5 text-[10px]`}>
      <div className="absolute top-1 right-1.5 text-[10px] font-mono opacity-60">{score}</div>
      {items.map((r) => (
        <Link
          key={r.id}
          to="/risks/$id"
          params={{ id: r.id }}
          className="block bg-background/90 backdrop-blur rounded px-1 py-0.5 mb-0.5 truncate font-medium hover:bg-background"
          title={r.description}
        >
          {r.code ?? r.id.slice(0, 6)}
        </Link>
      ))}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, tone }: { icon: typeof Activity; label: string; value: number; tone: "success" | "warning" | "danger" | "info" }) {
  const ring = {
    success: "border-success/40 bg-success/5",
    warning: "border-warning/40 bg-warning/5",
    danger: "border-destructive/40 bg-destructive/5",
    info: "border-info/40 bg-info/5",
  }[tone];
  const text = {
    success: "text-success",
    warning: "text-warning-foreground",
    danger: "text-destructive",
    info: "text-info",
  }[tone];
  return (
    <div className={`rounded-lg border p-3 ${ring}`}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="size-3.5" /> {label}</div>
      <div className={`text-2xl font-bold mt-1 ${text}`}>{value}</div>
    </div>
  );
}

function RiskFormDialog({ trigger, initial, onSaved }: { trigger: React.ReactNode; initial?: Partial<RiskRow>; onSaved?: () => void }) {
  const [open, setOpen] = useState(false);
  const profiles = useTableStore(profilesStore);
  const [form, setForm] = useState<Partial<RiskRow>>(initial ?? {
    process: "",
    description: "",
    cause: "",
    consequence: "",
    probability: 3,
    impact: 3,
    status: "identificado",
    code: null,
    treatment: null,
    responsible_id: null,
  });

  const score = (form.probability ?? 0) * (form.impact ?? 0);
  const cls = classifyScore(score);

  const submit = async () => {
    if (!form.process || !form.description) {
      toast.error("Processo e descrição são obrigatórios");
      return;
    }
    try {
      await saveRisk({
        id: initial?.id ?? crypto.randomUUID(),
        code: form.code ?? null,
        process: form.process!,
        description: form.description!,
        cause: form.cause ?? null,
        consequence: form.consequence ?? null,
        probability: Number(form.probability ?? 1),
        impact: Number(form.impact ?? 1),
        responsible_id: form.responsible_id ?? null,
        status: form.status ?? "identificado",
        treatment: form.treatment ?? null,
      });
      toast.success(initial?.id ? "Risco atualizado" : "Risco cadastrado");
      setOpen(false);
      onSaved?.();
    } catch (e) {
      toast.error("Falha ao salvar", { description: String((e as Error).message) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initial?.id ? "Editar risco" : "Novo risco"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2 grid sm:grid-cols-3 gap-3">
            <div>
              <Label>Código</Label>
              <Input value={form.code ?? ""} onChange={(e) => setForm({ ...form, code: e.target.value || null })} placeholder="R-001" />
            </div>
            <div className="sm:col-span-2">
              <Label>Processo *</Label>
              <Input value={form.process ?? ""} onChange={(e) => setForm({ ...form, process: e.target.value })} placeholder="Recebimento, Calibração, ..." />
            </div>
          </div>
          <div className="sm:col-span-2">
            <Label>Descrição do risco *</Label>
            <Textarea rows={2} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <Label>Causa</Label>
            <Textarea rows={2} value={form.cause ?? ""} onChange={(e) => setForm({ ...form, cause: e.target.value })} />
          </div>
          <div>
            <Label>Consequência</Label>
            <Textarea rows={2} value={form.consequence ?? ""} onChange={(e) => setForm({ ...form, consequence: e.target.value })} />
          </div>
          <div>
            <Label>Probabilidade (1–5)</Label>
            <Select value={String(form.probability ?? 3)} onValueChange={(v) => setForm({ ...form, probability: Number(v) })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Impacto (1–5)</Label>
            <Select value={String(form.impact ?? 3)} onValueChange={(v) => setForm({ ...form, impact: Number(v) })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Responsável</Label>
            <Select value={form.responsible_id ?? "none"} onValueChange={(v) => setForm({ ...form, responsible_id: v === "none" ? null : v })}>
              <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Sem responsável —</SelectItem>
                {profiles.map((p) => <SelectItem key={p.id} value={p.id}>{p.name || p.email}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status ?? "identificado"} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{RISK_STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>Tratamento (estratégia)</Label>
            <Textarea rows={2} value={form.treatment ?? ""} onChange={(e) => setForm({ ...form, treatment: e.target.value })} placeholder="Mitigar, evitar, transferir, aceitar..." />
          </div>
          <div className="sm:col-span-2 flex items-center gap-3 rounded-md border border-border bg-muted/40 p-3">
            <div className="text-xs text-muted-foreground">Nível calculado</div>
            <div className="font-mono text-lg">{score}</div>
            <StatusBadge tone={cls.tone === "danger" ? "destructive" : cls.tone}>{cls.label}</StatusBadge>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit}>{initial?.id ? "Salvar" : "Cadastrar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RisksPage() {
  useAuditAccess("risks");
  const risks = useTableStore(risksStore);
  const navigate = useNavigate();
  const ids = useMemo(() => risks.map((r) => r.id), [risks]);
  const metaMap = useAllRiskMeta(ids);
  const [view, setView] = useState<"matrix" | "list">("matrix");

  const kpis = useMemo(() => {
    const ativos = risks.filter((r) => !["mitigado", "encerrado"].includes(r.status)).length;
    const criticos = risks.filter((r) => (r.probability * r.impact) >= 15 && r.status !== "encerrado").length;
    const emTrat = risks.filter((r) => r.status === "em_tratamento").length;
    const vencidos = risks.filter((r) => isOverdue(metaMap[r.id]?.treatment_deadline ?? null, r.status)).length;
    return { ativos, criticos, emTrat, vencidos };
  }, [risks, metaMap]);

  const exportMatrix = () => {
    exportRisksMatrixPdf(
      risks.map((r) => ({
        code: r.code ?? r.id.slice(0, 8),
        process: r.process,
        description: r.description,
        probability: r.probability,
        impact: r.impact,
        level: r.probability * r.impact,
        classification: r.classification ?? classifyScore(r.probability * r.impact).label,
        responsible: profileName(r.responsible_id),
        status: statusLabel(r.status),
        deadline: metaMap[r.id]?.treatment_deadline ?? null,
      })),
    );
    toast.success("Matriz de riscos exportada");
  };

  return (
    <>
      <PageHeader
        title="Riscos"
        description="Matriz 5×5, tratamento e plano de contingência"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex bg-muted rounded-md p-0.5">
              <button onClick={() => setView("matrix")} className={`px-2.5 py-1 rounded text-xs flex items-center gap-1 ${view === "matrix" ? "bg-card shadow-sm" : ""}`}><Grid3x3 className="size-3.5" /> Matriz</button>
              <button onClick={() => setView("list")} className={`px-2.5 py-1 rounded text-xs flex items-center gap-1 ${view === "list" ? "bg-card shadow-sm" : ""}`}><ListIcon className="size-3.5" /> Lista</button>
            </div>
            <Button size="sm" variant="outline" onClick={exportMatrix}><FileText className="size-4" /> PDF</Button>
            <RiskFormDialog trigger={<Button size="sm">Novo risco</Button>} />
          </div>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <KpiCard icon={Activity} label="Ativos" value={kpis.ativos} tone="info" />
        <KpiCard icon={ShieldCheck} label="Em tratamento" value={kpis.emTrat} tone="warning" />
        <KpiCard icon={AlertTriangle} label="Críticos" value={kpis.criticos} tone="danger" />
        <KpiCard icon={Clock} label="Tratamento vencido" value={kpis.vencidos} tone="danger" />
      </div>

      {view === "matrix" ? (
        <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
          <div className="text-xs text-muted-foreground mb-3">Probabilidade (linhas) × Impacto (colunas) · Clique em um risco para detalhes</div>
          <div className="overflow-x-auto">
            <div className="grid grid-cols-[auto_repeat(5,minmax(110px,1fr))] gap-1.5 min-w-[700px]">
              <div></div>
              {[1, 2, 3, 4, 5].map((i) => <div key={i} className="text-xs text-center text-muted-foreground font-medium">Impacto {i}</div>)}
              {[5, 4, 3, 2, 1].flatMap((p) => [
                <div key={`l-${p}`} className="text-xs text-muted-foreground font-medium flex items-center pr-2 justify-end">Prob. {p}</div>,
                ...[1, 2, 3, 4, 5].map((i) => <MatrixCell key={`${p}-${i}`} p={p} i={i} risks={risks} />),
              ])}
            </div>
          </div>
          <div className="flex flex-wrap gap-3 mt-4 text-xs">
            <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-success/30" /> Baixo (1–5)</span>
            <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-warning/30" /> Médio (6–9)</span>
            <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-destructive/20" /> Alto (10–14)</span>
            <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-destructive/40" /> Crítico (15+)</span>
          </div>
        </div>
      ) : (
        <DataTable
          data={risks}
          searchKeys={["id", "code", "process", "description", "responsible_id", "classification", "status"]}
          newLabel="Novo risco"
          hideNew
          onRowClick={(r) => navigate({ to: "/risks/$id", params: { id: r.id } })}
          columns={[
            { key: "code", header: "Código", render: (r) => <span className="font-mono text-xs">{r.code ?? r.id.slice(0, 6)}</span> },
            { key: "process", header: "Processo" },
            { key: "description", header: "Descrição", render: (r) => <span className="max-w-xs truncate inline-block">{r.description}</span> },
            { key: "probability", header: "P" },
            { key: "impact", header: "I" },
            { key: "level", header: "Nível", render: (r) => <span className="font-mono">{r.probability * r.impact}</span> },
            { key: "classification", header: "Classificação", render: (r) => <StatusBadge>{r.classification ?? classifyScore(r.probability * r.impact).label}</StatusBadge> },
            { key: "responsible_id", header: "Responsável", render: (r) => <span>{profileName(r.responsible_id)}</span> },
            { key: "status", header: "Status", render: (r) => <StatusBadge>{statusLabel(r.status)}</StatusBadge> },
            { key: "deadline", header: "Prazo", render: (r) => {
              const d = metaMap[r.id]?.treatment_deadline;
              if (!d) return <span className="text-muted-foreground">—</span>;
              return <span className={isOverdue(d, r.status) ? "text-destructive font-medium" : ""}>{d}</span>;
            }},
          ]}
        />
      )}
    </>
  );
}
