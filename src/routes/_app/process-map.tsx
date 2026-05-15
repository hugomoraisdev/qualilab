import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAuditAccess } from "@/lib/audit";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Workflow, AlertTriangle, FileText, Plus, Search, Target, Activity } from "lucide-react";
import { useProcesses, upsertProcess, emptyProcess } from "@/lib/processes-store";
import { useTableStore } from "@/lib/table-store";
import { profilesStore, profileName } from "@/lib/profiles-store";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/process-map")({ component: PMapRoute });

function PMapRoute() {
  const location = useLocation();
  if (location.pathname !== "/process-map") return <Outlet />;
  return <PMapPage />;
}

function PMapPage() {
  useAuditAccess("process_map");
  const { list, loading } = useProcesses();
  const profiles = useTableStore(profilesStore);
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState({ code: "", name: "", area: "", objective: "", owner_id: "" });
  const [q, setQ] = useState("");
  const [areaFilter, setAreaFilter] = useState("");

  const areas = useMemo(() => Array.from(new Set(list.map((p) => p.area).filter(Boolean))) as string[], [list]);

  const filtered = useMemo(() => {
    return list.filter((p) => {
      if (q && !`${p.code} ${p.name} ${p.objective ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
      if (areaFilter && p.area !== areaFilter) return false;
      return true;
    });
  }, [list, q, areaFilter]);

  const create = async () => {
    if (!draft.name.trim()) { toast.error("Informe o nome do processo"); return; }
    const p = emptyProcess();
    p.code = draft.code || p.id;
    p.name = draft.name;
    p.area = draft.area || null;
    p.objective = draft.objective || null;
    p.owner_id = draft.owner_id || null;
    await upsertProcess(p, { action: "created", detail: p.name });
    toast.success("Processo cadastrado");
    setShowForm(false);
    setDraft({ code: "", name: "", area: "", objective: "", owner_id: "" });
  };

  return (
    <>
      <PageHeader
        title="Mapa de Processos"
        description="Visão sistêmica: processos, donos, entradas/saídas, etapas e vínculos com riscos, indicadores e documentos"
        actions={<Button onClick={() => setShowForm((v) => !v)}><Plus className="size-4" /> Novo processo</Button>}
      />

      <div className="bg-card border border-border rounded-lg p-3 mb-5 flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[220px] relative">
          <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por código, nome ou objetivo" className="h-8 pl-8 text-xs" />
        </div>
        <select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)} className="h-8 rounded-md border border-input bg-background px-2 text-xs">
          <option value="">Todas as áreas</option>
          {areas.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        {(q || areaFilter) && <Button variant="ghost" size="sm" onClick={() => { setQ(""); setAreaFilter(""); }}>Limpar</Button>}
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-lg p-5 shadow-sm mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-end">
          <div className="space-y-1.5"><Label className="text-xs">Código</Label><Input value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} placeholder="PRC-001" /></div>
          <div className="lg:col-span-2 space-y-1.5"><Label className="text-xs">Nome *</Label><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Ex: Análise de Amostras" /></div>
          <div className="space-y-1.5"><Label className="text-xs">Área / Setor</Label><Input value={draft.area} onChange={(e) => setDraft({ ...draft, area: e.target.value })} placeholder="Ex: Laboratório" /></div>
          <div className="space-y-1.5">
            <Label className="text-xs">Responsável (dono)</Label>
            <select value={draft.owner_id} onChange={(e) => setDraft({ ...draft, owner_id: e.target.value })} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="">— Selecione —</option>
              {profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="lg:col-span-3 space-y-1.5"><Label className="text-xs">Objetivo</Label><Input value={draft.objective} onChange={(e) => setDraft({ ...draft, objective: e.target.value })} placeholder="Para que serve este processo" /></div>
          <div className="lg:col-span-3 flex justify-end gap-2"><Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button><Button onClick={create}>Criar processo</Button></div>
        </div>
      )}

      {loading ? (
        <div className="text-sm text-muted-foreground">Carregando…</div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-lg p-8 text-center text-sm text-muted-foreground">
          {list.length === 0 ? "Nenhum processo cadastrado ainda. Clique em Novo processo." : "Nenhum processo corresponde aos filtros."}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <Link key={p.id} to="/process-map/$id" params={{ id: p.id }} className="bg-card border border-border rounded-lg p-5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all">
              <div className="flex items-start justify-between mb-2">
                <div className="size-9 rounded-lg bg-primary/10 grid place-items-center text-primary"><Workflow className="size-4" /></div>
                <span className="text-xs font-mono text-muted-foreground">{p.code}</span>
              </div>
              <h3 className="font-semibold text-base">{p.name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{p.objective || "—"}</p>
              <div className="mt-3 space-y-1.5 text-xs">
                <div><span className="text-muted-foreground">Dono:</span> {profileName(p.owner_id)}</div>
                <div><span className="text-muted-foreground">Área:</span> {p.area ?? "—"}</div>
                <div><span className="text-muted-foreground">Etapas:</span> {p.steps.length} · <span className="text-muted-foreground">Entradas:</span> {p.inputs.length} · <span className="text-muted-foreground">Saídas:</span> {p.outputs.length}</div>
              </div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border text-xs">
                <span className="flex items-center gap-1 text-warning-foreground"><AlertTriangle className="size-3.5 text-warning" /> {p.linked_risk_ids.length}</span>
                <span className="flex items-center gap-1 text-muted-foreground"><FileText className="size-3.5" /> {p.linked_document_ids.length}</span>
                <span className="flex items-center gap-1 text-muted-foreground"><Target className="size-3.5" /> {p.linked_indicator_ids.length}</span>
                <span className="flex items-center gap-1 text-muted-foreground"><Activity className="size-3.5" /> {p.linked_action_ids.length}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
