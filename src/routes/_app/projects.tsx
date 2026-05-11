import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Calendar, Users } from "lucide-react";
import { cn } from "@/lib/utils";

type Status = "backlog" | "doing" | "review" | "done";
interface Project {
  id: string; title: string; description: string; status: Status;
  responsible: string; deadline: string; progress: number;
  subtasks: { id: string; title: string; done: boolean }[];
}

const SEED: Project[] = [
  { id: "PRJ-001", title: "Implantação do QualiLab", description: "Migração de planilhas para o sistema", status: "doing", responsible: "Carla Administradora", deadline: "2026-08-30", progress: 55, subtasks: [
    { id: "s1", title: "Levantamento de processos", done: true },
    { id: "s2", title: "Treinamento da equipe", done: true },
    { id: "s3", title: "Migração de dados", done: false },
    { id: "s4", title: "Auditoria de aceitação", done: false },
  ]},
  { id: "PRJ-002", title: "Acreditação INMETRO 2026", description: "Preparação para auditoria de manutenção", status: "doing", responsible: "Roberto Gestor", deadline: "2026-11-20", progress: 30, subtasks: [
    { id: "s1", title: "Revisão de POPs", done: true },
    { id: "s2", title: "Auditoria interna", done: false },
    { id: "s3", title: "Análise crítica pela direção", done: false },
  ]},
  { id: "PRJ-003", title: "Modernização de equipamentos", description: "Substituição de balanças e pHmetros", status: "backlog", responsible: "Mariana Técnica", deadline: "2027-03-15", progress: 5, subtasks: [
    { id: "s1", title: "Cotação", done: false },
    { id: "s2", title: "Aquisição", done: false },
  ]},
  { id: "PRJ-004", title: "Validação de novo método de pH", description: "Validação conforme DOQ-CGCRE", status: "review", responsible: "Mariana Técnica", deadline: "2026-06-10", progress: 85, subtasks: [
    { id: "s1", title: "Plano de validação", done: true },
    { id: "s2", title: "Execução", done: true },
    { id: "s3", title: "Relatório final", done: false },
  ]},
  { id: "PRJ-005", title: "Digitalização de registros 2020-2024", description: "Backup e indexação de registros físicos", status: "done", responsible: "Carla Administradora", deadline: "2026-03-30", progress: 100, subtasks: [
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

export const Route = createFileRoute("/_app/projects")({ component: ProjectsPage });

function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>(SEED);
  const [showForm, setShowForm] = useState(false);
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
      deadline: deadline || new Date().toISOString().slice(0, 10),
      progress: 0, subtasks: [],
    }, ...projects]);
    setTitle(""); setResponsible(""); setDeadline(""); setShowForm(false);
  };

  return (
    <>
      <PageHeader
        title="Projetos"
        description="Gestão de projetos com Kanban e subatividades. Visão Gantt como evolução."
        actions={<Button onClick={() => setShowForm((v) => !v)}><Plus className="size-4" /> Novo projeto</Button>}
      />

      {showForm && (
        <div className="bg-card border border-border rounded-lg p-5 shadow-sm mb-6 grid grid-cols-1 lg:grid-cols-4 gap-3 items-end">
          <div className="lg:col-span-2"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título do projeto *" /></div>
          <Input value={responsible} onChange={(e) => setResponsible(e.target.value)} placeholder="Responsável" />
          <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          <div className="lg:col-span-4 flex justify-end gap-2"><Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button><Button onClick={create}>Criar projeto</Button></div>
        </div>
      )}

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
                  <div key={p.id} className="bg-card border border-border rounded-md p-3 shadow-sm">
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
                      <span className="flex items-center gap-1"><Calendar className="size-3" />{p.deadline}</span>
                    </div>
                    <div className="flex gap-1 mt-2">
                      {COLUMNS.filter((c) => c.key !== p.status).map((c) => (
                        <button key={c.key} onClick={() => moveProject(p.id, c.key)} className="text-[10px] px-1.5 py-0.5 rounded border border-border hover:bg-accent">
                          → {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
