import { createFileRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAuditAccess } from "@/lib/audit";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { documentsStore, saveDocument, type DocumentRow, type DocumentClassification } from "@/lib/documents-store";
import { useTableStore } from "@/lib/table-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_FOLDERS,
  DOCUMENT_PROCESSES,
  DOCUMENT_SECTORS,
} from "@/lib/document-taxonomy";
import { setDocumentTaxonomy, useAllDocumentMeta, setCustomFields } from "@/lib/document-meta-store";
import { useCustomFields } from "@/lib/custom-fields-store";
import {
  CustomFieldsRenderer,
  validateRequired,
  type CustomValuesMap,
} from "@/components/CustomFieldsRenderer";

export const Route = createFileRoute("/_app/documents")({
  component: DocumentsPage,
});

function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

type EnrichedDocumentRow = DocumentRow & {
  _body_text: string;
  _custom_values: string;
  _external_text: string;
};

const FREE = "__livre__";

/** Select com opções pré-definidas + alternativa "Outro / digitar manualmente". */
function TaxonomySelect({
  id,
  value,
  options,
  placeholder,
  onChange,
}: {
  id: string;
  value: string;
  options: readonly string[];
  placeholder: string;
  onChange: (v: string) => void;
}) {
  const isPreset = !value || options.includes(value);
  const [free, setFree] = useState(!isPreset);
  return (
    <div className="space-y-1.5">
      <Select
        value={free ? FREE : value || undefined}
        onValueChange={(v) => {
          if (v === FREE) {
            setFree(true);
            onChange("");
          } else {
            setFree(false);
            onChange(v);
          }
        }}
      >
        <SelectTrigger id={id}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
          <SelectItem value={FREE}>Outro / digitar manualmente</SelectItem>
        </SelectContent>
      </Select>
      {free && (
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Digite…" />
      )}
    </div>
  );
}

function NewDocumentDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const customFields = useCustomFields("documents");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    code: "",
    title: "",
    category: "Procedimento",
    version: "1.0",
    validity: "",
    responsible: user?.name ?? "",
    folder: "",
    sector: "",
    process: "",
    file_url: "",
    description: "",
    classification: "" as DocumentClassification | "",
  });
  const [customValues, setCustomValues] = useState<CustomValuesMap>({});

  const reset = () => {
    setForm({
      code: "",
      title: "",
      category: "Procedimento",
      version: "1.0",
      validity: "",
      responsible: user?.name ?? "",
      folder: "",
      sector: "",
      process: "",
      file_url: "",
      description: "",
      classification: "",
    });
    setCustomValues({});
  };

  const submit = async () => {
    if (!form.code.trim() || !form.title.trim()) {
      toast.error("Código e título são obrigatórios");
      return;
    }
    const missing = validateRequired(customFields, customValues);
    if (missing.length > 0) {
      toast.error("Campos personalizados obrigatórios", { description: missing.join(", ") });
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
        responsible_id: user?.id ?? null,
        file_url: form.file_url.trim() || null,
        description: form.description.trim() || null,
        classification: (form.classification as DocumentClassification) || null,
        created_at: now,
        updated_at: now,
      };
      await saveDocument(row);
      // Taxonomia + campos personalizados via metadados estendidos
      await setDocumentTaxonomy(row.id, {
        folder: form.folder.trim() || null,
        sector: form.sector.trim() || null,
        process: form.process.trim() || null,
      });
      if (Object.keys(customValues).length > 0) {
        await setCustomFields(row.id, customValues);
      }
      toast.success("Documento cadastrado", { description: `${row.code} · v${row.version}` });
      onOpenChange(false);
      reset();
      navigate({ to: "/documents/$id", params: { id: row.id } });
    } catch (err) {
      toast.error("Falha ao cadastrar. Verifique os dados e tente novamente.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo documento do SGQ</DialogTitle>
          <DialogDescription>
            Cadastre o documento na versão inicial. Use “Nova revisão” no detalhe para preservar
            versões antigas no histórico.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="doc-code">Código *</Label>
            <Input
              id="doc-code"
              placeholder="ex.: PR-001"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="doc-version">Versão</Label>
            <Input
              id="doc-version"
              placeholder="1.0"
              value={form.version}
              onChange={(e) => setForm({ ...form, version: e.target.value })}
            />
          </div>
          <div className="col-span-2">
            <Label htmlFor="doc-title">Título *</Label>
            <Input
              id="doc-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="doc-cat">Categoria</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger id="doc-cat">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="doc-valid">Validade</Label>
            <Input
              id="doc-valid"
              type="date"
              value={form.validity}
              onChange={(e) => setForm({ ...form, validity: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="doc-folder">Pasta / local</Label>
            <TaxonomySelect
              id="doc-folder"
              value={form.folder}
              options={DOCUMENT_FOLDERS}
              placeholder="Selecione…"
              onChange={(v) => setForm((f) => ({ ...f, folder: v }))}
            />
          </div>
          <div>
            <Label htmlFor="doc-sector">Setor responsável</Label>
            <TaxonomySelect
              id="doc-sector"
              value={form.sector}
              options={DOCUMENT_SECTORS}
              placeholder="Selecione…"
              onChange={(v) => setForm((f) => ({ ...f, sector: v }))}
            />
          </div>
          <div className="col-span-2">
            <Label htmlFor="doc-process">Processo vinculado</Label>
            <TaxonomySelect
              id="doc-process"
              value={form.process}
              options={DOCUMENT_PROCESSES}
              placeholder="Selecione…"
              onChange={(v) => setForm((f) => ({ ...f, process: v }))}
            />
          </div>
          <div className="col-span-2">
            <Label htmlFor="doc-resp">Responsável</Label>
            <Input
              id="doc-resp"
              value={form.responsible}
              onChange={(e) => setForm({ ...form, responsible: e.target.value })}
            />
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
            <Input
              id="doc-file"
              placeholder="https://…/doc.pdf"
              value={form.file_url.startsWith("data:") ? "" : form.file_url}
              onChange={(e) => setForm({ ...form, file_url: e.target.value })}
            />
            {form.file_url.startsWith("data:") && (
              <div className="text-xs text-muted-foreground">
                Arquivo carregado localmente ({Math.round(form.file_url.length / 1024)} KB).
              </div>
            )}
          </div>
          <div className="col-span-2">
            <Label htmlFor="doc-desc">Descrição</Label>
            <Textarea
              id="doc-desc"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="doc-classification">Classificação</Label>
            <Select
              value={form.classification || "__none"}
              onValueChange={(v) => setForm({ ...form, classification: v === "__none" ? "" : v as DocumentClassification })}
            >
              <SelectTrigger id="doc-classification">
                <SelectValue placeholder="Selecione…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Não classificado</SelectItem>
                <SelectItem value="publico">Público</SelectItem>
                <SelectItem value="interno">Interno</SelectItem>
                <SelectItem value="restrito">Restrito</SelectItem>
                <SelectItem value="confidencial">Confidencial</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {customFields.filter((f) => f.active).length > 0 && (
            <div className="col-span-2 border-t border-border pt-3">
              <div className="text-sm font-semibold mb-2">Campos personalizados</div>
              <CustomFieldsRenderer
                fields={customFields}
                values={customValues}
                onChange={(k, v) => setCustomValues((prev) => ({ ...prev, [k]: v }))}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" />} Cadastrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Filtros agregados aplicados por taxonomia + status. */
function FilterBar({
  values,
  setValue,
  documents,
}: {
  values: Record<string, string>;
  setValue: (k: string, v: string) => void;
  documents: DocumentRow[];
}) {
  const allResp = useMemo(
    () => Array.from(new Set(documents.map((d) => d.responsible).filter(Boolean) as string[])),
    [documents],
  );
  const ALL = "__all__";

  const renderSel = (k: string, label: string, opts: readonly string[]) => (
    <div className="min-w-[150px]">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      <Select
        value={values[k] || ALL}
        onValueChange={(v) => setValue(k, v === ALL ? "" : v)}
      >
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder="Todos" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todos</SelectItem>
          {opts.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="bg-card border border-border rounded-lg p-3 mb-3 flex flex-wrap gap-3 items-end">
      {renderSel("category", "Categoria", DOCUMENT_CATEGORIES)}
      {renderSel("folder", "Pasta", DOCUMENT_FOLDERS)}
      {renderSel("sector", "Setor", DOCUMENT_SECTORS)}
      {renderSel("process", "Processo", DOCUMENT_PROCESSES)}
      {renderSel("status", "Status", ["rascunho", "em_revisao", "aprovado", "obsoleto"])}
      {renderSel("responsible", "Responsável", allResp)}
      {Object.values(values).some((v) => v) && (
        <Button size="sm" variant="ghost" onClick={() => Object.keys(values).forEach((k) => setValue(k, ""))}>
          Limpar
        </Button>
      )}
    </div>
  );
}

function DocumentsPage() {
  useAuditAccess("documents");
  const { user } = useAuth();
  const documents = useTableStore(documentsStore);
  const ids = useMemo(() => documents.map((d) => d.id), [documents]);
  const metaMap = useAllDocumentMeta(ids);
  const customFields = useCustomFields("documents");
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"docs" | "master">("docs");
  const [filters, setFilters] = useState<Record<string, string>>({});

  if (location.pathname !== "/documents") {
    return <Outlet />;
  }

  const isReadOnly = user?.role === "consulta";

  const filtered = useMemo(() => {
    return documents.filter((d) => {
      // Perfil consulta só vê documentos aprovados
      if (isReadOnly && d.status !== "aprovado") return false;
      const m = metaMap[d.id];
      if (filters.category && d.category !== filters.category) return false;
      if (filters.folder && (m?.folder ?? "") !== filters.folder) return false;
      if (filters.sector && (m?.sector ?? "") !== filters.sector) return false;
      if (filters.process && (m?.process ?? "") !== filters.process) return false;
      if (filters.status && d.status !== filters.status) return false;
      if (filters.responsible && d.responsible !== filters.responsible) return false;
      return true;
    });
  }, [documents, metaMap, filters, isReadOnly]);

  // Colunas básicas (visão "docs") e estendidas (Lista Mestra).
  const baseColumns = [
    {
      key: "code",
      header: "Código",
      render: (r: DocumentRow) => <span className="font-mono text-xs">{r.code}</span>,
    },
    {
      key: "title",
      header: "Título",
      render: (r: DocumentRow) => <span className="font-medium">{r.title}</span>,
    },
    { key: "category", header: "Categoria" },
    {
      key: "version",
      header: "Versão",
      render: (r: DocumentRow) => <span className="font-mono text-xs">v{r.version}</span>,
    },
    { key: "validity", header: "Validade" },
    { key: "responsible", header: "Responsável" },
    {
      key: "status",
      header: "Status",
      render: (r: DocumentRow) => <StatusBadge>{r.status}</StatusBadge>,
    },
  ];

  const masterColumns = [
    baseColumns[0],
    baseColumns[1],
    baseColumns[2],
    {
      key: "folder",
      header: "Pasta",
      accessor: (r: DocumentRow) => metaMap[r.id]?.folder ?? "",
      render: (r: DocumentRow) => metaMap[r.id]?.folder ?? "—",
    },
    {
      key: "sector",
      header: "Setor",
      accessor: (r: DocumentRow) => metaMap[r.id]?.sector ?? "",
      render: (r: DocumentRow) => metaMap[r.id]?.sector ?? "—",
    },
    {
      key: "process",
      header: "Processo",
      accessor: (r: DocumentRow) => metaMap[r.id]?.process ?? "",
      render: (r: DocumentRow) => metaMap[r.id]?.process ?? "—",
    },
    baseColumns[3],
    baseColumns[4],
    baseColumns[5],
    baseColumns[6],
    // Campos personalizados ativos como colunas extras
    ...customFields
      .filter((f) => f.active)
      .map((f) => ({
        key: `cf:${f.key}`,
        header: f.name,
        accessor: (r: DocumentRow) => {
          const v = metaMap[r.id]?.custom_fields?.[f.key];
          if (v === null || v === undefined) return "";
          if (Array.isArray(v)) return v.join(", ");
          if (typeof v === "boolean") return v ? "Sim" : "Não";
          return String(v);
        },
        render: (r: DocumentRow) => {
          const v = metaMap[r.id]?.custom_fields?.[f.key];
          if (v === null || v === undefined || v === "") return "—";
          if (Array.isArray(v)) return v.join(", ");
          if (typeof v === "boolean") return v ? "Sim" : "Não";
          if (typeof v === "string" && v.startsWith("data:")) return "📎 anexo";
          return String(v);
        },
      })),
  ];

  const columns = view === "master" ? masterColumns : baseColumns;

  const enriched = useMemo<EnrichedDocumentRow[]>(() => {
    return filtered.map((d) => {
      const m = metaMap[d.id];
      const bodyText = stripHtml(m?.body);
      const customValues = m
        ? Object.values(m.custom_fields)
            .map((v) => {
              if (v === null || v === undefined) return "";
              if (Array.isArray(v)) return v.join(" ");
              if (typeof v === "boolean") return v ? "sim" : "não";
              return String(v);
            })
            .join(" ")
        : "";
      const externalText = [m?.external_issuer, m?.external_ref].filter(Boolean).join(" ");
      return { ...d, _body_text: bodyText, _custom_values: customValues, _external_text: externalText };
    });
  }, [filtered, metaMap]);

  return (
    <>
      <PageHeader
        title="Documentos"
        description="Controle documental com pasta, setor, processo, versão, validade e aprovação"
      />

      <div className="flex items-center gap-1 mb-3 border-b border-border">
        <button
          onClick={() => setView("docs")}
          className={`px-3 py-1.5 text-sm border-b-2 transition-colors ${
            view === "docs"
              ? "border-primary text-foreground font-medium"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Documentos
        </button>
        <button
          onClick={() => setView("master")}
          className={`px-3 py-1.5 text-sm border-b-2 transition-colors ${
            view === "master"
              ? "border-primary text-foreground font-medium"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Lista Mestra
        </button>
      </div>

      <FilterBar
        values={filters}
        setValue={(k, v) => setFilters((f) => ({ ...f, [k]: v }))}
        documents={documents}
      />

      <DataTable
        data={enriched}
        searchKeys={["code", "title", "category", "status", "responsible", "_body_text", "_custom_values", "_external_text"]}
        newLabel="Novo documento"
        onNew={() => setOpen(true)}
        onRowClick={(r) => navigate({ to: "/documents/$id", params: { id: r.id } })}
        exportName={view === "master" ? "lista_mestra" : "documentos"}
        columns={columns}
      />
      <NewDocumentDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
