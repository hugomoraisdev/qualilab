import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuditAccess } from "@/lib/audit";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { actionPlansStore, ORIGIN_TYPE_LABEL, type ActionPlanRow } from "@/lib/action-plans-store";
import { profilesStore, profileName } from "@/lib/profiles-store";
import { useTableStore } from "@/lib/table-store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_app/action-plans")({ component: APPage });

function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

type Draft = {
  description: string;
  responsible_id: string;
  deadline: string;
  priority: string;
  origin_type: string;
  status: string;
  progress: string;
  notes: string;
};

const emptyDraft = (): Draft => ({
  description: "", responsible_id: "", deadline: "",
  priority: "media", origin_type: "manual",
  status: "pendente", progress: "0", notes: "",
});

function draftFromRow(r: ActionPlanRow): Draft {
  return {
    description: r.description,
    responsible_id: r.responsible_id ?? "",
    deadline: r.deadline ?? "",
    priority: r.priority,
    origin_type: r.origin_type,
    status: r.status,
    progress: String(r.progress),
    notes: r.notes ?? "",
  };
}

type Profile = { id: string; name: string };

function DraftFields({ d, set, profiles }: { d: Draft; set: (fn: (prev: Draft) => Draft) => void; profiles: Profile[] }) {
  return (
    <>
      <div className="space-y-1.5">
        <Label className="text-xs">Descrição da ação *</Label>
        <Textarea rows={2} placeholder="Descreva a ação" value={d.description}
          onChange={(e) => set((p) => ({ ...p, description: e.target.value }))} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Responsável</Label>
          <Select value={d.responsible_id || "none"} onValueChange={(v) => set((p) => ({ ...p, responsible_id: v === "none" ? "" : v }))}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— Nenhum —</SelectItem>
              {profiles.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Prazo</Label>
          <Input type="date" value={d.deadline} onChange={(e) => set((p) => ({ ...p, deadline: e.target.value }))} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Prioridade</Label>
          <Select value={d.priority} onValueChange={(v) => set((p) => ({ ...p, priority: v }))}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="baixa">Baixa</SelectItem>
              <SelectItem value="media">Média</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="critica">Crítica</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Origem</Label>
          <Select value={d.origin_type} onValueChange={(v) => set((p) => ({ ...p, origin_type: v }))}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(ORIGIN_TYPE_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
    </>
  );
}

function APPage() {
  useAuditAccess("action_plans");
  const actionPlans = useTableStore(actionPlansStore);
  const profiles = useTableStore(profilesStore);
  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<ActionPlanRow | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft());

  const openCreate = () => { setDraft(emptyDraft()); setCreateOpen(true); };
  const openEdit = (r: ActionPlanRow) => { setDraft(draftFromRow(r)); setEditRow(r); };

  const create = async () => {
    if (!draft.description.trim()) { toast.error("Informe a descrição da ação"); return; }
    await actionPlansStore.upsert({
      id: newId("AP"),
      code: null,
      origin_type: draft.origin_type,
      origin_id: null,
      description: draft.description.trim(),
      responsible_id: draft.responsible_id || null,
      deadline: draft.deadline || null,
      priority: draft.priority,
      status: "pendente",
      progress: 0,
      notes: draft.notes.trim() || null,
    });
    toast.success("Plano de ação criado");
    setCreateOpen(false);
  };

  const save = async () => {
    if (!editRow || !draft.description.trim()) return;
    await actionPlansStore.upsert({
      ...editRow,
      description: draft.description.trim(),
      responsible_id: draft.responsible_id || null,
      deadline: draft.deadline || null,
      priority: draft.priority,
      origin_type: draft.origin_type,
      status: draft.status,
      progress: Math.min(100, Math.max(0, Number(draft.progress) || 0)),
      notes: draft.notes.trim() || null,
    });
    toast.success("Plano atualizado");
    setEditRow(null);
  };

  const remove = async (r: ActionPlanRow) => {
    await actionPlansStore.remove(r.id);
    toast.success("Plano excluído");
    setEditRow(null);
  };

  return (
    <>
      <PageHeader title="Planos de Ação" description="Ações vinculadas a ocorrências, riscos, auditorias, fornecedores e calibrações" />
      <DataTable
        data={actionPlans}
        searchKeys={["id", "origin_type", "description", "responsible_id", "status", "priority"]}
        newLabel="Novo plano"
        onNew={openCreate}
        onRowClick={openEdit}
        columns={[
          { key: "id", header: "Código", render: (r) => <span className="font-mono text-xs">{r.id}</span> },
          { key: "origin_type", header: "Origem", render: (r) => <span>{ORIGIN_TYPE_LABEL[r.origin_type] ?? r.origin_type}</span> },
          { key: "description", header: "Ação", render: (r) => <span className="max-w-md truncate inline-block">{r.description}</span> },
          { key: "responsible_id", header: "Responsável", render: (r) => <span>{profileName(r.responsible_id)}</span> },
          { key: "deadline", header: "Prazo" },
          { key: "priority", header: "Prioridade", render: (r) => <StatusBadge>{r.priority}</StatusBadge> },
          { key: "progress", header: "Progresso", render: (r) => (
            <div className="flex items-center gap-2 min-w-[120px]">
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${r.progress}%` }} />
              </div>
              <span className="text-xs font-mono">{r.progress}%</span>
            </div>
          )},
          { key: "status", header: "Status", render: (r) => <StatusBadge>{r.status}</StatusBadge> },
        ]}
      />

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Plus className="size-4" /> Novo plano de ação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <DraftFields d={draft} set={setDraft} profiles={profiles} />
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button onClick={create}>Criar plano</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editRow} onOpenChange={(o) => !o && setEditRow(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Pencil className="size-4" /> Editar plano</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <DraftFields d={draft} set={setDraft} profiles={profiles} />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={draft.status} onValueChange={(v) => setDraft((p) => ({ ...p, status: v }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="em_andamento">Em andamento</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Progresso (%)</Label>
                <Input type="number" min={0} max={100} value={draft.progress}
                  onChange={(e) => setDraft((p) => ({ ...p, progress: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Observações</Label>
              <Textarea rows={2} value={draft.notes}
                onChange={(e) => setDraft((p) => ({ ...p, notes: e.target.value }))} />
            </div>
            <div className="flex justify-between gap-2 pt-1">
              <Button variant="destructive" size="sm" onClick={() => editRow && remove(editRow)}>
                <Trash2 className="size-4" /> Excluir
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditRow(null)}>Cancelar</Button>
                <Button onClick={save}>Salvar</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
