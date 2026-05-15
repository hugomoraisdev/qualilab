import { createFileRoute, useNavigate, useLocation, Outlet } from "@tanstack/react-router";
import { useState } from "react";
import { useAuditAccess } from "@/lib/audit";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { purchasesStore, type PurchaseRow } from "@/lib/purchases-store";
import { suppliersStore } from "@/lib/suppliers-store";
import { useTableStore } from "@/lib/table-store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/_app/purchases")({ component: PurchasesRoute });

function PurchasesRoute() {
  const location = useLocation();
  if (location.pathname !== "/purchases") return <Outlet />;
  return <PurchasesPage />;
}

function newId() {
  return crypto.randomUUID();
}

type Draft = { description: string; supplier_id: string; quantity: string; expected_at: string };
const emptyDraft = (): Draft => ({ description: "", supplier_id: "none", quantity: "1", expected_at: "" });

function PurchasesPage() {
  useAuditAccess("purchases");
  const purchasesRaw = useTableStore(purchasesStore);
  const suppliers = useTableStore(suppliersStore);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft());

  const supplierName = (id: string | null) =>
    suppliers.find((s) => s.id === id)?.name ?? "—";

  // Enriquece cada linha com o nome do fornecedor para que a busca textual
  // (e os filtros por coluna) funcionem digitando o nome do fornecedor.
  const purchases = purchasesRaw.map((p) => ({
    ...p,
    supplier_name: supplierName(p.supplier_id),
  }));

  const create = async () => {
    if (!draft.description.trim()) { toast.error("Informe o item ou serviço"); return; }
    const row: PurchaseRow = {
      id: newId(),
      code: null,
      description: draft.description.trim(),
      supplier_id: draft.supplier_id === "none" ? null : draft.supplier_id || null,
      quantity: Number(draft.quantity) || 1,
      unit: null,
      unit_price: null,
      total: null,
      expected_at: draft.expected_at || null,
      requested_at: new Date().toISOString().slice(0, 10),
      received_at: null,
      status: "solicitado",
      requester_id: null,
      notes: null,
    };
    await purchasesStore.upsert(row);
    toast.success("Solicitação criada");
    setOpen(false);
    setDraft(emptyDraft());
    navigate({ to: "/purchases/$id", params: { id: row.id } });
  };

  return (
    <>
      <PageHeader title="Processos de Compra" description="Solicitações, aprovação e inspeção de recebimento" />
      <DataTable
        data={purchases}
        searchKeys={["code", "description", "status", "supplier_id"]}
        newLabel="Nova solicitação"
        onNew={() => { setDraft(emptyDraft()); setOpen(true); }}
        onRowClick={(r) => navigate({ to: "/purchases/$id", params: { id: r.id } })}
        columns={[
          { key: "code", header: "Código", render: (r) => <span className="font-mono text-xs">{r.code ?? r.id.slice(0, 8)}</span> },
          { key: "supplier_id", header: "Fornecedor", accessor: (r) => supplierName(r.supplier_id), render: (r) => supplierName(r.supplier_id) },
          { key: "description", header: "Item / Serviço", render: (r) => <span className="font-medium">{r.description}</span> },
          { key: "total", header: "Valor", render: (r) => r.total != null ? `R$ ${Number(r.total).toFixed(2)}` : "—" },
          { key: "requested_at", header: "Solicitado" },
          { key: "expected_at", header: "Previsto", render: (r) => r.expected_at ?? "—" },
          { key: "status", header: "Status", render: (r) => <StatusBadge>{r.status}</StatusBadge> },
        ]}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Plus className="size-4" /> Nova solicitação de compra</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Item / Serviço *</Label>
              <Input placeholder="Descreva o item ou serviço" value={draft.description}
                onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Fornecedor</Label>
                <Select value={draft.supplier_id} onValueChange={(v) => setDraft((p) => ({ ...p, supplier_id: v }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Nenhum —</SelectItem>
                    {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Quantidade</Label>
                <Input type="number" min={1} value={draft.quantity}
                  onChange={(e) => setDraft((p) => ({ ...p, quantity: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Prazo previsto</Label>
              <Input type="date" value={draft.expected_at}
                onChange={(e) => setDraft((p) => ({ ...p, expected_at: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={create}>Criar solicitação</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
