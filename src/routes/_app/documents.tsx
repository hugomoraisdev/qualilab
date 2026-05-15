import { createFileRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuditAccess } from "@/lib/audit";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { documentsStore, saveDocument, type DocumentRow } from "@/lib/documents-store";
import { useTableStore } from "@/lib/table-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_app/documents")({
  component: DocumentsPage,
});

const CATEGORIES = [
  "Política", "Manual", "Procedimento", "Instrução de trabalho",
  "Formulário", "Registro", "Norma externa",
];

function NewDocumentDialog({
  open, onOpenChange,
}: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    code: "", title: "", category: "Procedimento", version: "1.0",
    validity: "", responsible: user?.name ?? "", file_url: "", description: "",
  });

  const reset = () => setForm({
    code: "", title: "", category: "Procedimento", version: "1.0",
    validity: "", responsible: user?.name ?? "", file_url: "", description: "",
  });

  const submit = async () => {
    if (!form.code.trim() || !form.title.trim()) {
      toast.error("Código e título são obrigatórios");
      return;
    }
    setBusy(true);
    try {
      const now = new Date().toISOString();
      const row: DocumentRow = {
        id: crypto.randomUUID(),
        code: form.code.trim(),
        title: form.title.trim(),
        category: form.category,
        version: form.version.trim() || "1.0",
        status: "rascunho",
        validity: form.validity || null,
        responsible: form.responsible.trim() || null,
        file_url: form.file_url.trim() || null,
        description: form.description.trim() || null,
        created_at: now,
        updated_at: now,
      };
      await saveDocument(row);
      toast.success("Documento cadastrado", { description: `${row.code} · v${row.version}` });
      onOpenChange(false);
      reset();
      navigate({ to: "/documents/$id", params: { id: row.id } });
    } catch (err) {
      toast.error("Falha ao cadastrar", { description: String((err as Error)?.message ?? err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo documento do SGQ</DialogTitle>
          <DialogDescription>
            Cadastre o documento na versão inicial. Use “Nova revisão” no detalhe
            para preservar versões antigas no histórico.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="doc-code">Código *</Label>
            <Input id="doc-code" placeholder="ex.: PR-001" value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="doc-version">Versão</Label>
            <Input id="doc-version" placeholder="1.0" value={form.version}
              onChange={(e) => setForm({ ...form, version: e.target.value })} />
          </div>
          <div className="col-span-2">
            <Label htmlFor="doc-title">Título *</Label>
            <Input id="doc-title" value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="doc-cat">Categoria</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger id="doc-cat"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="doc-valid">Validade</Label>
            <Input id="doc-valid" type="date" value={form.validity}
              onChange={(e) => setForm({ ...form, validity: e.target.value })} />
          </div>
          <div className="col-span-2">
            <Label htmlFor="doc-resp">Responsável</Label>
            <Input id="doc-resp" value={form.responsible}
              onChange={(e) => setForm({ ...form, responsible: e.target.value })} />
          </div>
          <div className="col-span-2 space-y-2">
            <Label htmlFor="doc-file-upload">Arquivo (opcional)</Label>
            <Input
              id="doc-file-upload"
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 10 * 1024 * 1024) {
                  toast.error("Arquivo muito grande", { description: "Limite de 10 MB." });
                  e.target.value = "";
                  return;
                }
                const reader = new FileReader();
                reader.onload = () => {
                  setForm((f) => ({ ...f, file_url: String(reader.result ?? "") }));
                  toast.success("Arquivo anexado", { description: file.name });
                };
                reader.onerror = () => toast.error("Falha ao ler arquivo");
                reader.readAsDataURL(file);
              }}
            />
            <div className="text-xs text-muted-foreground">ou informe uma URL pública abaixo</div>
            <Input id="doc-file" placeholder="https://…/doc.pdf" value={form.file_url.startsWith("data:") ? "" : form.file_url}
              onChange={(e) => setForm({ ...form, file_url: e.target.value })} />
            {form.file_url.startsWith("data:") && (
              <div className="text-xs text-muted-foreground">Arquivo carregado localmente ({Math.round(form.file_url.length / 1024)} KB).</div>
            )}
          </div>
          <div className="col-span-2">
            <Label htmlFor="doc-desc">Descrição</Label>
            <Textarea id="doc-desc" rows={2} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancelar</Button>
          <Button onClick={submit} disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" />} Cadastrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DocumentsPage() {
  useAuditAccess("documents");
  const documents = useTableStore(documentsStore);
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  if (location.pathname !== "/documents") {
    return <Outlet />;
  }

  return (
    <>
      <PageHeader title="Documentos" description="Controle documental com versão, validade e aprovação" />
      <DataTable
        data={documents}
        searchKeys={["code", "title", "category", "status", "responsible"]}
        newLabel="Novo documento"
        onNew={() => setOpen(true)}
        onRowClick={(r) => navigate({ to: "/documents/$id", params: { id: r.id } })}
        columns={[
          { key: "code", header: "Código", render: (r) => <span className="font-mono text-xs">{r.code}</span> },
          { key: "title", header: "Título", render: (r) => <span className="font-medium">{r.title}</span> },
          { key: "category", header: "Categoria" },
          { key: "version", header: "Versão", render: (r) => <span className="font-mono text-xs">v{r.version}</span> },
          { key: "validity", header: "Validade" },
          { key: "responsible", header: "Responsável" },
          { key: "status", header: "Status", render: (r) => <StatusBadge>{r.status}</StatusBadge> },
        ]}
      />
      <NewDocumentDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
