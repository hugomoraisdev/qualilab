import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAuditAccess } from "@/lib/audit";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Plus, Calendar, Users, LayoutGrid, GanttChart } from "lucide-react";
import { cn } from "@/lib/utils";

type Status = "backlog" | "doing" | "review" | "done";
interface Project {
  id: string; title: string; description: string; status: Status;
  responsible: string; start: string | null; deadline: string | null; progress: number;
  subtasks: { id: string; title: string; done: boolean }[];
}

const SEED: Project[] = [
  { id: "PRJ-001", title: "Implantação do QualiLab", description: "Migração de planilhas para o sistema", status: "doing", responsible: "Carla Administradora", start: "2026-04-01", deadline: "2026-08-30", progress: 55, subtasks: [
    { id: "s1", title: "Levantamento de processos", done: true },
    { id: "s2", title: "Treinamento da equipe", done: true },
    { id: "s3", title: "Migração de dados", done: false },
    { id: "s4", title: "Auditoria de aceitação", done: false },
  ]},
  { id: "PRJ-002", title: "Acreditação INMETRO 2026", description: "Preparação para auditoria de manutenção", status: "doing", responsible: "Roberto Gestor", start: "2026-05-15", deadline: "2026-11-20", progress: 30, subtasks: [
    { id: "s1", title: "Revisão de POPs", done: true },
    { id: "s2", title: "Auditoria interna", done: false },
    { id: "s3", title: "Análise crítica pela direção", done: false },
  ]},
  { id: "PRJ-003", title: "Modernização de equipamentos", description: "Substituição de balanças e pHmetros", status: "backlog", responsible: "Mariana Técnica", start: "2026-09-01", deadline: "2027-03-15", progress: 5, subtasks: [
    { id: "s1", title: "Cotação", done: false },
    { id: "s2", title: "Aquisição", done: false },
  ]},
  { id: "PRJ-004", title: "Validação de novo método de pH", description: "Validação conforme DOQ-CGCRE", status: "review", responsible: "Mariana Técnica", start: "2026-03-01", deadline: "2026-06-10", progress: 85, subtasks: [
    { id: "s1", title: "Plano de validação", done: true },
    { id: "s2", title: "Execução", done: true },
    { id: "s3", title: "Relatório final", done: false },
  ]},
  { id: "PRJ-005", title: "Digitalização de registros 2020-2024", description: "Backup e indexação de registros físicos", status: "done", responsible: "Carla Administradora", start: "2026-01-15", deadline: "2026-03-30", progress: 100, subtasks: [
    { id: "s1", title: "Escaneamento", done: true },
    { id: "s2", title: "Indexação", done: true },
  ]},
];

const COLUMNS: { key: Status; label: string; color: string }[] = [
  { key: "backlog", label: "Backlog", color: "border-muted-foreground/30" },
  { key: "doing", label: "Em execução", color: "border-info/40" },
  { key: "review", label: "Em revisão", color: "border-warning/40" },
  { key: "done", label: "Concluído", color: "border-success/40" },
];

const STATUS_BAR: Record<Status, string> = {
  backlog: "bg-muted-foreground/40",
  doing: "bg-info",
  review: "bg-warning",
  done: "bg-success",
};

export const Route = createFileRoute("/_app/projects")({ component: ProjectsPage });

function ProjectsPage() {
  useAuditAccess("projects");
  const [projects, setProjects] = useState<Project[]>(SEED);
  const [showForm, setShowForm] = useState(false);
  const [view, setView] = useState<"kanban" | "gantt">("kanban");
  const [selected, setSelected] = useState<Project | null>(null);
  const [title, setTitle] = useState("");
  const [responsible, setResponsible] = useState("");
  const [deadline, setDeadline] = useState("");

  const moveProject = (id: string, status: Status) => {
    setProjects(projects.map((p) => (p.id === id ? { ...p, status } : p)));
  };

  const create = () => {
    if (!title.trim()) return;
    setProjects([{
      id: "PRJ-" + String(projects.length + 1).padStart(3, "0"),
      title, description: "", status: "backlog", responsible: responsible || "—",
      start: new Date().toISOString().slice(0, 10),
      deadline: deadline || null,
      progress: 0, subtasks: [],
    }, ...projects]);
    setTitle(""); setResponsible(""); setDeadline(""); setShowForm(false);
  };

  return (
    <>
      <PageHeader
        title="Projetos"
        description="Gestão de projetos com Kanban e Gantt."
        actions={
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-md border border-border bg-card p-0.5">
              <button
                onClick={() => setView("kanban")}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-sm transition-colors",
                  view === "kanban" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <LayoutGrid className="size-3.5" /> Kanban
              </button>
              <button
                onClick={() => setView("gantt")}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-sm transition-colors",
                  view === "gantt" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <GanttChart className="size-3.5" /> Gantt
              </button>
            </div>
            <Button onClick={() => setShowForm((v) => !v)}><Plus className="size-4" /> Novo projeto</Button>
          </div>
        }
      />

      {showForm && (
        <div className="bg-card border border-border rounded-lg p-5 shadow-sm mb-6 grid grid-cols-1 lg:grid-cols-4 gap-3 items-end">
          <div className="lg:col-span-2"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título do projeto *" /></div>
          <Input value={responsible} onChange={(e) => setResponsible(e.target.value)} placeholder="Responsável" />
          <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          <div className="lg:col-span-4 flex justify-end gap-2"><Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button><Button onClick={create}>Criar projeto</Button></div>
        </div>
      )}

      {view === "kanban" ? (
        <KanbanView projects={projects} onMove={moveProject} onOpen={setSelected} />
      ) : (
        <GanttView projects={projects} onOpen={setSelected} />
      )}

      <ProjectDialog project={selected} onClose={() => setSelected(null)} />
    </>
  );
}

function KanbanView({ projects, onMove, onOpen }: { projects: Project[]; onMove: (id: string, s: Status) => void; onOpen: (p: Project) => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
      {COLUMNS.map((col) => {
        const items = projects.filter((p) => p.status === col.key);
        return (
          <div key={col.key} className={cn("bg-muted/30 border-t-2 rounded-lg p-3 min-h-[200px]", col.color)}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">{col.label}</h3>
              <span className="text-xs text-muted-foreground">{items.length}</span>
            </div>
            <div className="space-y-2">
              {items.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onOpen(p)}
                  className="w-full text-left bg-card border border-border rounded-md p-3 shadow-sm hover:border-primary/40 transition-colors"
                >
                  <div className="text-[11px] font-mono text-muted-foreground">{p.id}</div>
                  <div className="text-sm font-medium leading-tight mb-1">{p.title}</div>
                  {p.description && <div className="text-[11px] text-muted-foreground mb-2">{p.description}</div>}
                  {p.subtasks.length > 0 && (
                    <div className="text-[11px] text-muted-foreground mb-2">
                      Subtarefas: {p.subtasks.filter((s) => s.done).length}/{p.subtasks.length}
                    </div>
                  )}
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-2">
                    <div className="h-full bg-primary" style={{ width: `${p.progress}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="size-3" />{p.responsible.split(" ")[0]}</span>
                    <span className="flex items-center gap-1"><Calendar className="size-3" />{p.deadline ?? "—"}</span>
                  </div>
                  <div className="flex gap-1 mt-2" onClick={(e) => e.stopPropagation()}>
                    {COLUMNS.filter((c) => c.key !== p.status).map((c) => (
                      <button key={c.key} onClick={() => onMove(p.id, c.key)} className="text-[10px] px-1.5 py-0.5 rounded border border-border hover:bg-accent">
                        → {c.label}
                      </button>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------- Gantt ----------

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function addMonths(d: Date, n: number) { return new Date(d.getFullYear(), d.getMonth() + n, 1); }
function daysBetween(a: Date, b: Date) { return Math.round((b.getTime() - a.getTime()) / 86400000); }

function GanttView({ projects, onOpen }: { projects: Project[]; onOpen: (p: Project) => void }) {
  const dated = projects.filter((p) => p.start && p.deadline);
  const undated = projects.filter((p) => !p.start || !p.deadline);

  const { startMonth, totalDays, months } = useMemo(() => {
    if (dated.length === 0) {
      const now = new Date();
      const s = startOfMonth(now);
      const e = addMonths(s, 6);
      return { startMonth: s, totalDays: daysBetween(s, e), months: monthRange(s, e) };
    }
    const minStart = dated.reduce((m, p) => new Date(p.start!) < m ? new Date(p.start!) : m, new Date(dated[0].start!));
    const maxEnd = dated.reduce((m, p) => new Date(p.deadline!) > m ? new Date(p.deadline!) : m, new Date(dated[0].deadline!));
    const s = startOfMonth(minStart);
    const e = addMonths(startOfMonth(maxEnd), 1);
    return { startMonth: s, totalDays: daysBetween(s, e), months: monthRange(s, e) };
  }, [dated]);

  const today = new Date();
  const todayPct = todayInRange(today, startMonth, totalDays);

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        <div className="flex">
          {/* coluna fixa */}
          <div className="shrink-0 w-56 border-r border-border bg-muted/30">
            <div className="h-10 border-b border-border px-3 flex items-center text-xs font-semibold text-muted-foreground">
              Projeto
            </div>
            {dated.map((p) => (
              <div key={p.id} className="h-12 border-b border-border px-3 flex flex-col justify-center">
                <div className="text-xs font-medium truncate">{p.title}</div>
                <div className="text-[10px] text-muted-foreground truncate">{p.responsible}</div>
              </div>
            ))}
            {dated.length === 0 && (
              <div className="h-12 px-3 flex items-center text-xs text-muted-foreground italic">Nenhum projeto com datas.</div>
            )}
          </div>

          {/* timeline com scroll */}
          <div className="flex-1 overflow-x-auto">
            <div className="relative" style={{ minWidth: months.length * 80 }}>
              {/* header de meses */}
              <div className="flex h-10 border-b border-border">
                {months.map((m, i) => (
                  <div
                    key={i}
                    className="border-r border-border last:border-r-0 px-2 flex items-center text-[11px] font-medium text-muted-foreground"
                    style={{ width: `${(daysInMonth(m) / totalDays) * 100}%` }}
                  >
                    {m.toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}
                  </div>
                ))}
              </div>

              {/* linha "hoje" */}
              {todayPct !== null && (
                <div
                  className="absolute top-10 bottom-0 w-px bg-primary/60 z-10 pointer-events-none"
                  style={{ left: `${todayPct}%` }}
                  aria-label="Hoje"
                >
                  <div className="absolute -top-2 -translate-x-1/2 text-[9px] font-medium text-primary bg-card px-1 rounded border border-primary/40">
                    hoje
                  </div>
                </div>
              )}

              {/* barras */}
              {dated.map((p) => {
                const start = new Date(p.start!);
                const end = new Date(p.deadline!);
                const offsetDays = Math.max(0, daysBetween(startMonth, start));
                const spanDays = Math.max(1, daysBetween(start, end));
                const left = (offsetDays / totalDays) * 100;
                const width = (spanDays / totalDays) * 100;
                return (
                  <div key={p.id} className="h-12 border-b border-border relative">
                    {/* faixas mensais sutis */}
                    <div className="absolute inset-0 flex">
                      {months.map((m, i) => (
                        <div
                          key={i}
                          className={cn("border-r border-border/40 last:border-r-0", i % 2 === 1 && "bg-muted/20")}
                          style={{ width: `${(daysInMonth(m) / totalDays) * 100}%` }}
                        />
                      ))}
                    </div>
                    <button
                      onClick={() => onOpen(p)}
                      title={`${p.title}\n${p.start} → ${p.deadline}\nResponsável: ${p.responsible}\nProgresso: ${p.progress}%`}
                      className={cn(
                        "absolute top-2 h-8 rounded-md border border-border/60 shadow-sm overflow-hidden transition-transform hover:scale-y-105 hover:shadow-md",
                        STATUS_BAR[p.status],
                      )}
                      style={{ left: `${left}%`, width: `max(${width}%, 24px)` }}
                    >
                      <div className="absolute inset-0 bg-foreground/10" />
                      <div
                        className="absolute inset-y-0 left-0 bg-foreground/30"
                        style={{ width: `${p.progress}%` }}
                      />
                      <div className="relative h-full flex items-center px-2 text-[10px] font-semibold text-white drop-shadow-sm whitespace-nowrap">
                        {p.progress}%
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* legenda */}
        <div className="flex items-center gap-3 px-3 py-2 border-t border-border text-[11px] text-muted-foreground">
          {COLUMNS.map((c) => (
            <span key={c.key} className="inline-flex items-center gap-1.5">
              <span className={cn("inline-block size-2.5 rounded-sm", STATUS_BAR[c.key])} />
              {c.label}
            </span>
          ))}
          <span className="ml-auto inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-2 rounded-sm bg-foreground/30" />
            preenchimento = % de progresso
          </span>
        </div>
      </div>

      {undated.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
          <h3 className="text-sm font-semibold mb-2">Sem data definida ({undated.length})</h3>
          <ul className="divide-y divide-border">
            {undated.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => onOpen(p)}
                  className="w-full text-left py-2 flex items-center justify-between hover:bg-muted/30 px-2 rounded-md"
                >
                  <div>
                    <div className="text-sm font-medium">{p.title}</div>
                    <div className="text-[11px] text-muted-foreground">{p.id} · {p.responsible}</div>
                  </div>
                  <span className={cn("inline-block size-2.5 rounded-sm", STATUS_BAR[p.status])} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function monthRange(start: Date, end: Date) {
  const out: Date[] = [];
  let cur = new Date(start);
  while (cur < end) {
    out.push(new Date(cur));
    cur = addMonths(cur, 1);
  }
  return out;
}

function daysInMonth(m: Date) {
  return new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
}

function todayInRange(today: Date, start: Date, totalDays: number) {
  const off = daysBetween(start, today);
  if (off < 0 || off > totalDays) return null;
  return (off / totalDays) * 100;
}

// ---------- Modal ----------

function ProjectDialog({ project, onClose }: { project: Project | null; onClose: () => void }) {
  return (
    <Dialog open={!!project} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        {project && (
          <>
            <DialogHeader>
              <DialogTitle>{project.title}</DialogTitle>
              <DialogDescription>{project.id} · {project.description || "Sem descrição"}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Responsável" value={project.responsible} />
                <Field label="Status" value={COLUMNS.find((c) => c.key === project.status)?.label ?? project.status} />
                <Field label="Início" value={project.start ?? "—"} />
                <Field label="Prazo" value={project.deadline ?? "—"} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-muted-foreground">Progresso</span>
                  <span className="text-xs font-semibold">{project.progress}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${project.progress}%` }} />
                </div>
              </div>
              {project.subtasks.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold mb-2 text-muted-foreground">
                    Subtarefas ({project.subtasks.filter((s) => s.done).length}/{project.subtasks.length})
                  </h4>
                  <ul className="space-y-1">
                    {project.subtasks.map((s) => (
                      <li key={s.id} className="flex items-center gap-2 text-sm">
                        <span className={cn("inline-block size-3 rounded border", s.done ? "bg-success border-success" : "border-border")} />
                        <span className={cn(s.done && "line-through text-muted-foreground")}>{s.title}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}
