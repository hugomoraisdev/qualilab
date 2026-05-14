import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { actionPlansStore, ORIGIN_TYPE_LABEL } from "@/lib/action-plans-store";
import { profilesStore, profileName } from "@/lib/profiles-store";
import { useTableStore } from "@/lib/table-store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/_app/action-plans")({ component: APPage });

function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function APPage() {
  const actionPlans = useTableStore(actionPlansStore);
  const profiles = useTableStore(profilesStore);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({
    description: "",
    responsible_id: "",
    deadline: "",
    priority: "media",
    origin_type: "manual",
  });

  const create = async () => {
    if (!draft.description.trim()) {
      toast.error("Informe a descrição da ação");
      return;
    }
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
      notes: null,
    });
    toast.success("Plano de ação criado");
    setOpen(false);
    setDraft({ description: "", responsible_id: "", deadline: "", priority: "media", origin_type: "manual" });
  };

  return (
    <>
      <PageHeader title="Planos de Ação" description="Ações vinculadas a ocorrências, riscos, auditorias, fornecedores e calibrações" />
      <DataTable
        data={actionPlans}
        searchKeys={["id", "origin_type", "description", "responsible_id", "status", "priority"]}
        newLabel="Novo plano"
        onNew={() => setOpen(true)}
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Plus className="size-4" /> Novo plano de ação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Descrição da ação *</Label>
              <Input
                placeholder="Descreva a ação a ser executada"
                value={draft.description}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Responsável</Label>
                <Select value={draft.responsible_id} onValueChange={(v) => setDraft((d) => ({ ...d, responsible_id: v }))}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Prazo</Label>
                <Input
                  type="date"
                  value={draft.deadline}
                  onChange={(e) => setDraft((d) => ({ ...d, deadline: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Prioridade</Label>
                <Select value={draft.priority} onValueChange={(v) => setDraft((d) => ({ ...d, priority: v }))}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
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
                <Select value={draft.origin_type} onValueChange={(v) => setDraft((d) => ({ ...d, origin_type: v }))}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ORIGIN_TYPE_LABEL).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={create}>Criar plano</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
