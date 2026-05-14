import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { FileDown, FileSpreadsheet, BarChart3, Settings2, Filter } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { useTableStore } from "@/lib/table-store";
import { documentsStore } from "@/lib/documents-store";
import { occurrencesStore } from "@/lib/occurrences-store";
import { actionPlansStore } from "@/lib/action-plans-store";
import { risksStore } from "@/lib/risks-store";
import { calibrationsStore } from "@/lib/calibrations-store";
import { equipmentsStore } from "@/lib/equipments-store";
import { suppliersStore } from "@/lib/suppliers-store";
import { competenciesStore } from "@/lib/competencies-store";
import { auditsStore } from "@/lib/audits-store";
import { profilesStore, profileName } from "@/lib/profiles-store";
import { useJobRoles, LEVEL_LABEL, LEVEL_RANK } from "@/lib/job-roles-store";
import { useAssignments } from "@/lib/role-assignments-store";
import { indicatorsStore, indicatorResultsStore } from "@/lib/indicators-store";
import { useIndicatorMeta } from "@/lib/indicator-meta-store";
import { meetingsStore, agendaStore } from "@/lib/meetings-store";
import { supabase } from "@/integrations/supabase/client";
import { exportTablePdf } from "@/lib/pdf-export";

export const Route = createFileRoute("/_app/reports")({ component: ReportsPage });

const today = () => new Date().toISOString().slice(0, 10);

interface ReportDef {
  title: string;
  group: string;
  cols: string[];
  build: () => (string | number | null | undefined)[][];
  /** indices das colunas que são datas (para filtro de período). 1ª por padrão. */
  dateColIndex?: number;
}

function ReportsPage() {
  const documents = useTableStore(documentsStore);
  const occurrences = useTableStore(occurrencesStore);
  const actions = useTableStore(actionPlansStore);
  const risks = useTableStore(risksStore);
  const calibrations = useTableStore(calibrationsStore);
  const equipments = useTableStore(equipmentsStore);
  const suppliers = useTableStore(suppliersStore);
  const competencies = useTableStore(competenciesStore);
  const audits = useTableStore(auditsStore);
  const profiles = useTableStore(profilesStore);
  const { roles } = useJobRoles();
  const { map: assignments } = useAssignments();
  const indicators = useTableStore(indicatorsStore);
  const indResults = useTableStore(indicatorResultsStore);
  const { getExtra: getIndExtra } = useIndicatorMeta();
  const meetings = useTableStore(meetingsStore);
  const agenda = useTableStore(meetingAgendaStore);

  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState<string>("Todos");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [openConfig, setOpenConfig] = useState<string | null>(null);
  const [colSelection, setColSelection] = useState<Record<string, boolean[]>>({});

  const today_ = today();
  const isExpired = (iso: string | null | undefined) => !!iso && iso < today_;
  const meets = (userId: string, area: string, skill: string, minLvl: string) =>
    competencies.some((c) => c.user_id === userId && c.area === area && c.skill === skill
      && c.status === "ativo" && !isExpired(c.expires_at)
      && (LEVEL_RANK[c.level] ?? 0) >= (LEVEL_RANK[minLvl] ?? 0));

  const REPORTS: ReportDef[] = useMemo(() => [
    // ===== Documentos =====
    {
      group: "Documentos", title: "Documentos vencidos",
      cols: ["Código", "Título", "Categoria", "Versão", "Validade", "Responsável", "Status"],
      build: () => documents.filter((d) => d.validity && d.validity < today_).map((d) => [d.code, d.title, d.category, d.version, d.validity, profileName((d as any).responsible_id ?? null), d.status]),
      dateColIndex: 4,
    },
    {
      group: "Documentos", title: "Documentos por status",
      cols: ["Código", "Título", "Status", "Versão", "Validade", "Responsável", "Atualizado em"],
      build: () => documents.map((d) => [d.code, d.title, d.status, d.version, d.validity, profileName((d as any).responsible_id ?? null), d.updated_at?.slice(0, 10) ?? ""]),
      dateColIndex: 6,
    },
    // ===== Auditorias =====
    {
      group: "Auditorias", title: "Auditorias realizadas",
      cols: ["Código", "Tipo", "Escopo", "Auditor", "Planejada", "Realizada", "Achados", "Status"],
      build: () => audits.filter((a) => a.status === "concluida" || a.performed_at).map((a) => [a.code, a.type, a.scope, a.auditor_name, a.planned_at, a.performed_at, a.findings_count, a.status]),
      dateColIndex: 5,
    },
    {
      group: "Auditorias", title: "Auditorias programadas",
      cols: ["Código", "Tipo", "Escopo", "Auditor", "Planejada", "Status"],
      build: () => audits.filter((a) => a.status !== "concluida").map((a) => [a.code, a.type, a.scope, a.auditor_name, a.planned_at, a.status]),
      dateColIndex: 4,
    },
    // ===== Ocorrências e NC =====
    {
      group: "Ocorrências", title: "Ocorrências por período",
      cols: ["Código", "Tipo", "Origem", "Data", "Severidade", "Responsável", "Status"],
      build: () => occurrences.map((o) => [o.code ?? o.id, o.type, o.origin, o.occurred_at, o.severity, profileName(o.responsible_id), o.status]),
      dateColIndex: 3,
    },
    {
      group: "Ocorrências", title: "Não conformidades por severidade",
      cols: ["Código", "Severidade", "Descrição", "Responsável", "Status", "Data"],
      build: () => occurrences.filter((o) => o.type?.toLowerCase().includes("nc") || o.type?.toLowerCase().includes("não")).map((o) => [o.code ?? o.id, o.severity, o.description, profileName(o.responsible_id), o.status, o.occurred_at]),
      dateColIndex: 5,
    },
    {
      group: "Ocorrências", title: "Planos de ação pendentes",
      cols: ["Código", "Descrição", "Responsável", "Prazo", "Prioridade", "Progresso", "Status"],
      build: () => actions.filter((a) => a.status !== "concluida" && a.status !== "verificada").map((a) => [a.code ?? a.id, a.description, profileName(a.responsible_id), a.deadline, a.priority, `${a.progress}%`, a.status]),
      dateColIndex: 3,
    },
    // ===== Riscos =====
    {
      group: "Riscos", title: "Riscos por classificação",
      cols: ["Código", "Processo", "Descrição", "Probabilidade", "Impacto", "Classificação", "Responsável", "Status"],
      build: () => risks.map((r) => [r.code ?? r.id, r.process, r.description, r.probability, r.impact, r.classification, profileName(r.responsible_id), r.status]),
    },
    // ===== Fornecedores =====
    {
      group: "Fornecedores", title: "Fornecedores por classificação",
      cols: ["Código", "Nome", "Categoria", "Avaliação", "Última avaliação", "Qualificado até", "Status"],
      build: () => suppliers.map((s) => [s.code, s.name, s.category, s.rating, s.last_evaluation_date, s.qualified_until, s.status]),
      dateColIndex: 5,
    },
    // ===== Calibrações =====
    {
      group: "Calibrações", title: "Calibrações vencidas",
      cols: ["Equipamento", "Certificado", "Realizada", "Próxima", "Resultado", "Responsável"],
      build: () => calibrations.filter((c) => c.next_due_date && c.next_due_date < today_).map((c) => {
        const eq = equipments.find((e) => e.id === c.equipment_id);
        return [eq?.name ?? "", c.certificate_number, c.performed_at, c.next_due_date, c.result, profileName(c.responsible_id)];
      }),
      dateColIndex: 3,
    },
    {
      group: "Calibrações", title: "Calibrações a vencer (60 dias)",
      cols: ["Equipamento", "Certificado", "Próxima", "Resultado", "Responsável"],
      build: () => calibrations.filter((c) => {
        if (!c.next_due_date) return false;
        const d = (new Date(c.next_due_date).getTime() - new Date(today_).getTime()) / 86_400_000;
        return d >= 0 && d <= 60;
      }).map((c) => {
        const eq = equipments.find((e) => e.id === c.equipment_id);
        return [eq?.name ?? "", c.certificate_number, c.next_due_date, c.result, profileName(c.responsible_id)];
      }),
      dateColIndex: 2,
    },
    {
      group: "Calibrações", title: "Equipamentos por status",
      cols: ["Código", "Nome", "Tipo", "Status", "Próxima calibração", "Responsável"],
      build: () => equipments.map((e) => [e.code, e.name, e.category, e.status, e.next_calibration_date, profileName(e.responsible_id)]),
      dateColIndex: 4,
    },
    // ===== Competências =====
    {
      group: "Competências", title: "Competências vencidas",
      cols: ["Colaborador", "Área", "Competência", "Nível", "Certificado em", "Vence em", "Status"],
      build: () => competencies.filter((c) => c.expires_at && c.expires_at < today_).map((c) => [profileName(c.user_id), c.area, c.skill, c.level, c.certified_at, c.expires_at, c.status]),
      dateColIndex: 5,
    },
    {
      group: "Competências", title: "Capacitações por colaborador",
      cols: ["Colaborador", "Área", "Competência", "Nível", "Certificado em", "Validade", "Status"],
      build: () => competencies.map((c) => [profileName(c.user_id), c.area, c.skill, c.level, c.certified_at, c.expires_at, c.status]),
      dateColIndex: 4,
    },
    {
      group: "Competências", title: "Aptidão por função",
      cols: ["Colaborador", "Função", "Requisitos", "Atendidos", "Lacunas", "Apto"],
      build: () => Object.entries(assignments).map(([userId, roleId]) => {
        const role = roles.find((r) => r.id === roleId);
        if (!role) return null;
        const ok = role.requirements.filter((r) => meets(userId, r.area, r.skill, r.min_level)).length;
        const gaps = role.requirements.filter((r) => !meets(userId, r.area, r.skill, r.min_level));
        return [
          profileName(userId), role.name, role.requirements.length, ok,
          gaps.map((g) => `${g.skill} ≥ ${LEVEL_LABEL[g.min_level]}`).join("; ") || "—",
          role.requirements.length > 0 && gaps.length === 0 ? "Sim" : "Não",
        ];
      }).filter((r): r is (string | number)[] => !!r),
    },
    {
      group: "Competências", title: "Quadro de colaboradores",
      cols: ["Nome", "E-mail", "Função", "Cadastro"],
      build: () => profiles.map((p) => {
        const roleId = assignments[p.id];
        const role = roles.find((r) => r.id === roleId);
        return [p.name, p.email, role?.name ?? "—", p.created_at?.slice(0, 10) ?? ""];
      }),
      dateColIndex: 3,
    },
    // ===== Reuniões =====
    {
      group: "Reuniões", title: "Reuniões — agenda do período",
      cols: ["Código", "Tipo", "Data", "Hora", "Participantes", "Recorrência", "Status"],
      build: () => meetings.filter((m) => !m.deleted_at).map((m) => [m.id, m.type, m.meeting_date, m.meeting_time ?? "—", m.participants.length, m.recurrence_frequency ?? "—", m.status]),
      dateColIndex: 2,
    },
    {
      group: "Reuniões", title: "Reuniões realizadas",
      cols: ["Código", "Tipo", "Data", "Participantes", "Itens de pauta", "Pendentes", "Status"],
      build: () => meetings.filter((m) => m.status === "Realizada" && !m.deleted_at).map((m) => {
        const items = agenda.filter((a) => a.meeting_id === m.id);
        const pend = items.filter((a) => a.status === "Pendente" || a.status === "Postergada");
        return [m.id, m.type, m.meeting_date, m.participants.length, items.length, pend.length, m.status];
      }),
      dateColIndex: 2,
    },
    {
      group: "Reuniões", title: "Pautas pendentes / postergadas",
      cols: ["Reunião", "Data", "Tipo", "Pauta", "Status", "Origem"],
      build: () => agenda.filter((a) => a.status === "Pendente" || a.status === "Postergada").map((a) => {
        const m = meetings.find((x) => x.id === a.meeting_id);
        return [a.meeting_id, m?.meeting_date ?? "—", m?.type ?? "—", a.title, a.status, a.from_meeting_id ?? "—"];
      }),
      dateColIndex: 1,
    },
    // ===== Indicadores =====
    {
      group: "Indicadores", title: "Indicadores — resumo",
      cols: ["Código", "Nome", "Tipo", "Setor", "Processo", "Periodicidade", "Meta", "Último valor", "Atinge meta", "Responsável"],
      build: () => indicators.filter((i) => !i.deleted_at).map((i) => {
        const ex = getIndExtra(i.id);
        const rs = indResults.filter((r) => r.indicator_id === i.id).sort((a, b) => a.period.localeCompare(b.period));
        const last = rs.at(-1);
        const ok = last ? (i.direction === "maior" ? last.value >= i.target : last.value <= i.target) : null;
        return [i.code ?? i.id, i.name, ex.kind, i.area ?? "—", ex.process ?? "—", i.frequency,
          `${i.direction === "maior" ? "≥" : "≤"} ${i.target} ${i.unit}`,
          last ? `${last.value} ${i.unit}` : "—",
          last ? (ok ? "Sim" : "Não") : "—",
          profileName(i.responsible_id)];
      }),
    },
    {
      group: "Indicadores", title: "Indicadores — resultados (histórico)",
      cols: ["Indicador", "Tipo", "Setor", "Período", "Valor", "Meta", "Status", "Notas"],
      build: () => indResults.flatMap((r) => {
        const i = indicators.find((x) => x.id === r.indicator_id);
        if (!i) return [];
        const ex = getIndExtra(i.id);
        return [[i.name, ex.kind, i.area ?? "—", r.period, `${r.value} ${i.unit}`,
          `${i.direction === "maior" ? "≥" : "≤"} ${i.target}`, r.status ?? "", r.notes ?? ""]];
      }),
    },
    {
      group: "Indicadores", title: "Indicadores — análise de tendência",
      cols: ["Indicador", "Setor", "Períodos", "Primeiro", "Último", "Variação", "Tendência", "% no alvo"],
      build: () => indicators.filter((i) => !i.deleted_at).map((i) => {
        const rs = indResults.filter((r) => r.indicator_id === i.id).sort((a, b) => a.period.localeCompare(b.period));
        if (rs.length === 0) return [i.name, i.area ?? "—", 0, "—", "—", "—", "—", "—"];
        const first = rs[0]; const last = rs.at(-1)!;
        const delta = last.value - first.value;
        const goodDelta = i.direction === "maior" ? delta > 0 : delta < 0;
        const trend = delta === 0 ? "estável" : (goodDelta ? "melhorando" : "piorando");
        const onTarget = rs.filter((r) => i.direction === "maior" ? r.value >= i.target : r.value <= i.target).length;
        const pct = Math.round((onTarget / rs.length) * 100);
        return [i.name, i.area ?? "—", rs.length, `${first.value} (${first.period})`,
          `${last.value} (${last.period})`, `${delta >= 0 ? "+" : ""}${delta.toFixed(2)}`, trend, `${pct}%`];
      }),
    },
    // ===== Rastreabilidade =====
    {
      group: "Rastreabilidade", title: "Trilha de auditoria (últimos 500)",
      cols: ["Quando", "Módulo", "Ação", "Registro", "Autor", "E-mail"],
      build: () => [], // populado dinamicamente abaixo
    },
  ], [documents, occurrences, actions, risks, calibrations, equipments, suppliers, competencies, audits, profiles, roles, assignments, indicators, indResults, meetings, agenda, getIndExtra, today_]);

  const groups = ["Todos", ...Array.from(new Set(REPORTS.map((r) => r.group)))];

  // Filtro por período aplicado a cada relatório
  const applyFilters = (rep: ReportDef, rows: (string | number | null | undefined)[][]) => {
    if (!from && !to) return rows;
    const idx = rep.dateColIndex;
    if (idx == null) return rows;
    return rows.filter((r) => {
      const v = String(r[idx] ?? "").slice(0, 10);
      if (!v) return false;
      if (from && v < from) return false;
      if (to && v > to) return false;
      return true;
    });
  };

  const buildRowsFor = async (rep: ReportDef) => {
    if (rep.title.startsWith("Trilha de auditoria")) {
      const { data } = await supabase
        .from("audit_logs")
        .select("occurred_at, module, action, record_label, actor_name, actor_email")
        .order("occurred_at", { ascending: false })
        .limit(500);
      const rows = (data ?? []).map((r) => [
        new Date(r.occurred_at).toLocaleString("pt-BR"),
        r.module, r.action, r.record_label ?? "—", r.actor_name ?? "—", r.actor_email ?? "—",
      ]);
      return applyFilters(rep, rows as any);
    }
    return applyFilters(rep, rep.build());
  };

  const visibleColumns = (rep: ReportDef) => {
    const sel = colSelection[rep.title];
    if (!sel) return rep.cols.map((_, i) => i);
    return rep.cols.map((_, i) => i).filter((i) => sel[i] !== false);
  };

  const project = (rep: ReportDef, rows: (string | number | null | undefined)[][]) => {
    const idxs = visibleColumns(rep);
    return {
      cols: idxs.map((i) => rep.cols[i]),
      rows: rows.map((r) => idxs.map((i) => r[i])),
    };
  };

  const handlePdf = async (rep: ReportDef) => {
    const rows = await buildRowsFor(rep);
    if (!rows.length) { toast.info(`Nenhum dado para "${rep.title}"`); return; }
    const proj = project(rep, rows);
    exportTablePdf({
      title: rep.title, columns: proj.cols, rows: proj.rows,
      filename: rep.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      meta: {
        Período: from || to ? `${from || "início"} a ${to || "hoje"}` : "todos os registros",
        Total: String(rows.length),
        "Gerado em": new Date().toLocaleString("pt-BR"),
      },
    });
    toast.success(`PDF "${rep.title}" gerado`);
  };

  const handleExcel = async (rep: ReportDef) => {
    const rows = await buildRowsFor(rep);
    if (!rows.length) { toast.info(`Nenhum dado para "${rep.title}"`); return; }
    const proj = project(rep, rows);
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([proj.cols, ...proj.rows]);
    XLSX.utils.book_append_sheet(wb, ws, rep.group.slice(0, 31));
    const filename = `${rep.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.xlsx`;
    XLSX.writeFile(wb, filename);
    toast.success(`Excel "${rep.title}" gerado`);
  };

  const filtered = REPORTS.filter((r) =>
    (groupFilter === "Todos" || r.group === groupFilter) &&
    (!search || r.title.toLowerCase().includes(search.toLowerCase()) || r.group.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <>
      <PageHeader
        title="Relatórios"
        description="Relatórios gerenciais e operacionais com filtros, personalização e exportação em PDF e Excel"
      />

      {/* Filtros globais */}
      <div className="bg-card border border-border rounded-lg p-4 mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1.5"><Filter className="size-3" /> Buscar</Label>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nome do relatório…" className="h-9" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Categoria</Label>
          <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
            {groups.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Período — de</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Período — até</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9" />
        </div>
        <div className="flex items-end">
          <Button variant="outline" className="h-9 w-full" onClick={() => { setFrom(""); setTo(""); setSearch(""); setGroupFilter("Todos"); }}>
            Limpar filtros
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((rep) => {
          const previewCount = (() => {
            try { return rep.title.startsWith("Trilha") ? "—" : String(applyFilters(rep, rep.build()).length); }
            catch { return "—"; }
          })();
          const sel = colSelection[rep.title] ?? rep.cols.map(() => true);
          const visibleCount = sel.filter(Boolean).length;
          return (
            <div key={rep.title} className="bg-card border border-border rounded-lg p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="size-9 rounded-lg bg-primary/10 grid place-items-center text-primary"><BarChart3 className="size-4" /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{rep.group}</div>
                  <div className="font-medium text-sm">{rep.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {previewCount} registro(s) · {visibleCount}/{rep.cols.length} colunas
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <Button size="sm" className="flex-1" onClick={() => handlePdf(rep)}><FileDown className="size-4" /> PDF</Button>
                <Button size="sm" variant="outline" onClick={() => handleExcel(rep)}><FileSpreadsheet className="size-4" /> Excel</Button>
                <Dialog open={openConfig === rep.title} onOpenChange={(o) => setOpenConfig(o ? rep.title : null)}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="ghost" title="Personalizar colunas"><Settings2 className="size-4" /></Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Personalizar — {rep.title}</DialogTitle></DialogHeader>
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Selecione as colunas que aparecerão no PDF e no Excel.</p>
                      <div className="grid grid-cols-2 gap-1.5 max-h-72 overflow-y-auto">
                        {rep.cols.map((c, i) => {
                          const cur = colSelection[rep.title] ?? rep.cols.map(() => true);
                          return (
                            <label key={c} className="flex items-center gap-2 text-sm border border-border rounded px-2 py-1.5 hover:bg-muted/40 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={cur[i] !== false}
                                onChange={(e) => {
                                  const next = [...cur];
                                  next[i] = e.target.checked;
                                  setColSelection({ ...colSelection, [rep.title]: next });
                                }}
                              />
                              {c}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => { const next = { ...colSelection }; delete next[rep.title]; setColSelection(next); }}>
                        Restaurar todas
                      </Button>
                      <Button onClick={() => setOpenConfig(null)}>OK</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center text-sm text-muted-foreground py-12">
          Nenhum relatório encontrado para os filtros atuais.
        </div>
      )}
    </>
  );
}
