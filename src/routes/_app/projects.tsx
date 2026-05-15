import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuditAccess } from "@/lib/audit";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Plus, Calendar, Users, LayoutGrid, GanttChart, GripVertical, Pencil, Trash2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Status = string;
interface Project {
  id: string; title: string; description: string; status: Status;
  responsible: string; start: string | null; deadline: string | null; progress: number;
  subtasks: { id: string; title: string; done: boolean }[];
}
interface Column { key: string; label: string; color: string; bar: string }

const DEFAULT_COLUMNS: Column[] = [
  { key: "backlog", label: "Backlog",     color: "border-muted-foreground/30", bar: "bg-muted-foreground/40" },
  { key: "doing",   label: "Em execução", color: "border-info/40",             bar: "bg-info" },
  { key: "review",  label: "Em revisão",  color: "border-warning/40",          bar: "bg-warning" },
  { key: "done",    label: "Concluído",   color: "border-success/40",          bar: "bg-success" },
];

const PALETTE: { color: string; bar: string }[] = [
  { color: "border-muted-foreground/30", bar: "bg-muted-foreground/40" },
  { color: "border-info/40",             bar: "bg-info" },
  { color: "border-warning/40",          bar: "bg-warning" },
  { color: "border-success/40",          bar: "bg-success" },
  { color: "border-destructive/40",      bar: "bg-destructive" },
  { color: "border-primary/40",          bar: "bg-primary" },
];

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

const LS_KEY = "qualilab.projects.kanban.v1";
function loadState(): { projects: Project[]; columns: Column[] } {
  if (typeof window === "undefined") return { projects: SEED, columns: DEFAULT_COLUMNS };
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { projects: SEED, columns: DEFAULT_COLUMNS };
    const p = JSON.parse(raw);
    return {
      projects: Array.isArray(p.projects) && p.projects.length ? p.projects : SEED,
      columns: Array.isArray(p.columns) && p.columns.length ? p.columns : DEFAULT_COLUMNS,
    };
  } catch { return { projects: SEED, columns: DEFAULT_COLUMNS }; }
}

export const Route = createFileRoute("/_app/projects")({ component: ProjectsPage });

function ProjectsPage() {
  useAuditAccess("projects");
  const initial = useMemo(loadState, []);
  const [projects, setProjects] = useState<Project[]>(initial.projects);
  const [columns, setColumns] = useState<Column[]>(initial.columns);
  const [showForm, setShowForm] = useState(false);
  const [view, setView] = useState<"kanban" | "gantt">("kanban");
  const [selected, setSelected] = useState<Project | null>(null);
  const [title, setTitle] = useState("");
  const [responsible, setResponsible] = useState("");
  const [deadline, setDeadline] = useState("");

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ projects, columns })); } catch { /* noop */ }
  }, [projects, columns]);

  const moveProject = (id: string, status: Status) => {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
  };

  const create = () => {
    if (!title.trim()) return;
    setProjects([{
      id: "PRJ-" + String(projects.length + 1).padStart(3, "0"),
      title, description: "", status: columns[0]?.key ?? "backlog", responsible: responsible || "—",
      start: new Date().toISOString().slice(0, 10),
      deadline: deadline || null,
      progress: 0, subtasks: [],
    }, ...projects]);
    setTitle(""); setResponsible(""); setDeadline(""); setShowForm(false);
  };

  const addColumn = (label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `col-${Date.now().toString(36)}`;
    if (columns.some((c) => c.key === key)) return;
    const palette = PALETTE[columns.length % PALETTE.length];
    setColumns([...columns, { key, label: trimmed, ...palette }]);
  };
  const renameColumn = (key: string, label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    setColumns((prev) => prev.map((c) => (c.key === key ? { ...c, label: trimmed } : c)));
  };
  const removeColumn = (key: string) => {
    if (columns.length <= 1) return;
    const fallback = columns.find((c) => c.key !== key)!.key;
    setColumns((prev) => prev.filter((c) => c.key !== key));
    setProjects((prev) => prev.map((p) => (p.status === key ? { ...p, status: fallback } : p)));
  };

  return (
    <>
      <PageHeader
        title="Projetos"
        description="Gestão de projetos com Kanban (arraste e personalize colunas) e Gantt."
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
        <KanbanView
          projects={projects}
          columns={columns}
          onMove={moveProject}
          onOpen={setSelected}
          onAddColumn={addColumn}
          onRenameColumn={renameColumn}
          onRemoveColumn={removeColumn}
        />
      ) : (
        <GanttView projects={projects} columns={columns} onOpen={setSelected} />
      )}

      <ProjectDialog project={selected} columns={columns} onClose={() => setSelected(null)} />
    </>
  );
}

function KanbanView({
  projects, columns, onMove, onOpen, onAddColumn, onRenameColumn, onRemoveColumn,
}: {
  projects: Project[];
  columns: Column[];
  onMove: (id: string, s: Status) => void;
  onOpen: (p: Project) => void;
  onAddColumn: (label: string) => void;
  onRenameColumn: (key: string, label: string) => void;
  onRemoveColumn: (key: string) => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const [newCol, setNewCol] = useState("");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  };
  const handleDragEnd = () => { setDragId(null); setOverCol(null); };
  const handleDragOver = (e: React.DragEvent, key: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (overCol !== key) setOverCol(key);
  };
  const handleDrop = (e: React.DragEvent, key: string) => {
    e.preventDefault();
    const id = dragId ?? e.dataTransfer.getData("text/plain");
    if (id) onMove(id, key);
    handleDragEnd();
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {columns.map((col) => {
        const items = projects.filter((p) => p.status === col.key);
        const isOver = overCol === col.key;
        const isEditing = editingKey === col.key;
        return (
          <div
            key={col.key}
            onDragOver={(e) => handleDragOver(e, col.key)}
            onDragLeave={() => setOverCol((c) => (c === col.key ? null : c))}
            onDrop={(e) => handleDrop(e, col.key)}
            className={cn(
              "shrink-0 w-72 bg-muted/30 border-t-2 rounded-lg p-3 min-h-[260px] transition-colors",
              col.color,
              isOver && "bg-primary/5 ring-2 ring-primary/40",
            )}
          >
            <div className="flex items-center justify-between mb-3 gap-2">
              {isEditing ? (
                <div className="flex items-center gap-1 flex-1">
                  <Input
                    autoFocus
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { onRenameColumn(col.key, editLabel); setEditingKey(null); }
                      if (e.key === "Escape") setEditingKey(null);
                    }}
                    className="h-7 text-sm"
                  />
                  <button onClick={() => { onRenameColumn(col.key, editLabel); setEditingKey(null); }} className="text-success p-1"><Check className="size-3.5" /></button>
                  <button onClick={() => setEditingKey(null)} className="text-muted-foreground p-1"><X className="size-3.5" /></button>
                </div>
              ) : (
                <>
                  <h3 className="text-sm font-semibold flex items-center gap-1.5 flex-1 truncate">
                    {col.label}
                    <span className="text-xs font-normal text-muted-foreground">· {items.length}</span>
                  </h3>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
                    <button
                      onClick={() => { setEditingKey(col.key); setEditLabel(col.label); }}
                      className="p-1 text-muted-foreground hover:text-foreground"
                      title="Renomear"
                    ><Pencil className="size-3.5" /></button>
                    {columns.length > 1 && (
                      <button
                        onClick={() => removeColumnConfirm(col.label, () => onRemoveColumn(col.key))}
                        className="p-1 text-muted-foreground hover:text-destructive"
                        title="Excluir coluna"
                      ><Trash2 className="size-3.5" /></button>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="space-y-2 min-h-[40px]">
              {items.map((p) => (
                <div
                  key={p.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, p.id)}
                  onDragEnd={handleDragEnd}
                  onClick={() => onOpen(p)}
                  className={cn(
                    "group/card relative bg-card border border-border rounded-md p-3 shadow-sm hover:border-primary/40 transition-all cursor-grab active:cursor-grabbing",
                    dragId === p.id && "opacity-40",
                  )}
                >
                  <GripVertical className="absolute top-2 right-2 size-3.5 text-muted-foreground/40 opacity-0 group-hover/card:opacity-100" />
                  <div className="text-[11px] font-mono text-muted-foreground">{p.id}</div>
                  <div className="text-sm font-medium leading-tight mb-1 pr-4">{p.title}</div>
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
                </div>
              ))}
              {items.length === 0 && (
                <div className="text-[11px] text-muted-foreground italic text-center py-3 border border-dashed border-border rounded-md">
                  Arraste cards para cá
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* coluna para adicionar nova */}
      <div className="shrink-0 w-72">
        <div className="bg-muted/10 border border-dashed border-border rounded-lg p-3 flex flex-col gap-2">
          <Input
            value={newCol}
            onChange={(e) => setNewCol(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { onAddColumn(newCol); setNewCol(""); }
            }}
            placeholder="Nome da nova coluna"
            className="h-8 text-sm"
          />
          <Button size="sm" variant="outline" onClick={() => { onAddColumn(newCol); setNewCol(""); }}>
            <Plus className="size-3.5 mr-1" /> Adicionar coluna
          </Button>
        </div>
      </div>
    </div>
  );
}

function removeColumnConfirm(label: string, action: () => void) {
  if (typeof window === "undefined" || window.confirm(`Excluir a coluna "${label}"? Os cards serão movidos para a primeira coluna disponível.`)) {
    action();
  }
}

// ---------- Gantt ----------

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function addMonths(d: Date, n: number) { return new Date(d.getFullYear(), d.getMonth() + n, 1); }
function daysBetween(a: Date, b: Date) { return Math.round((b.getTime() - a.getTime()) / 86400000); }

function GanttView({ projects, columns, onOpen }: { projects: Project[]; columns: Column[]; onOpen: (p: Project) => void }) {
  const dated = projects.filter((p) => p.start && p.deadline);
  const undated = projects.filter((p) => !p.start || !p.deadline);
  const barFor = (status: string) => columns.find((c) => c.key === status)?.bar ?? "bg-muted-foreground/40";

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

          <div className="flex-1 overflow-x-auto">
            <div className="relative" style={{ minWidth: months.length * 80 }}>
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

              {dated.map((p) => {
                const start = new Date(p.start!);
                const end = new Date(p.deadline!);
                const offsetDays = Math.max(0, daysBetween(startMonth, start));
                const spanDays = Math.max(1, daysBetween(start, end));
                const left = (offsetDays / totalDays) * 100;
                const width = (spanDays / totalDays) * 100;
                return (
                  <div key={p.id} className="h-12 border-b border-border relative">
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
                        barFor(p.status),
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

        <div className="flex flex-wrap items-center gap-3 px-3 py-2 border-t border-border text-[11px] text-muted-foreground">
          {columns.map((c) => (
            <span key={c.key} className="inline-flex items-center gap-1.5">
              <span className={cn("inline-block size-2.5 rounded-sm", c.bar)} />
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
                  <span className={cn("inline-block size-2.5 rounded-sm", barFor(p.status))} />
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

function ProjectDialog({ project, columns, onClose }: { project: Project | null; columns: Column[]; onClose: () => void }) {
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
                <Field label="Status" value={columns.find((c) => c.key === project.status)?.label ?? project.status} />
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
