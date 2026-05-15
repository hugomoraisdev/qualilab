import { createFileRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuditAccess } from "@/lib/audit";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import {
  suppliersStore,
  ratingToClassification,
  getEvaluationStatus,
  evaluationStatusLabel,
  type SupplierRow,
} from "@/lib/suppliers-store";
import { supplierPortalStore, countPendingSubmissions } from "@/lib/supplier-portal-store";
import { useTableStore } from "@/lib/table-store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Inbox, Plus } from "lucide-react";

export const Route = createFileRoute("/_app/suppliers")({ component: SupPage });

function newId() {
  return `SUP-${Date.now().toString(36).toUpperCase()}`;
}

type Draft = { name: string; cnpj: string; category: string; contact_name: string; email: string; phone: string; status: string };
const emptyDraft = (): Draft => ({ name: "", cnpj: "", category: "", contact_name: "", email: "", phone: "", status: "ativo" });

function SupPage() {
  useAuditAccess("suppliers");
  const location = useLocation();
  const suppliers = useTableStore(suppliersStore);
  useTableStore(supplierPortalStore);
  const navigate = useNavigate();
  const pending = countPendingSubmissions();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft());

  if (location.pathname !== "/suppliers") return <Outlet />;

  const create = async () => {
    if (!draft.name.trim()) { toast.error("Informe a razão social"); return; }
    const row: SupplierRow = {
      id: newId(),
      code: null,
      name: draft.name.trim(),
      cnpj: draft.cnpj.trim() || null,
      category: draft.category.trim() || null,
      contact_name: draft.contact_name.trim() || null,
      email: draft.email.trim() || null,
      phone: draft.phone.trim() || null,
      address: null,
      rating: null,
      status: draft.status,
      qualified_until: null,
      notes: null,
      evaluation_frequency_days: null,
      last_evaluation_date: null,
      next_evaluation_date: null,
    };
    await suppliersStore.upsert(row);
    toast.success("Fornecedor cadastrado");
    setOpen(false);
    setDraft(emptyDraft());
    navigate({ to: "/suppliers/$id", params: { id: row.id } });
  };

  return (
    <>
      <PageHeader
        title="Fornecedores"
        description="Cadastro, qualificação e avaliação de desempenho"
        actions={
          <span
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium"
            title="Submissões recebidas pelo portal público aguardando análise"
          >
            <Inbox className="size-4" />
            Portal: {pending} pendente{pending === 1 ? "" : "s"}
            {pending > 0 && (
              <span className="ml-1 inline-flex size-2 rounded-full bg-warning" />
            )}
          </span>
        }
      />
      <DataTable
        data={suppliers}
        searchKeys={["code", "name", "cnpj", "category", "contact_name", "status"]}
        newLabel="Novo fornecedor"
        onNew={() => { setDraft(emptyDraft()); setOpen(true); }}
        onRowClick={(r) => navigate({ to: "/suppliers/$id", params: { id: r.id } })}
        columns={[
          { key: "code", header: "Código", render: (r) => <span className="font-mono text-xs">{r.code ?? r.id.slice(0, 8)}</span> },
          { key: "name", header: "Razão social", render: (r) => <span className="font-medium">{r.name}</span> },
          { key: "cnpj", header: "CNPJ", render: (r) => <span className="font-mono text-xs">{r.cnpj ?? "—"}</span> },
          { key: "category", header: "Categoria", render: (r) => r.category ?? "—" },
          { key: "contact_name", header: "Contato", render: (r) => r.contact_name ?? "—" },
          { key: "rating", header: "Classificação", render: (r) => <StatusBadge>{ratingToClassification(r.rating)}</StatusBadge> },
          {
            key: "next_evaluation_date",
            header: "Próxima avaliação",
            render: (r) => {
              const st = getEvaluationStatus(r);
              const tone =
                st === "em_dia" ? "success" :
                st === "a_vencer" ? "warning" :
                st === "vencida" ? "destructive" : "muted";
              return (
                <div className="flex flex-col gap-0.5">
                  <StatusBadge tone={tone}>{evaluationStatusLabel(st)}</StatusBadge>
                  <span className="text-[11px] text-muted-foreground">{r.next_evaluation_date ?? "—"}</span>
                </div>
              );
            },
          },
          { key: "status", header: "Status", render: (r) => <StatusBadge>{r.status}</StatusBadge> },
        ]}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Plus className="size-4" /> Novo fornecedor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Razão social *</Label>
              <Input placeholder="Nome da empresa" value={draft.name}
                onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">CNPJ</Label>
                <Input placeholder="00.000.000/0001-00" value={draft.cnpj}
                  onChange={(e) => setDraft((p) => ({ ...p, cnpj: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Categoria</Label>
                <Input placeholder="Ex: Matéria-prima" value={draft.category}
                  onChange={(e) => setDraft((p) => ({ ...p, category: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Contato</Label>
                <Input placeholder="Nome do responsável" value={draft.contact_name}
                  onChange={(e) => setDraft((p) => ({ ...p, contact_name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Telefone</Label>
                <Input placeholder="(00) 00000-0000" value={draft.phone}
                  onChange={(e) => setDraft((p) => ({ ...p, phone: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">E-mail</Label>
                <Input type="email" placeholder="contato@empresa.com" value={draft.email}
                  onChange={(e) => setDraft((p) => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={draft.status} onValueChange={(v) => setDraft((p) => ({ ...p, status: v }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                    <SelectItem value="suspenso">Suspenso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
