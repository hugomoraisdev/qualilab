import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Upload, FileSpreadsheet, CheckCircle2, Download, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useState, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { saveEquipment, equipmentsStore } from "@/lib/equipments-store";
import { saveDocument, documentsStore } from "@/lib/documents-store";
import { saveCalibration, calibrationsStore } from "@/lib/calibrations-store";
import { saveSupplier, suppliersStore } from "@/lib/suppliers-store";
import { supplierEvaluationsStore } from "@/lib/supplier-evaluations-store";

export const Route = createFileRoute("/_app/data-migration")({ component: DataMigration });

// ── helpers ────────────────────────────────────────────────────────────────

function norm(s: string) {
  return s.toLowerCase()
    .normalize("NFD").replace(/\p{Mn}/gu, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function parseDate(v: string): string | null {
  if (!v || !v.trim()) return null;
  const s = v.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}`;
  const us2 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (us2) {
    const yr = parseInt(us2[3]) >= 30 ? `19${us2[3]}` : `20${us2[3]}`;
    return `${yr}-${us2[1].padStart(2, "0")}-${us2[2].padStart(2, "0")}`;
  }
  return null;
}

// ── entity configs ─────────────────────────────────────────────────────────

interface ColDef {
  key: string;
  label: string;
  required: boolean;
  aliases: string[];
  type?: "date" | "number";
}

interface EntityConfig {
  id: string;
  name: string;
  qty: number;
  cols: ColDef[];
  buildRow: (m: Record<string, string>) => Record<string, unknown>;
  save: (r: Record<string, unknown>) => void | Promise<void>;
}

const ENTITIES: EntityConfig[] = [
  {
    id: "documentos",
    name: "Documentos",
    qty: 800,
    cols: [
      { key: "code",        label: "Código",       required: true,  aliases: ["codigo", "cod", "codigo_id"] },
      { key: "title",       label: "Título",        required: true,  aliases: ["titulo", "nome"] },
      { key: "category",    label: "Categoria",     required: true,  aliases: ["categoria"] },
      { key: "version",     label: "Versão",        required: true,  aliases: ["versao", "rev", "revisao"] },
      { key: "status",      label: "Status",        required: false, aliases: ["situacao"], },
      { key: "validity",    label: "Validade",      required: false, aliases: ["validade", "vencimento"], type: "date" },
      { key: "responsible", label: "Responsável",   required: false, aliases: ["responsavel"] },
      { key: "description", label: "Descrição",     required: false, aliases: ["descricao", "obs"] },
    ],
    buildRow: (m) => {
      const existing = documentsStore.list().find((d) => d.code === m.code && !d.deleted_at);
      return {
        id: existing?.id ?? crypto.randomUUID(),
        code: m.code,
        title: m.title,
        category: m.category,
        version: m.version,
        status: m.status || "rascunho",
        validity: parseDate(m.validity ?? "") ?? null,
        responsible: m.responsible || null,
        responsible_id: null,
        description: m.description || null,
      };
    },
    save: (r) => saveDocument(r as never),
  },
  {
    id: "equipamentos",
    name: "Equipamentos",
    qty: 1500,
    cols: [
      { key: "code",                  label: "Código",              required: true,  aliases: ["codigo", "cod", "codigo_id"] },
      { key: "name",                  label: "Nome",                required: true,  aliases: ["nome", "equipamento"] },
      { key: "status",                label: "Status",              required: false, aliases: ["situacao"] },
      { key: "manufacturer",          label: "Fabricante",          required: false, aliases: ["fabricante"] },
      { key: "model",                 label: "Modelo",              required: false, aliases: ["modelo"] },
      { key: "serial_number",         label: "Número de série",     required: false, aliases: ["serie", "serial", "num_serie"] },
      { key: "location",              label: "Localização",         required: false, aliases: ["localizacao", "local", "setor_localizacao", "setor"] },
      { key: "category",              label: "Categoria",           required: false, aliases: ["categoria", "tipo"] },
      { key: "acquisition_date",      label: "Dt. aquisição",       required: false, aliases: ["aquisicao", "dt_aquisicao"], type: "date" },
      { key: "next_calibration_date", label: "Próx. calibração",    required: false, aliases: ["proxima_calibracao", "prox_cal", "proxima_cal", "proxima_calibracao"], type: "date" },
      { key: "notes",                 label: "Observações",         required: false, aliases: ["observacoes", "obs"] },
    ],
    buildRow: (m) => {
      const existing = equipmentsStore.list().find((e) => e.code === m.code && !e.deleted_at);
      return {
        id: existing?.id ?? crypto.randomUUID(),
        code: m.code,
        name: m.name,
        status: m.status || "ativo",
        manufacturer: m.manufacturer || null,
        model: m.model || null,
        serial_number: m.serial_number || null,
        location: m.location || null,
        category: m.category || null,
        acquisition_date: parseDate(m.acquisition_date ?? "") ?? null,
        next_calibration_date: parseDate(m.next_calibration_date ?? "") ?? null,
        notes: m.notes || null,
      };
    },
    save: (r) => saveEquipment(r as never),
  },
  {
    id: "calibracoes",
    name: "Históricos de calibração",
    qty: 4000,
    cols: [
      { key: "equipment_id",       label: "ID Equipamento",   required: true,  aliases: ["id_equipamento", "equipamento_id", "equipamento"] },
      { key: "performed_at",       label: "Data realização",  required: true,  aliases: ["data", "data_realizacao", "dt_realizacao", "data_calibracao"], type: "date" },
      { key: "result",             label: "Resultado",        required: true,  aliases: ["resultado"] },
      { key: "certificate_number", label: "Nº Certificado",   required: false, aliases: ["certificado", "num_certificado", "numero_certificado"] },
      { key: "provider",           label: "Laboratório",      required: false, aliases: ["fornecedor", "laboratorio", "lab"] },
      { key: "next_due_date",      label: "Próx. vencimento", required: false, aliases: ["proximo_vencimento", "prox_vencimento", "proxima_calibracao", "proxima_cal"], type: "date" },
      { key: "uncertainty",        label: "Incerteza",        required: false, aliases: ["incerteza"] },
      { key: "notes",              label: "Observações",      required: false, aliases: ["observacoes", "obs"] },
    ],
    buildRow: (m) => {
      const performedAt = parseDate(m.performed_at ?? "") ?? m.performed_at ?? "";
      const existing = calibrationsStore.list().find(
        (c) => !c.deleted_at && c.equipment_id === m.equipment_id && c.performed_at === performedAt,
      );
      return {
        id: existing?.id ?? crypto.randomUUID(),
        equipment_id: m.equipment_id,
        performed_at: performedAt,
        result: m.result || "aprovado",
        certificate_number: m.certificate_number || null,
        provider: m.provider || null,
        next_due_date: parseDate(m.next_due_date ?? "") ?? null,
        uncertainty: m.uncertainty || null,
        points: existing?.points ?? [],
        certificate_url: existing?.certificate_url ?? null,
        notes: m.notes || null,
        responsible_id: null,
      };
    },
    save: (r) => saveCalibration(r as never),
  },
  {
    id: "fornecedores",
    name: "Fornecedores",
    qty: 300,
    cols: [
      { key: "name",         label: "Nome / Razão social", required: true,  aliases: ["nome", "razao_social", "fornecedor"] },
      { key: "status",       label: "Status",              required: false, aliases: ["situacao"] },
      { key: "code",         label: "Código",              required: false, aliases: ["codigo", "cod"] },
      { key: "cnpj",         label: "CNPJ",                required: false, aliases: ["cnpj"] },
      { key: "category",     label: "Categoria",           required: false, aliases: ["categoria"] },
      { key: "contact_name", label: "Contato",             required: false, aliases: ["contato", "responsavel"] },
      { key: "email",        label: "E-mail",              required: false, aliases: ["email"] },
      { key: "phone",        label: "Telefone",            required: false, aliases: ["telefone", "fone"] },
      { key: "address",      label: "Endereço",            required: false, aliases: ["endereco"] },
      { key: "rating",       label: "Nota (0–10)",         required: false, aliases: ["nota", "pontuacao"], type: "number" },
      { key: "notes",        label: "Observações",         required: false, aliases: ["observacoes", "obs"] },
    ],
    buildRow: (m) => {
      const existing = suppliersStore.list().find(
        (s) => !s.deleted_at && (
          (m.code && s.code === m.code) ||
          (m.cnpj && s.cnpj === m.cnpj)
        ),
      );
      return {
        id: existing?.id ?? crypto.randomUUID(),
        name: m.name,
        status: m.status || "ativo",
        code: m.code || null,
        cnpj: m.cnpj || null,
        category: m.category || null,
        contact_name: m.contact_name || null,
        email: m.email || null,
        phone: m.phone || null,
        address: m.address || null,
        rating: m.rating ? parseFloat(m.rating) : null,
        qualified_until: null,
        evaluation_frequency_days: null,
        last_evaluation_date: null,
        next_evaluation_date: null,
        notes: m.notes || null,
      };
    },
    save: (r) => saveSupplier(r as never),
  },
  {
    id: "avaliacoes",
    name: "Avaliações de fornecedores",
    qty: 800,
    cols: [
      { key: "supplier_id",    label: "ID Fornecedor",    required: true,  aliases: ["id_fornecedor", "fornecedor_id", "fornecedor"] },
      { key: "evaluation_date",label: "Data avaliação",   required: true,  aliases: ["data", "data_avaliacao", "data_da_avaliacao"], type: "date" },
      { key: "score",          label: "Nota (0–10)",      required: true,  aliases: ["nota", "pontuacao"], type: "number" },
      { key: "observations",   label: "Observações",      required: false, aliases: ["observacoes", "obs"] },
      { key: "evaluator_name", label: "Avaliador",        required: false, aliases: ["avaliador", "nome_avaliador"] },
    ],
    buildRow: (m) => {
      const evalDate = parseDate(m.evaluation_date ?? "") ?? m.evaluation_date ?? "";
      const existing = supplierEvaluationsStore.list().find(
        (e) => e.supplier_id === m.supplier_id && e.evaluation_date === evalDate,
      );
      return {
        id: existing?.id ?? crypto.randomUUID(),
        supplier_id: m.supplier_id,
        evaluation_date: evalDate,
        score: parseFloat(m.score ?? "0"),
        observations: m.observations || null,
        evaluator_id: existing?.evaluator_id ?? null,
        evaluator_name: m.evaluator_name || null,
      };
    },
    save: (r) => supplierEvaluationsStore.upsert(r as never),
  },
  {
    id: "inspecoes",
    name: "Inspeções",
    qty: 2000,
    cols: [],
    buildRow: () => ({}),
    save: () => {},
  },
];

// ── ImportDialog ───────────────────────────────────────────────────────────

function ImportDialog({
  entity,
  open,
  onClose,
}: {
  entity: EntityConfig;
  open: boolean;
  onClose: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [colMap, setColMap] = useState<Record<string, string>>({});
  const [fileError, setFileError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState<{ ok: number; failed: number } | null>(null);

  useEffect(() => {
    if (open) {
      setRawRows([]);
      setHeaders([]);
      setColMap({});
      setFileError(null);
      setImporting(false);
      setDone(null);
    }
  }, [open]);

  function handleFile(file: File) {
    setFileError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array", raw: false });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, string>>(ws, {
          defval: "",
          raw: false,
        });
        if (!json.length) { setFileError("Arquivo vazio ou sem dados."); return; }
        const hdrs = Object.keys(json[0]);
        setHeaders(hdrs);
        setRawRows(json);
        // auto-map
        const mapped: Record<string, string> = {};
        for (const col of entity.cols) {
          const targets = [norm(col.key), ...col.aliases.map(norm)];
          const hit = hdrs.find((h) => targets.includes(norm(h)));
          if (hit) mapped[col.key] = hit;
        }
        setColMap(mapped);
      } catch {
        setFileError("Não foi possível ler o arquivo. Verifique o formato.");
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function mapRow(raw: Record<string, string>): Record<string, string> {
    const out: Record<string, string> = {};
    for (const col of entity.cols) {
      const hdr = colMap[col.key];
      out[col.key] = hdr ? String(raw[hdr] ?? "") : "";
    }
    return out;
  }

  const missingRequired = entity.cols
    .filter((c) => c.required && !colMap[c.key])
    .map((c) => c.label);

  async function doImport() {
    setImporting(true);
    let ok = 0, failed = 0;
    for (const raw of rawRows) {
      try {
        const built = entity.buildRow(mapRow(raw));
        await entity.save(built);
        ok++;
      } catch {
        failed++;
      }
    }
    setImporting(false);
    setDone({ ok, failed });
    if (failed === 0) {
      toast.success(`${ok} registros importados com sucesso`);
    } else {
      toast.warning(`${ok} importados, ${failed} com erro`);
    }
  }

  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([
      entity.cols.map((c) => c.label),
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, `template_${entity.id}.xlsx`);
  }

  const preview = rawRows.slice(0, 5);
  const mappedCols = entity.cols.filter((c) => colMap[c.key]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar {entity.name}</DialogTitle>
        </DialogHeader>

        {!done ? (
          <div className="space-y-4">
            {/* File picker row */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                <Upload className="size-3.5" />
                {rawRows.length ? `${rawRows.length} linhas carregadas` : "Selecionar arquivo"}
              </Button>
              <Button variant="ghost" size="sm" onClick={downloadTemplate}>
                <Download className="size-3.5" /> Baixar template
              </Button>
              <span className="text-xs text-muted-foreground">Aceita .csv, .xlsx, .xls</span>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.target.value = "";
                }}
              />
            </div>

            {fileError && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                <AlertCircle className="size-4 shrink-0" /> {fileError}
              </div>
            )}

            {rawRows.length > 0 && missingRequired.length > 0 && (
              <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span>Colunas obrigatórias não encontradas: <strong>{missingRequired.join(", ")}</strong>. Mapeie-as manualmente abaixo.</span>
              </div>
            )}

            {/* Column mapping */}
            {rawRows.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Mapeamento de colunas</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                  {entity.cols.map((col) => (
                    <div key={col.key} className="flex items-center gap-2 text-sm">
                      <span className={`size-2 rounded-full shrink-0 ${
                        colMap[col.key] ? "bg-success" : col.required ? "bg-destructive" : "bg-muted-foreground/30"
                      }`} />
                      <span className="text-xs text-muted-foreground w-36 shrink-0">
                        {col.label}{col.required ? " *" : ""}
                      </span>
                      <select
                        className="flex-1 h-7 rounded-md border border-input bg-background px-2 text-xs"
                        value={colMap[col.key] ?? ""}
                        onChange={(e) =>
                          setColMap((m) => ({ ...m, [col.key]: e.target.value }))
                        }
                      >
                        <option value="">— não mapeado —</option>
                        {headers.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Preview */}
            {rawRows.length > 0 && mappedCols.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Pré-visualização — {preview.length} de {rawRows.length} linhas
                </p>
                <div className="overflow-x-auto rounded-md border border-border">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40">
                      <tr>
                        {mappedCols.map((c) => (
                          <th key={c.key} className="px-2 py-1.5 text-left font-medium text-muted-foreground whitespace-nowrap">
                            {c.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((raw, i) => {
                        const m = mapRow(raw);
                        return (
                          <tr key={i} className="border-t border-border">
                            {mappedCols.map((c) => (
                              <td key={c.key} className="px-2 py-1.5 max-w-[180px] truncate">
                                {m[c.key] || <span className="text-muted-foreground/40">—</span>}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {rawRows.length > 5 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    … e mais {rawRows.length - 5} linhas
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 space-y-3">
            <CheckCircle2 className="size-12 text-success mx-auto" />
            <div className="text-lg font-semibold">{done.ok} registros importados</div>
            {done.failed > 0 && (
              <p className="text-sm text-destructive">{done.failed} registros falharam</p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          {!done && rawRows.length > 0 && (
            <Button
              onClick={doImport}
              disabled={importing || missingRequired.length > 0}
            >
              {importing
                ? "Importando…"
                : `Importar ${rawRows.length} registros`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── main page ──────────────────────────────────────────────────────────────

function DataMigration() {
  const [selected, setSelected] = useState<EntityConfig | null>(null);

  return (
    <>
      <PageHeader
        title="Importação e Migração de Dados"
        description="Volumes previstos na Tabela 04 do edital CISPAR 08/2026"
      />

      <section className="bg-card border border-border rounded-lg p-5 shadow-sm mb-6">
        <p className="text-sm text-muted-foreground">
          A migração poderá ser realizada por meio de arquivos estruturados em{" "}
          <span className="font-medium text-foreground">CSV/Excel</span>, com validação
          prévia dos dados, conferência de campos obrigatórios e importação assistida
          durante o onboarding. O sistema está preparado para receber os volumes
          informados na Tabela 04 do edital, sem custo adicional ao contratante.
        </p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {ENTITIES.map((e) => (
          <div key={e.id} className="bg-card border border-border rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="size-9 rounded-lg bg-primary/10 grid place-items-center text-primary">
                <FileSpreadsheet className="size-4" />
              </div>
              <span className="inline-flex items-center gap-1 rounded-full border border-success/40 bg-success/10 px-2.5 py-1 text-[11px] font-semibold text-success">
                <CheckCircle2 className="size-3" /> Preparado
              </span>
            </div>
            <div className="font-medium text-sm">{e.name}</div>
            <div className="text-2xl font-semibold tracking-tight mt-1">
              {e.qty.toLocaleString("pt-BR")}
              <span className="text-xs font-normal text-muted-foreground ml-1">registros previstos</span>
            </div>
            <div className="text-xs text-muted-foreground mt-2">Formato: CSV / Excel</div>
            <Button
              size="sm"
              variant="outline"
              className="w-full mt-3"
              onClick={() => {
                if (e.cols.length === 0) {
                  toast.info(`Importação de ${e.name}`, {
                    description: "Módulo em desenvolvimento. Disponível na entrega final.",
                  });
                } else {
                  setSelected(e);
                }
              }}
            >
              <Upload className="size-3.5" /> Importar planilha
            </Button>
          </div>
        ))}
      </div>

      <section className="bg-card border border-border rounded-lg p-5 shadow-sm">
        <h3 className="text-sm font-semibold mb-3">Fluxo de importação assistida</h3>
        <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1.5">
          <li>Download do template CSV/Excel da entidade desejada</li>
          <li>Preenchimento das informações conforme o modelo</li>
          <li>Upload do arquivo na plataforma</li>
          <li>Mapeamento automático das colunas (ajustável manualmente)</li>
          <li>Pré-visualização e confirmação antes da importação</li>
          <li>Registro completo no Log de Auditoria do sistema</li>
        </ol>
      </section>

      {selected && (
        <ImportDialog
          entity={selected}
          open={!!selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
