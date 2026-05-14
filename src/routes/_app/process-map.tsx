import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { processMapsStore, saveProcessMap, deleteProcessMap, type ProcessMapRow } from "@/lib/process-map-store";
import { useTableStore } from "@/lib/table-store";
import { Workflow, AlertTriangle, FileText, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/process-map")({ component: PMapPage });

function ProcessDialog({
  process,
  onClose,
}: {
  process: ProcessMapRow | null;
  onClose: () => void;
}) {
  const isNew = !process;
  const [form, setForm] = useState<Partial<ProcessMapRow>>(
    process ?? {
      id: `PROC-${Date.now().toString(36).toUpperCase()}`,
      status: "Ativo",
      risks: 0,
      docs: 0,
    },
  );

  const set = (k: keyof ProcessMapRow, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name?.trim()) return;
    try {
      await saveProcessMap(form as ProcessMapRow);
      toast.success(isNew ? "Processo criado" : "Processo atualizado");
      onClose();
    } catch {
      toast.error("Falha ao salvar processo");
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isNew ? "Novo processo" : "Editar processo"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label>Nome *</Label>
            <Input value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Objetivo</Label>
            <Textarea value={form.objective ?? ""} onChange={(e) => set("objective", e.target.value)} rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label>Responsável</Label>
            <Input value={form.owner ?? ""} onChange={(e) => set("owner", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Entradas</Label>
              <Input value={form.inputs ?? ""} onChange={(e) => set("inputs", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Saídas</Label>
              <Input value={form.outputs ?? ""} onChange={(e) => set("outputs", e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!form.name?.trim()}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PMapPage() {
  const processMaps = useTableStore(processMapsStore);
  const [dialog, setDialog] = useState<{ open: boolean; process: ProcessMapRow | null }>({
    open: false,
    process: null,
  });

  const openNew = () => setDialog({ open: true, process: null });
  const openEdit = (p: ProcessMapRow) => setDialog({ open: true, process: p });
  const closeDialog = () => setDialog({ open: false, process: null });

  const handleDelete = async (p: ProcessMapRow) => {
    if (!confirm(`Excluir o processo "${p.name}"?`)) return;
    try {
      await deleteProcessMap(p.id);
      toast.success("Processo excluído");
    } catch {
      toast.error("Falha ao excluir processo");
    }
  };

  return (
    <>
      <PageHeader
        title="Mapa de Processos"
        description="Visão sistêmica dos processos do laboratório"
        actions={
          <Button size="sm" onClick={openNew}>
            <Plus className="size-4 mr-1" /> Novo processo
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {processMaps.map((p) => (
          <div
            key={p.id}
            className="bg-card border border-border rounded-lg p-5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="size-9 rounded-lg bg-primary/10 grid place-items-center text-primary">
                <Workflow className="size-4" />
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEdit(p)}
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                >
                  <Pencil className="size-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(p)}
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
            <h3 className="font-semibold text-base">{p.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{p.objective}</p>
            <div className="mt-3 space-y-1.5 text-xs">
              <div><span className="text-muted-foreground">Dono:</span> {p.owner ?? "—"}</div>
              <div><span className="text-muted-foreground">Entradas:</span> {p.inputs ?? "—"}</div>
              <div><span className="text-muted-foreground">Saídas:</span> {p.outputs ?? "—"}</div>
            </div>
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-border text-xs">
              <Link to="/risks" className="flex items-center gap-1 text-warning-foreground hover:underline">
                <AlertTriangle className="size-3.5 text-warning" /> {p.risks} riscos
              </Link>
              <Link to="/documents" className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
                <FileText className="size-3.5" /> {p.docs} documentos
              </Link>
            </div>
          </div>
        ))}
        {processMaps.length === 0 && (
          <div className="col-span-full text-center py-16 text-sm text-muted-foreground">
            Nenhum processo cadastrado ainda.{" "}
            <button onClick={openNew} className="text-primary hover:underline">
              Criar o primeiro processo
            </button>
          </div>
        )}
      </div>

      {dialog.open && <ProcessDialog process={dialog.process} onClose={closeDialog} />}
    </>
  );
}
