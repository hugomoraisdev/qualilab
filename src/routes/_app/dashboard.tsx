import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuditAccess } from "@/lib/audit";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import {
  FileText, Wrench, Gauge, Truck, AlertTriangle, ShieldAlert,
  ListChecks, ClipboardCheck, GraduationCap, TrendingUp, ArrowRight,
  Target, BarChart3, TrendingDown,
} from "lucide-react";
import { documentsStore } from "@/lib/documents-store";
import { equipmentsStore } from "@/lib/equipments-store";
import { calibrationsStore } from "@/lib/calibrations-store";
import { suppliersStore, getEvaluationStatus } from "@/lib/suppliers-store";
import { occurrencesStore } from "@/lib/occurrences-store";
import { risksStore, classifyScore } from "@/lib/risks-store";
import { actionPlansStore } from "@/lib/action-plans-store";
import { auditsStore } from "@/lib/audits-store";
import { competenciesStore } from "@/lib/competencies-store";
import {
  indicatorsStore,
  indicatorResultsStore,
  computeIndicatorOverview,
} from "@/lib/indicators-store";
import { useTableStore } from "@/lib/table-store";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, ReferenceLine,
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

function calStatus(c: { result: string; next_due_date: string | null }, today: string, in30: string) {
  if (c.result === "reprovado") return "Reprovada";
  if (c.next_due_date && c.next_due_date < today) return "Vencida";
  if (c.next_due_date && c.next_due_date <= in30) return "Próxima do vencimento";
  return "Válida";
}

function riskClass(r: { classification: string | null; probability: number; impact: number }) {
  return r.classification ?? classifyScore(r.probability * r.impact).label;
}

function Dashboard() {
  useAuditAccess("dashboard");

  const today = new Date().toISOString().slice(0, 10);
  const in30 = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);

  const documents = useTableStore(documentsStore).filter((d) => !d.deleted_at);
  const equipments = useTableStore(equipmentsStore).filter((e) => !e.deleted_at);
  const calibrations = useTableStore(calibrationsStore).filter((c) => !c.deleted_at);
  const suppliers = useTableStore(suppliersStore).filter((s) => !s.deleted_at);
  const occurrences = useTableStore(occurrencesStore).filter((o) => !o.deleted_at);
  const risks = useTableStore(risksStore).filter((r) => !r.deleted_at);
  const actionPlans = useTableStore(actionPlansStore).filter((a) => !a.deleted_at);
  const audits = useTableStore(auditsStore).filter((a) => !a.deleted_at);
  const competencies = useTableStore(competenciesStore).filter((c) => !c.deleted_at);

  const docActive = documents.filter((d) => d.status === "aprovado").length;
  const docExpired = documents.filter((d) => d.status === "em_revisao" || d.status === "obsoleto").length;

  const calExpired = calibrations.filter((c) => calStatus(c, today, in30) === "Vencida" || calStatus(c, today, in30) === "Reprovada").length;
  const calNear = calibrations.filter((c) => calStatus(c, today, in30) === "Próxima do vencimento").length;

  const supActive = suppliers.filter((s) => s.status === "ativo").length;
  const supSuspenso = suppliers.filter((s) => s.status === "suspenso").length;
  const supEvalAlerts = suppliers.filter((sp) => {
    const st = getEvaluationStatus(sp);
    return st === "vencida" || st === "a_vencer";
  }).length;

  const occOpen = occurrences.filter((o) => o.status !== "concluida" && o.status !== "cancelada").length;
  const ncCritical = occurrences.filter((o) => o.severity === "critica").length;

  const risksHigh = risks.filter((r) => riskClass(r) === "Crítico" || riskClass(r) === "Alto").length;

  const apPending = actionPlans.filter((a) => a.status !== "concluido" && a.status !== "cancelado").length;
  const audOngoing = audits.filter((a) => a.status === "planejada" || a.status === "em_andamento").length;
  const compExpired = competencies.filter((c) => c.status === "vencido" || c.status === "pendente").length;

  const indicators = useTableStore(indicatorsStore).filter((i) => !i.deleted_at);
  const allIndicatorResults = useTableStore(indicatorResultsStore);

  const indicatorOverview = useMemo(
    () => computeIndicatorOverview(indicators, allIndicatorResults),
    [indicators, allIndicatorResults],
  );

  const indicatorChartData = useMemo(() => {
    return indicators
      .map((ind) => {
        const rs = allIndicatorResults
          .filter((r) => r.indicator_id === ind.id)
          .sort((a, b) => a.period.localeCompare(b.period));
        const last = rs.at(-1);
        if (!last) return null;
        const achievement =
          ind.direction === "maior"
            ? Math.round(Math.min(150, (last.value / (ind.target || 1)) * 100))
            : ind.target > 0 && last.value > 0
            ? Math.round(Math.min(150, (ind.target / last.value) * 100))
            : 0;
        const meets =
          ind.direction === "maior" ? last.value >= ind.target : last.value <= ind.target;
        return {
          name: ind.name.length > 14 ? ind.name.slice(0, 13) + "…" : ind.name,
          achievement,
          meets,
        };
      })
      .filter((d): d is { name: string; achievement: number; meets: boolean } => d !== null)
      .slice(0, 8);
  }, [indicators, allIndicatorResults]);

  const occurrencesByMonth = useMemo(() => {
    const now = new Date();
    const months: { key: string; month: string }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toISOString().slice(0, 7);
      const month = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(". ", "/");
      months.push({ key, month });
    }
    const counts: Record<string, number> = Object.fromEntries(months.map((m) => [m.key, 0]));
    for (const o of occurrences) {
      const key = o.occurred_at?.slice(0, 7);
      if (key && key in counts) counts[key]++;
    }
    return months.map((m) => ({ month: m.month, value: counts[m.key] }));
  }, [occurrences]);

  const planStatus = [
    { name: "Pendente", value: actionPlans.filter((a) => a.status === "pendente").length },
    { name: "Em andamento", value: actionPlans.filter((a) => a.status === "em_andamento").length },
    { name: "Concluído", value: actionPlans.filter((a) => a.status === "concluido").length },
    { name: "Cancelado", value: actionPlans.filter((a) => a.status === "cancelado").length },
  ];

  const riskBySeverity = ["Baixo", "Médio", "Alto", "Crítico"].map((s) => ({
    name: s,
    value: risks.filter((r) => riskClass(r) === s).length,
  }));

  const calByStatus = ["Válida", "Próxima do vencimento", "Vencida", "Reprovada"].map((s) => ({
    name: s,
    value: calibrations.filter((c) => calStatus(c, today, in30) === s).length,
  }));

  const docByCategory = Array.from(new Set(documents.map((d) => d.category))).map((cat) => ({
    name: cat,
    value: documents.filter((d) => d.category === cat).length,
  }));

  const PIE_COLORS = ["var(--info)", "var(--success)", "var(--warning)", "var(--destructive)", "var(--primary)"];

  const conformidade = documents.length + suppliers.length > 0
    ? Math.round(((docActive + supActive) / (documents.length + suppliers.length)) * 100)
    : 0;

  return (
    <>
      <PageHeader
        title="Dashboard Executivo"
        description="Visão geral da Gestão da Qualidade"
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
        <KpiCard label="Documentos ativos" value={docActive} hint={`${documents.length} no total`} icon={FileText} tone="success" to="/documents" />
        <KpiCard label="Documentos pendentes" value={docExpired} hint="Em revisão ou obsoletos" icon={FileText} tone="warning" to="/documents" />
        <KpiCard label="Equipamentos" value={equipments.length} hint={`${equipments.filter((e) => e.status === "ativo").length} ativos`} icon={Wrench} to="/equipments" />
        <KpiCard label="Calibrações vencidas" value={calExpired} hint="Atenção imediata" icon={Gauge} tone="destructive" to="/calibrations" />
        <KpiCard label="Calibrações a vencer" value={calNear} hint="Próximas do vencimento" icon={Gauge} tone="warning" to="/calibrations" />
        <KpiCard label="Fornecedores ativos" value={supActive} hint={`${supSuspenso} suspensos`} icon={Truck} tone="info" to="/suppliers" />
        <KpiCard label="Avaliação de fornecedor" value={supEvalAlerts} hint="Vencidas ou a vencer" icon={Truck} tone="warning" to="/suppliers" />
        <KpiCard label="Ocorrências abertas" value={occOpen} hint={`${ncCritical} críticas`} icon={AlertTriangle} tone="warning" to="/occurrences" />
        <KpiCard label="Riscos altos / críticos" value={risksHigh} hint={`${risks.length} mapeados`} icon={ShieldAlert} tone="destructive" to="/risks" />
        <KpiCard label="Planos de ação pendentes" value={apPending} icon={ListChecks} tone="warning" to="/action-plans" />
        <KpiCard label="Auditorias em curso" value={audOngoing} hint={`${audits.length} no total`} icon={ClipboardCheck} tone="info" to="/audits" />
        <KpiCard label="Competências vencidas" value={compExpired} hint="Treinamentos pendentes" icon={GraduationCap} tone="destructive" to="/competencies" />
        <KpiCard label="Conformidade geral" value={`${conformidade}%`} hint="Indicador composto" icon={TrendingUp} tone="success" to="/reports" />
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

      {/* Indicadores de desempenho e qualidade */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Target className="size-4" /> Indicadores de desempenho e qualidade
          </h3>
          <Link to="/indicators" className="text-xs text-primary hover:underline flex items-center gap-1">
            Ver todos <ArrowRight className="size-3 ml-0.5" />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <KpiCard
            label="Total de indicadores"
            value={indicatorOverview.total}
            hint={`${indicatorOverview.noData} sem dados`}
            icon={BarChart3}
            to="/indicators"
          />
          <KpiCard
            label="No alvo"
            value={indicatorOverview.onTarget}
            tone="success"
            icon={Target}
            to="/indicators"
          />
          <KpiCard
            label="Abaixo da meta"
            value={indicatorOverview.off}
            tone="warning"
            icon={TrendingDown}
            to="/indicators"
          />
          <KpiCard
            label="% no alvo"
            value={`${indicatorOverview.pct}%`}
            tone={
              indicatorOverview.pct >= 80
                ? "success"
                : indicatorOverview.pct >= 50
                ? "warning"
                : "destructive"
            }
            icon={TrendingUp}
            to="/indicators"
          />
        </div>
        {indicatorChartData.length > 0 && (
          <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold">Atingimento da meta por indicador</h4>
              <span className="text-xs text-muted-foreground">% do alvo · último resultado</span>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={indicatorChartData}
                  margin={{ top: 8, right: 24, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={10} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} unit="%" />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                    }}
                    formatter={(val: number) => [`${val}%`, "Atingimento"]}
                  />
                  <ReferenceLine
                    y={100}
                    stroke="var(--primary)"
                    strokeDasharray="4 4"
                    label={{
                      value: "Meta (100%)",
                      position: "insideTopLeft",
                      fontSize: 11,
                      fill: "var(--primary)",
                    }}
                  />
                  <Bar dataKey="achievement" radius={[4, 4, 0, 0]}>
                    {indicatorChartData.map((d, idx) => (
                      <Cell key={idx} fill={d.meets ? "var(--success)" : "var(--warning)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
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
              {occurrences.slice(0, 5).map((o) => (
                <tr key={o.id} className="border-t border-border">
                  <td className="px-2 py-2 font-mono text-xs">{o.code ?? o.id.slice(0, 8)}</td>
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
