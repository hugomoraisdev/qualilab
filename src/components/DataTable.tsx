import { useMemo, useState, type ReactNode } from "react";
import { Search, Plus, Eye, FileSpreadsheet, Columns3, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  className?: string;
  /** Acessor para filtros e exportação. Padrão: row[key] */
  accessor?: (row: T) => string | number | null | undefined;
}

function downloadCsv<T extends Record<string, any>>(rows: T[], columns: Column<T>[], filename: string) {
  const header = columns.map((c) => `"${c.header.replace(/"/g, '""')}"`).join(",");
  const body = rows
    .map((r) =>
      columns
        .map((c) => {
          const v = c.accessor ? c.accessor(r) : r[c.key];
          const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
          return `"${s.replace(/"/g, '""')}"`;
        })
        .join(","),
    )
    .join("\n");
  const blob = new Blob(["\uFEFF" + header + "\n" + body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function DataTable<T extends Record<string, any>>({
  data, columns, searchKeys, newLabel = "Novo cadastro", onRowClick, emptyHint, exportName, hideNew, onNew,
}: {
  data: T[];
  columns: Column<T>[];
  searchKeys: (keyof T)[];
  newLabel?: string;
  onRowClick?: (row: T) => void;
  emptyHint?: string;
  exportName?: string;
  hideNew?: boolean;
  onNew?: () => void;
}) {
  const [q, setQ] = useState("");
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [detailRow, setDetailRow] = useState<T | null>(null);

  const visibleColumns = useMemo(() => columns.filter((c) => !hidden[c.key]), [columns, hidden]);

  const filtered = useMemo(() => {
    let rows = data;
    if (q.trim()) {
      const term = q.toLowerCase();
      // Busca em searchKeys (usando accessor da coluna correspondente quando existir)
      // E TAMBÉM em todas as colunas que têm accessor — assim campos como
      // "Responsável", "Fornecedor", "Auditor" (que armazenam id mas exibem nome
      // via accessor) ficam pesquisáveis pelo nome automaticamente.
      const accessors: Array<(r: T) => string | number | null | undefined> = [];
      for (const k of searchKeys) {
        const col = columns.find((c) => c.key === k);
        accessors.push(col?.accessor ? col.accessor : (r: T) => r[k]);
      }
      for (const c of columns) {
        if (c.accessor && !searchKeys.includes(c.key as keyof T)) {
          accessors.push(c.accessor);
        }
      }
      rows = rows.filter((r) =>
        accessors.some((acc) => String(acc(r) ?? "").toLowerCase().includes(term))
      );
    }
    for (const [key, raw] of Object.entries(filters)) {
      const term = raw.trim().toLowerCase();
      if (!term) continue;
      const col = columns.find((c) => c.key === key);
      rows = rows.filter((r) => {
        const v = col?.accessor ? col.accessor(r) : r[key];
        return String(v ?? "").toLowerCase().includes(term);
      });
    }
    return rows;
  }, [q, data, searchKeys, filters, columns]);

  const activeFilters = Object.entries(filters).filter(([, v]) => v.trim());

  return (
    <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-border">
        <div className="relative flex-1 min-w-[180px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline" title="Filtros por coluna">
                <Filter className="size-4" /> Filtros
                {activeFilters.length > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] h-4 min-w-4 px-1">
                    {activeFilters.length}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="text-xs font-semibold mb-2">Filtros personalizados</div>
              <div className="space-y-2 max-h-72 overflow-auto pr-1">
                {columns.map((c) => (
                  <div key={c.key} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-28 shrink-0 truncate">{c.header}</span>
                    <Input
                      className="h-8 text-xs"
                      placeholder="contém..."
                      value={filters[c.key] ?? ""}
                      onChange={(e) => setFilters((f) => ({ ...f, [c.key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
              {activeFilters.length > 0 && (
                <Button size="sm" variant="ghost" className="mt-2 w-full" onClick={() => setFilters({})}>
                  <X className="size-3.5" /> Limpar filtros
                </Button>
              )}
            </PopoverContent>
          </Popover>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" title="Colunas exibidas">
                <Columns3 className="size-4" /> Colunas
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Colunas exibidas</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {columns.map((c) => (
                <DropdownMenuCheckboxItem
                  key={c.key}
                  checked={!hidden[c.key]}
                  onCheckedChange={(v) => setHidden((h) => ({ ...h, [c.key]: !v }))}
                  onSelect={(e) => e.preventDefault()}
                >
                  {c.header}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const name = (exportName ?? "qualilab") + "_" + new Date().toISOString().slice(0, 10) + ".csv";
              downloadCsv(filtered, visibleColumns, name);
              toast.success("CSV exportado", { description: `${filtered.length} registros` });
            }}
            title="Exportar CSV (Excel-compatível)"
          >
            <FileSpreadsheet className="size-4" /> Excel
          </Button>
          {!hideNew && (
            <Button
              size="sm"
              onClick={() => {
                if (onNew) return onNew();
                toast.info("Cadastro em ambiente POC", { description: "Os dados de demonstração são pré-carregados." });
              }}
            >
              <Plus className="size-4" /> {newLabel}
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              {visibleColumns.map((c) => (
                <th key={c.key} className={`text-left font-medium px-4 py-2.5 whitespace-nowrap ${c.className ?? ""}`}>
                  {c.header}
                </th>
              ))}
              <th className="px-4 py-2.5 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={visibleColumns.length + 1} className="px-4 py-12 text-center text-muted-foreground">
                  {emptyHint ?? "Nenhum registro encontrado."}
                </td>
              </tr>
            )}
            {filtered.map((row, i) => (
              <tr
                key={i}
                className="border-t border-border hover:bg-accent/30 transition-colors cursor-pointer"
                onClick={() => (onRowClick ? onRowClick(row) : setDetailRow(row))}
              >
                {visibleColumns.map((c) => (
                  <td key={c.key} className={`px-4 py-3 align-middle ${c.className ?? ""}`}>
                    {c.render ? c.render(row) : String(row[c.key] ?? "")}
                  </td>
                ))}
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onRowClick) onRowClick(row);
                      else setDetailRow(row);
                    }}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                    title="Visualizar detalhes"
                  >
                    <Eye className="size-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-2.5 text-xs text-muted-foreground border-t border-border bg-muted/30">
        {filtered.length} de {data.length} registros
      </div>

      <Dialog open={!!detailRow} onOpenChange={(o) => !o && setDetailRow(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do registro</DialogTitle>
            <DialogDescription>Visualização completa de todos os campos.</DialogDescription>
          </DialogHeader>
          {detailRow && (
            <dl className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-x-4 gap-y-2 text-sm">
              {columns.map((c) => {
                const raw = c.accessor ? c.accessor(detailRow) : (detailRow as any)[c.key];
                const display = c.render ? c.render(detailRow) : (raw == null || raw === "" ? "—" : String(raw));
                return (
                  <div key={c.key} className="contents">
                    <dt className="text-muted-foreground font-medium pt-1.5 border-t border-border">{c.header}</dt>
                    <dd className="pt-1.5 border-t border-border break-words">{display}</dd>
                  </div>
                );
              })}
            </dl>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
