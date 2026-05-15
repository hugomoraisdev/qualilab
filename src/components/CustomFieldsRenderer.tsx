// Renderizador dinâmico de campos personalizados.
//
// Recebe a lista de definitions, valores atuais e callback de mudança.
// Renderiza o controle apropriado para cada tipo. Validação de
// obrigatoriedade fica a cargo do form pai (helper `validateRequired`).

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CustomFieldDef,
  CustomFieldValue,
} from "@/lib/custom-fields-store";
import {
  DOCUMENT_PROCESSES,
  DOCUMENT_SECTORS,
} from "@/lib/document-taxonomy";
import { listProfiles } from "@/lib/profiles-store";
import { listUnits, type LabUnit } from "@/lib/lab-units-store";
import { toast } from "sonner";

const STATUS_OPTIONS = ["rascunho", "em_revisao", "aprovado", "obsoleto"];

export type CustomValuesMap = Record<string, CustomFieldValue>;

interface RendererProps {
  fields: CustomFieldDef[];
  values: CustomValuesMap;
  onChange: (key: string, value: CustomFieldValue) => void;
  /** Quando false, mostra apenas leitura (ex.: visualização). */
  editable?: boolean;
  /** Limita a renderização aos campos ativos. Padrão true. */
  onlyActive?: boolean;
}

export function CustomFieldsRenderer({
  fields,
  values,
  onChange,
  editable = true,
  onlyActive = true,
}: RendererProps) {
  const [units, setUnits] = useState<LabUnit[]>([]);
  useEffect(() => {
    void listUnits().then(setUnits);
  }, []);

  const visible = fields
    .filter((f) => (onlyActive ? f.active : true))
    .sort((a, b) => a.order - b.order);

  if (visible.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {visible.map((f) => (
        <FieldControl
          key={f.id}
          field={f}
          value={values[f.key]}
          onChange={(v) => onChange(f.key, v)}
          editable={editable}
          units={units}
        />
      ))}
    </div>
  );
}

function FieldControl({
  field,
  value,
  onChange,
  editable,
  units,
}: {
  field: CustomFieldDef;
  value: CustomFieldValue | undefined;
  onChange: (v: CustomFieldValue) => void;
  editable: boolean;
  units: LabUnit[];
}) {
  const id = `cf-${field.id}`;
  const label = (
    <Label htmlFor={id} className="text-xs">
      {field.name}
      {field.required && <span className="text-destructive ml-0.5">*</span>}
    </Label>
  );

  const wrap = (control: React.ReactNode, full = false) => (
    <div className={full ? "md:col-span-2" : ""}>
      {label}
      {control}
      {field.description && (
        <p className="text-[11px] text-muted-foreground mt-1">{field.description}</p>
      )}
    </div>
  );

  if (!editable) {
    const display = formatDisplayValue(value);
    return wrap(<div className="text-sm py-1.5">{display || "—"}</div>);
  }

  switch (field.type) {
    case "text":
      return wrap(
        <Input
          id={id}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />,
      );

    case "textarea":
      return wrap(
        <Textarea
          id={id}
          rows={3}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />,
        true,
      );

    case "number":
      return wrap(
        <Input
          id={id}
          type="number"
          value={value === null || value === undefined ? "" : String(value)}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        />,
      );

    case "date":
      return wrap(
        <Input
          id={id}
          type="date"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
        />,
      );

    case "checkbox":
      return wrap(
        <div className="flex items-center h-9">
          <input
            id={id}
            type="checkbox"
            className="size-4 accent-primary"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
          />
        </div>,
      );

    case "select":
    case "status":
    case "sector":
    case "process":
    case "unit": {
      const options = resolveOptions(field, units);
      return wrap(
        <Select
          value={(value as string) ?? ""}
          onValueChange={(v) => onChange(v || null)}
        >
          <SelectTrigger id={id}>
            <SelectValue placeholder="Selecione…" />
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>,
      );
    }

    case "multiselect": {
      const arr = Array.isArray(value) ? (value as string[]) : [];
      const options = resolveOptions(field, units);
      return wrap(
        <div className="flex flex-wrap gap-1.5 border border-input rounded-md p-2">
          {options.map((o) => {
            const selected = arr.includes(o);
            return (
              <button
                type="button"
                key={o}
                onClick={() =>
                  onChange(selected ? arr.filter((x) => x !== o) : [...arr, o])
                }
                className={`text-xs rounded-full px-2 py-0.5 border ${
                  selected
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border text-muted-foreground"
                }`}
              >
                {o}
              </button>
            );
          })}
          {options.length === 0 && (
            <span className="text-xs text-muted-foreground italic">
              Sem opções configuradas.
            </span>
          )}
        </div>,
        true,
      );
    }

    case "user": {
      const profiles = listProfiles();
      return wrap(
        <Select
          value={(value as string) ?? ""}
          onValueChange={(v) => onChange(v || null)}
        >
          <SelectTrigger id={id}>
            <SelectValue placeholder="Selecione um responsável…" />
          </SelectTrigger>
          <SelectContent>
            {profiles.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>,
      );
    }

    case "attachment":
      return wrap(
        <div className="space-y-1">
          <Input
            id={id}
            type="file"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.size > 10 * 1024 * 1024) {
                toast.error("Arquivo muito grande", { description: "Limite de 10 MB." });
                e.target.value = "";
                return;
              }
              const reader = new FileReader();
              reader.onload = () => onChange(String(reader.result ?? ""));
              reader.onerror = () => toast.error("Falha ao ler arquivo");
              reader.readAsDataURL(file);
            }}
          />
          {typeof value === "string" && value.startsWith("data:") && (
            <span className="text-[11px] text-muted-foreground">
              Arquivo carregado ({Math.round((value as string).length / 1024)} KB).
            </span>
          )}
        </div>,
      );

    default:
      return wrap(<div className="text-xs text-muted-foreground">Tipo não suportado.</div>);
  }
}

function resolveOptions(field: CustomFieldDef, units: LabUnit[]): string[] {
  switch (field.type) {
    case "sector":
      return [...DOCUMENT_SECTORS];
    case "process":
      return [...DOCUMENT_PROCESSES];
    case "unit":
      return units.map((u) => u.name);
    case "status":
      return STATUS_OPTIONS;
    default:
      return field.options ?? [];
  }
}

function formatDisplayValue(value: CustomFieldValue | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (typeof value === "string" && value.startsWith("data:")) return "[arquivo anexado]";
  return String(value);
}

/** Retorna nomes dos campos obrigatórios não preenchidos. */
export function validateRequired(
  fields: CustomFieldDef[],
  values: CustomValuesMap,
): string[] {
  return fields
    .filter((f) => f.active && f.required)
    .filter((f) => {
      const v = values[f.key];
      if (v === undefined || v === null || v === "") return true;
      if (Array.isArray(v) && v.length === 0) return true;
      return false;
    })
    .map((f) => f.name);
}
