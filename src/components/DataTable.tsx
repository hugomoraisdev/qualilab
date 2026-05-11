import { useMemo, useState, type ReactNode } from "react";
import { Search, Plus, Eye, FileSpreadsheet } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  className?: string;
}

function downloadCsv<T extends Record<string, any>>(rows: T[], columns: Column<T>[], filename: string) {
  const header = columns.map((c) => `"${c.header.replace(/"/g, '""')}"`).join(",");
  const body = rows
    .map((r) =>
      columns
        .map((c) => {
          const v = r[c.key];
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

  const filtered = useMemo(() => {
    if (!q.trim()) return data;
    const term = q.toLowerCase();
    return data.filter((r) => searchKeys.some((k) => String(r[k] ?? "").toLowerCase().includes(term)));
  }, [q, data, searchKeys]);

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
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const name = (exportName ?? "qualilab") + "_" + new Date().toISOString().slice(0, 10) + ".csv";
              downloadCsv(filtered, columns, name);
              toast.success("CSV exportado", { description: `${filtered.length} registros` });
            }}
            title="Exportar CSV"
          >
            <FileSpreadsheet className="size-4" /> CSV
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
              {columns.map((c) => (
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
                <td colSpan={columns.length + 1} className="px-4 py-12 text-center text-muted-foreground">
                  {emptyHint ?? "Nenhum registro encontrado."}
                </td>
              </tr>
            )}
            {filtered.map((row, i) => (
              <tr
                key={i}
                className="border-t border-border hover:bg-accent/30 transition-colors cursor-pointer"
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((c) => (
                  <td key={c.key} className={`px-4 py-3 align-middle ${c.className ?? ""}`}>
                    {c.render ? c.render(row) : String(row[c.key] ?? "")}
                  </td>
                ))}
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={(e) => { e.stopPropagation(); onRowClick?.(row) ?? toast.info(`Detalhes: ${row.id ?? ""}`); }}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                    title="Visualizar"
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
    </div>
  );
}
