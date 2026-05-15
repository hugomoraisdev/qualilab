import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuditAccess } from "@/lib/audit";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { equipmentsStore, type EquipmentRow } from "@/lib/equipments-store";
import { useTableStore } from "@/lib/table-store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/_app/equipments")({ component: EqPage });

function newId() {
  return `EQ-${Date.now().toString(36).toUpperCase()}`;
}

type Draft = { code: string; name: string; category: string; manufacturer: string; model: string; location: string; status: string };
const emptyDraft = (): Draft => ({ code: "", name: "", category: "", manufacturer: "", model: "", location: "", status: "ativo" });

function EqPage() {
  useAuditAccess("equipments");
  const equipments = useTableStore(equipmentsStore);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft());

  const create = async () => {
    if (!draft.code.trim() || !draft.name.trim()) { toast.error("Informe o código e o nome do equipamento"); return; }
    const row: EquipmentRow = {
      id: newId(),
      code: draft.code.trim(),
      name: draft.name.trim(),
      category: draft.category.trim() || null,
      manufacturer: draft.manufacturer.trim() || null,
      model: draft.model.trim() || null,
      location: draft.location.trim() || null,
      status: draft.status,
      serial_number: null,
      acquisition_date: null,
      responsible_id: null,
      next_calibration_date: null,
      notes: null,
    };
    await equipmentsStore.upsert(row);
    toast.success("Equipamento cadastrado");
    setOpen(false);
    setDraft(emptyDraft());
    navigate({ to: "/equipments/$id", params: { id: row.id } });
  };

  return (
    <>
      <PageHeader title="Equipamentos" description="Cadastro completo, calibração, manutenção e rastreabilidade" />
      <DataTable
        data={equipments}
        searchKeys={["code", "name", "category", "manufacturer", "model", "location", "status"]}
        newLabel="Novo equipamento"
        exportName="equipamentos"
        onNew={() => { setDraft(emptyDraft()); setOpen(true); }}
        onRowClick={(r) => navigate({ to: "/equipments/$id", params: { id: r.id } })}
        columns={[
          { key: "code", header: "Código/ID", render: (r) => <span className="font-mono text-xs">{r.code}</span> },
          { key: "name", header: "Equipamento", render: (r) => <span className="font-medium">{r.name}</span> },
          { key: "category", header: "Tipo", render: (r) => r.category ?? "—" },
          { key: "manufacturer", header: "Fabricante", render: (r) => r.manufacturer ?? "—" },
          { key: "model", header: "Modelo", render: (r) => r.model ?? "—" },
          { key: "location", header: "Setor/Localização", render: (r) => r.location ?? "—" },
          { key: "next_calibration_date", header: "Próxima cal.", render: (r) => r.next_calibration_date ?? "—" },
          { key: "status", header: "Status", render: (r) => <StatusBadge>{r.status}</StatusBadge> },
        ]}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Plus className="size-4" /> Novo equipamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Código *</Label>
                <Input placeholder="Ex: EQ-001" value={draft.code}
                  onChange={(e) => setDraft((p) => ({ ...p, code: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Nome *</Label>
                <Input placeholder="Nome do equipamento" value={draft.name}
                  onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo / Categoria</Label>
                <Input placeholder="Ex: Balança" value={draft.category}
                  onChange={(e) => setDraft((p) => ({ ...p, category: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Fabricante</Label>
                <Input placeholder="Ex: Mettler Toledo" value={draft.manufacturer}
                  onChange={(e) => setDraft((p) => ({ ...p, manufacturer: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Modelo</Label>
                <Input value={draft.model}
                  onChange={(e) => setDraft((p) => ({ ...p, model: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Setor / Localização</Label>
                <Input placeholder="Ex: Lab Qualidade" value={draft.location}
                  onChange={(e) => setDraft((p) => ({ ...p, location: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={draft.status} onValueChange={(v) => setDraft((p) => ({ ...p, status: v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                  <SelectItem value="em_manutencao">Em manutenção</SelectItem>
                  <SelectItem value="descartado">Descartado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={create}>Cadastrar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
