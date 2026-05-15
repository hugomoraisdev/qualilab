import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuditAccess } from "@/lib/audit";
import { usePermission } from "@/lib/permissions";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { purchasesStore, type PurchaseRow } from "@/lib/purchases-store";
import { suppliersStore } from "@/lib/suppliers-store";
import {
  usePurchaseMeta, writePurchaseMeta, inspectionStatusLabel, inspectionStatusTone,
  type PurchaseCustomField, type PurchaseReceivingInspection,
} from "@/lib/purchase-meta-store";
import { useTableStore } from "@/lib/table-store";
import { ArrowLeft, Plus, Trash2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/purchases/$id")({ component: PurchaseDetailRoute });

// Guard de rota: valida autenticação e permissão ANTES de montar a tela
// de detalhe (e portanto antes de qualquer hook de listas/stores).
function PurchaseDetailRoute() {
  const { user, loading } = useAuth();
  const canView = usePermission("purchases");
  const { id } = Route.useParams();

  if (loading) {
    return <p className="text-sm text-muted-foreground p-4">Carregando…</p>;
  }
  if (!user) {
    return <Navigate to="/login" search={{ redirect: `/purchases/${id}` }} />;
  }
  if (!canView) {
    return (
      <div className="max-w-md mx-auto mt-12 text-center space-y-3">
        <ShieldAlert className="size-10 mx-auto text-destructive" />
        <h2 className="text-lg font-semibold">Acesso negado</h2>
        <p className="text-sm text-muted-foreground">
          Você não tem permissão para visualizar solicitações de compra.
        </p>
        <Link to="/purchases" className="inline-flex items-center text-sm text-primary hover:underline">
          <ArrowLeft className="size-4 mr-1" /> Voltar para Compras
        </Link>
      </div>
    );
  }

  return <PurchaseDetail id={id} />;
}

function PurchaseDetail({ id }: { id: string }) {
  useAuditAccess("purchases");
  const purchases = useTableStore(purchasesStore);
  const suppliers = useTableStore(suppliersStore);
  const { user } = useAuth();
  const p = purchases.find((x) => x.id === id);
  const { meta, refresh } = usePurchaseMeta(id);

  const [draft, setDraft] = useState<PurchaseRow | null>(null);
  useEffect(() => { if (p) setDraft(p); }, [p?.id]);

  // Custom fields
  const [cfLabel, setCfLabel] = useState("");
  const [cfValue, setCfValue] = useState("");

  // Receiving inspection
  const [insp, setInsp] = useState<PurchaseReceivingInspection>(meta.receiving_inspection);
  useEffect(() => { setInsp(meta.receiving_inspection); }, [meta.receiving_inspection.status, meta.receiving_inspection.inspected_at]);

  if (!p || !draft) {
    return (
      <>
        <Link to="/purchases" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="size-4 mr-1" /> Voltar
        </Link>
        <p className="text-sm text-muted-foreground">Solicitação não encontrada.</p>
      </>
    );
  }

  const supplierName = suppliers.find((s) => s.id === draft.supplier_id)?.name ?? "—";
  const saveBase = async () => {
    const total = (Number(draft.unit_price) || 0) * (Number(draft.quantity) || 0);
    await purchasesStore.upsert({ ...draft, total: total || draft.total });
    toast.success("Solicitação atualizada");
  };

  const addCf = async () => {
    if (!cfLabel.trim()) return;
    const cf: PurchaseCustomField = { id: crypto.randomUUID(), label: cfLabel.trim(), value: cfValue };
    await writePurchaseMeta(id, { ...meta, custom_fields: [...meta.custom_fields, cf] });
    setCfLabel(""); setCfValue("");
    refresh();
  };
  const updateCf = async (cfId: string, value: string) => {
    await writePurchaseMeta(id, { ...meta, custom_fields: meta.custom_fields.map((c) => c.id === cfId ? { ...c, value } : c) });
  };
  const removeCf = async (cfId: string) => {
    await writePurchaseMeta(id, { ...meta, custom_fields: meta.custom_fields.filter((c) => c.id !== cfId) });
    refresh();
  };

  const saveInspection = async () => {
    const next: PurchaseReceivingInspection = {
      ...insp,
      inspector_name: insp.inspector_name ?? user?.name ?? null,
      inspected_at: insp.inspected_at ?? new Date().toISOString().slice(0, 10),
    };
    await writePurchaseMeta(id, { ...meta, receiving_inspection: next });
    toast.success("Inspeção salva");
    refresh();
  };

  return (
    <>
      <Link to="/purchases" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="size-4 mr-1" /> Voltar
      </Link>
      <PageHeader
        title={draft.description}
        description={`${draft.code ?? draft.id.slice(0, 8)} · ${supplierName}`}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge tone={inspectionStatusTone(meta.receiving_inspection.status)}>
              {inspectionStatusLabel[meta.receiving_inspection.status]}
            </StatusBadge>
            <StatusBadge>{draft.status}</StatusBadge>
          </div>
        }
      />

      <Tabs defaultValue="geral" className="mt-2">
        <TabsList>
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="campos">Campos personalizados</TabsTrigger>
          <TabsTrigger value="recebimento">Inspeção de recebimento</TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="mt-4">
          <section className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><Label className="text-xs">Código</Label><Input value={draft.code ?? ""} onChange={(e) => setDraft({ ...draft, code: e.target.value })} /></div>
              <div><Label className="text-xs">Fornecedor</Label>
                <Select value={draft.supplier_id ?? ""} onValueChange={(v) => setDraft({ ...draft, supplier_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2"><Label className="text-xs">Descrição</Label><Textarea rows={2} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></div>
              <div><Label className="text-xs">Quantidade</Label><Input type="number" value={draft.quantity} onChange={(e) => setDraft({ ...draft, quantity: Number(e.target.value) })} /></div>
              <div><Label className="text-xs">Unidade</Label><Input value={draft.unit ?? ""} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} /></div>
              <div><Label className="text-xs">Preço unitário</Label><Input type="number" step="0.01" value={draft.unit_price ?? ""} onChange={(e) => setDraft({ ...draft, unit_price: Number(e.target.value) })} /></div>
              <div><Label className="text-xs">Total</Label><Input type="number" step="0.01" value={draft.total ?? ""} onChange={(e) => setDraft({ ...draft, total: Number(e.target.value) })} /></div>
              <div><Label className="text-xs">Solicitado em</Label><Input type="date" value={draft.requested_at} onChange={(e) => setDraft({ ...draft, requested_at: e.target.value })} /></div>
              <div><Label className="text-xs">Previsto</Label><Input type="date" value={draft.expected_at ?? ""} onChange={(e) => setDraft({ ...draft, expected_at: e.target.value })} /></div>
              <div><Label className="text-xs">Recebido</Label><Input type="date" value={draft.received_at ?? ""} onChange={(e) => setDraft({ ...draft, received_at: e.target.value })} /></div>
              <div><Label className="text-xs">Status</Label>
                <Select value={draft.status} onValueChange={(v) => setDraft({ ...draft, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solicitada">Solicitada</SelectItem>
                    <SelectItem value="em_cotacao">Em cotação</SelectItem>
                    <SelectItem value="aprovada">Aprovada</SelectItem>
                    <SelectItem value="recebida">Recebida</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2"><Label className="text-xs">Observações</Label><Textarea rows={2} value={draft.notes ?? ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></div>
            </div>
            <div className="mt-4 flex justify-end"><Button onClick={saveBase}>Salvar</Button></div>
          </section>
        </TabsContent>

        <TabsContent value="campos" className="mt-4">
          <section className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-semibold mb-3">Campos personalizados</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
              <Input placeholder="Rótulo (ex: Centro de custo)" value={cfLabel} onChange={(e) => setCfLabel(e.target.value)} />
              <Input placeholder="Valor" value={cfValue} onChange={(e) => setCfValue(e.target.value)} />
              <Button onClick={addCf}><Plus className="size-4 mr-1" />Adicionar</Button>
            </div>
            {meta.custom_fields.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum campo personalizado.</p>
            ) : (
              <Table>
                <TableHeader><TableRow><TableHead>Rótulo</TableHead><TableHead>Valor</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {meta.custom_fields.map((cf) => (
                    <TableRow key={cf.id}>
                      <TableCell className="text-sm font-medium">{cf.label}</TableCell>
                      <TableCell><Input defaultValue={cf.value} onBlur={(e) => updateCf(cf.id, e.target.value)} /></TableCell>
                      <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => removeCf(cf.id)}><Trash2 className="size-4 text-destructive" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </section>
        </TabsContent>

        <TabsContent value="recebimento" className="mt-4">
          <section className="bg-card border border-border rounded-lg p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-semibold">Inspeção de recebimento</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div><Label className="text-xs">Status</Label>
                <Select value={insp.status} onValueChange={(v) => setInsp({ ...insp, status: v as PurchaseReceivingInspection["status"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="aprovado">Aprovado</SelectItem>
                    <SelectItem value="aprovado_restricao">Aprovado c/ restrição</SelectItem>
                    <SelectItem value="reprovado">Reprovado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Data inspeção</Label><Input type="date" value={insp.inspected_at ?? ""} onChange={(e) => setInsp({ ...insp, inspected_at: e.target.value })} /></div>
              <div><Label className="text-xs">Inspetor</Label><Input value={insp.inspector_name ?? ""} onChange={(e) => setInsp({ ...insp, inspector_name: e.target.value })} /></div>
            </div>
            <div><Label className="text-xs">Observações</Label><Textarea rows={3} value={insp.observations ?? ""} onChange={(e) => setInsp({ ...insp, observations: e.target.value })} /></div>
            <div className="flex justify-end"><Button onClick={saveInspection}>Salvar inspeção</Button></div>
          </section>
        </TabsContent>
      </Tabs>
    </>
  );
}
