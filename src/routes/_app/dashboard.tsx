import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import {
  FileText, Wrench, Gauge, Truck, AlertTriangle, ShieldAlert,
  ListChecks, ClipboardCheck, GraduationCap, TrendingUp, ArrowRight,
} from "lucide-react";
import {
  documents, equipments, calibrations, suppliers, occurrences, risks,
  actionPlans, audits, competencies, occurrencesByMonth,
} from "@/lib/mock-data";
import { suppliersStore, getEvaluationStatus } from "@/lib/suppliers-store";
import { useTableStore } from "@/lib/table-store";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
});

function KpiCard({ label, value, hint, tone, icon: Icon, to }: {
  label: string; value: number | string; hint?: string;
  tone?: "default" | "success" | "warning" | "destructive" | "info";
  icon: React.ComponentType<{ className?: string }>;
  to: string;
}) {
  const toneRing: Record<string, string> = {
    default: "bg-primary/10 text-primary",
    success: "bg-success/15 text-success",
    warning: "bg-warning/20 text-warning-foreground",
    destructive: "bg-destructive/15 text-destructive",
    info: "bg-info/15 text-info",
  };
  return (
    <Link to={to} className="group bg-card border border-border rounded-lg p-4 shadow-sm hover:shadow-md hover:border-primary/30 transition-all">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-2xl font-semibold mt-1 text-foreground">{value}</div>
          {hint && <div className="text-[11px] text-muted-foreground mt-1">{hint}</div>}
        </div>
        <div className={`size-10 rounded-lg grid place-items-center ${toneRing[tone ?? "default"]}`}>
          <Icon className="size-5" />
        </div>
      </div>
      <div className="mt-3 flex items-center text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
        Abrir <ArrowRight className="size-3 ml-1" />
      </div>
    </Link>
  );
}

function Dashboard() {
  const docExpired = documents.filter(d => d.status === "Vencido" || d.status === "Em revisão").length;
  const docActive = documents.filter(d => d.status === "Aprovado").length;
  const calExpired = calibrations.filter(c => c.status === "Vencida" || c.status === "Reprovada").length;
  const calNear = calibrations.filter(c => c.status === "Próxima do vencimento").length;
  const supActive = suppliers.filter(s => s.status === "Ativo").length;
  const supPending = suppliers.filter(s => s.status === "Em avaliação" || s.status === "Suspenso").length;
  const occOpen = occurrences.filter(o => o.status !== "Concluída" && o.status !== "Cancelada").length;
  const ncCritical = occurrences.filter(o => o.severity === "Alta").length;
  const risksHigh = risks.filter(r => r.classification === "Alto" || r.classification === "Crítico").length;
  const apPending = actionPlans.filter(a => a.status !== "Concluído" && a.status !== "Cancelado").length;
  const audOngoing = audits.filter(a => a.status === "Em andamento" || a.status === "Planejada").length;
  const compExpired = competencies.filter(c => c.status === "Vencido" || c.status === "Pendente").length;

  const planStatus = ["Pendente", "Em andamento", "Aguardando validação", "Concluído", "Atrasado"].map(s => ({
    name: s, value: actionPlans.filter(a => a.status === s).length,
  }));
  const riskBySeverity = ["Baixo", "Médio", "Alto", "Crítico"].map(s => ({
    name: s, value: risks.filter(r => r.classification === s).length,
  }));
  const calByStatus = ["Válida", "Próxima do vencimento", "Vencida", "Reprovada"].map(s => ({
    name: s, value: calibrations.filter(c => c.status === s).length,
  }));
  const docByCategory = Array.from(new Set(documents.map(d => d.category))).map(cat => ({
    name: cat, value: documents.filter(d => d.category === cat).length,
  }));

  const PIE_COLORS = ["var(--info)", "var(--success)", "var(--warning)", "var(--destructive)", "var(--primary)"];

  return (
    <>
      <PageHeader
        title="Dashboard Executivo"
        description="Visão geral da Gestão da Qualidade"
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
        <KpiCard label="Documentos ativos" value={docActive} hint={`${documents.length} no total`} icon={FileText} tone="success" to="/documents" />
        <KpiCard label="Documentos pendentes" value={docExpired} hint="Vencidos ou em revisão" icon={FileText} tone="warning" to="/documents" />
        <KpiCard label="Equipamentos" value={equipments.length} hint={`${equipments.filter(e => e.status === "Ativo").length} ativos`} icon={Wrench} to="/equipments" />
        <KpiCard label="Calibrações vencidas" value={calExpired} hint="Atenção imediata" icon={Gauge} tone="destructive" to="/calibrations" />
        <KpiCard label="Calibrações a vencer" value={calNear} hint="Próximas do vencimento" icon={Gauge} tone="warning" to="/calibrations" />
        <KpiCard label="Fornecedores ativos" value={supActive} hint={`${supPending} em avaliação`} icon={Truck} tone="info" to="/suppliers" />
        <KpiCard label="Ocorrências abertas" value={occOpen} hint={`${ncCritical} críticas`} icon={AlertTriangle} tone="warning" to="/occurrences" />
        <KpiCard label="Riscos altos / críticos" value={risksHigh} hint={`${risks.length} mapeados`} icon={ShieldAlert} tone="destructive" to="/risks" />
        <KpiCard label="Planos de ação pendentes" value={apPending} icon={ListChecks} tone="warning" to="/action-plans" />
        <KpiCard label="Auditorias em curso" value={audOngoing} hint={`${audits.length} no total`} icon={ClipboardCheck} tone="info" to="/audits" />
        <KpiCard label="Competências vencidas" value={compExpired} hint="Treinamentos pendentes" icon={GraduationCap} tone="destructive" to="/competencies" />
        <KpiCard label="Conformidade geral" value={`${Math.round(((docActive + supActive) / (documents.length + suppliers.length)) * 100)}%`} hint="Indicador composto" icon={TrendingUp} tone="success" to="/reports" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Ocorrências por mês</h3>
            <span className="text-xs text-muted-foreground">Últimos 7 meses</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={occurrencesByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Bar dataKey="value" fill="var(--primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
          <h3 className="text-sm font-semibold mb-3">Status dos planos de ação</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={planStatus} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis dataKey="name" type="category" stroke="var(--muted-foreground)" fontSize={11} width={130} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Bar dataKey="value" fill="var(--info)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
          <h3 className="text-sm font-semibold mb-3">Riscos por severidade</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={riskBySeverity} dataKey="value" nameKey="name" outerRadius={70} label>
                  {riskBySeverity.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
          <h3 className="text-sm font-semibold mb-3">Calibrações por status</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={calByStatus} dataKey="value" nameKey="name" outerRadius={70} label>
                  {calByStatus.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
          <h3 className="text-sm font-semibold mb-3">Documentos por categoria</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={docByCategory}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={10} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Bar dataKey="value" fill="var(--success)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-card border border-border rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Ocorrências recentes</h3>
          <Link to="/occurrences" className="text-xs text-primary hover:underline">Ver todas</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground text-xs">
              <tr className="text-left"><th className="px-2 py-1.5">Código</th><th className="px-2 py-1.5">Tipo</th><th className="px-2 py-1.5">Descrição</th><th className="px-2 py-1.5">Severidade</th><th className="px-2 py-1.5">Status</th></tr>
            </thead>
            <tbody>
              {occurrences.slice(0, 5).map(o => (
                <tr key={o.id} className="border-t border-border">
                  <td className="px-2 py-2 font-mono text-xs">{o.id}</td>
                  <td className="px-2 py-2">{o.type}</td>
                  <td className="px-2 py-2 max-w-md truncate">{o.description}</td>
                  <td className="px-2 py-2"><StatusBadge>{o.severity}</StatusBadge></td>
                  <td className="px-2 py-2"><StatusBadge>{o.status}</StatusBadge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
