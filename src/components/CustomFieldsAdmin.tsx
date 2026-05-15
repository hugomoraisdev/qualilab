// Painel de administração dos campos personalizados de um escopo.
// Atualmente usado para o módulo Documentos (Configurações).

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
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
import { Plus, Trash2, Edit3, ChevronUp, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import {
  CustomFieldDef,
  CustomFieldType,
  CustomFieldScope,
  deleteCustomField,
  reorderCustomFields,
  saveCustomField,
  slugifyFieldKey,
  useCustomFields,
} from "@/lib/custom-fields-store";

const TYPE_LABELS: Record<CustomFieldType, string> = {
  text: "Texto curto",
  textarea: "Texto longo",
  number: "Número",
  date: "Data",
  select: "Seleção única",
  multiselect: "Múltipla seleção",
  checkbox: "Checkbox",
  attachment: "Anexo",
  user: "Usuário responsável",
  sector: "Setor",
  process: "Processo",
  unit: "Unidade",
  status: "Status",
};

const ROLES = ["admin", "gestor", "tecnico", "auditor", "consulta"];

const empty = (order: number): CustomFieldDef => ({
  id: crypto.randomUUID(),
  name: "",
  key: "",
  type: "text",
  required: false,
  order,
  active: true,
  options: [],
  visibleRoles: [],
});

export function CustomFieldsAdmin({ scope }: { scope: CustomFieldScope }) {
  const fields = useCustomFields(scope);
  const [editing, setEditing] = useState<CustomFieldDef | null>(null);

  const move = async (id: string, dir: -1 | 1) => {
    const idx = fields.findIndex((f) => f.id === id);
    const target = idx + dir;
    if (target < 0 || target >= fields.length) return;
    const ids = fields.map((f) => f.id);
    [ids[idx], ids[target]] = [ids[target], ids[idx]];
    await reorderCustomFields(scope, ids);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Campos adicionais que aparecem no cadastro/edição e na Lista Mestra.
        </p>
        <Button size="sm" onClick={() => setEditing(empty(fields.length))}>
          <Plus className="size-4" /> Novo campo
        </Button>
      </div>

      {fields.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">Nenhum campo personalizado ainda.</p>
      ) : (
        <ul className="border border-border rounded-md divide-y divide-border">
          {fields.map((f, i) => (
            <li key={f.id} className="flex items-center gap-2 px-3 py-2 text-sm">
              <span
                className={`size-2 rounded-full ${f.active ? "bg-success" : "bg-muted"}`}
                title={f.active ? "Ativo" : "Inativo"}
              />
              <span className="flex-1">
                <div className="font-medium">{f.name}</div>
                <div className="text-xs text-muted-foreground">
                  {TYPE_LABELS[f.type]} · chave <span className="font-mono">{f.key}</span>
                  {f.required && <span className="text-destructive ml-1">obrigatório</span>}
                </div>
              </span>
              <Button size="sm" variant="ghost" onClick={() => move(f.id, -1)} disabled={i === 0}>
                <ChevronUp className="size-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => move(f.id, 1)}
                disabled={i === fields.length - 1}
              >
                <ChevronDown className="size-3.5" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(f)}>
                <Edit3 className="size-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  if (!confirm(`Remover o campo "${f.name}"? Valores antigos são preservados.`))
                    return;
                  await deleteCustomField(scope, f.id);
                  toast.success("Campo removido");
                }}
              >
                <Trash2 className="size-3.5 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <FieldDialog
          scope={scope}
          field={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function FieldDialog({
  scope,
  field,
  onClose,
}: {
  scope: CustomFieldScope;
  field: CustomFieldDef;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<CustomFieldDef>(field);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!draft.name.trim()) {
      toast.error("Informe o nome do campo");
      return;
    }
    const key = (draft.key || slugifyFieldKey(draft.name)).trim();
    if (!key) {
      toast.error("Chave inválida");
      return;
    }
    setBusy(true);
    try {
      await saveCustomField(scope, { ...draft, name: draft.name.trim(), key });
      toast.success("Campo salvo");
      onClose();
    } catch (err) {
      toast.error("Falha ao salvar", { description: String((err as Error)?.message ?? err) });
    } finally {
      setBusy(false);
    }
  };

  const needsOptions = draft.type === "select" || draft.type === "multiselect";

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{field.name ? "Editar campo" : "Novo campo personalizado"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Nome *</Label>
              <Input
                value={draft.name}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    name: e.target.value,
                    key: d.key || slugifyFieldKey(e.target.value),
                  }))
                }
              />
            </div>
            <div>
              <Label>Chave (slug)</Label>
              <Input
                value={draft.key}
                onChange={(e) => setDraft((d) => ({ ...d, key: slugifyFieldKey(e.target.value) }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Tipo</Label>
              <Select
                value={draft.type}
                onValueChange={(v) => setDraft((d) => ({ ...d, type: v as CustomFieldType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ordem</Label>
              <Input
                type="number"
                value={draft.order}
                onChange={(e) => setDraft((d) => ({ ...d, order: Number(e.target.value) }))}
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="accent-primary"
                checked={draft.required}
                onChange={(e) => setDraft((d) => ({ ...d, required: e.target.checked }))}
              />
              Obrigatório
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="accent-primary"
                checked={draft.active}
                onChange={(e) => setDraft((d) => ({ ...d, active: e.target.checked }))}
              />
              Ativo
            </label>
          </div>

          {needsOptions && (
            <div>
              <Label>Opções (uma por linha)</Label>
              <Textarea
                rows={4}
                value={(draft.options ?? []).join("\n")}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    options: e.target.value
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  }))
                }
              />
            </div>
          )}

          <div>
            <Label>Visibilidade por perfil</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {ROLES.map((r) => {
                const checked = (draft.visibleRoles ?? []).includes(r);
                return (
                  <button
                    type="button"
                    key={r}
                    onClick={() =>
                      setDraft((d) => {
                        const cur = new Set(d.visibleRoles ?? []);
                        if (cur.has(r)) cur.delete(r);
                        else cur.add(r);
                        return { ...d, visibleRoles: [...cur] };
                      })
                    }
                    className={`text-xs rounded-full px-2 py-0.5 border ${
                      checked
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border text-muted-foreground"
                    }`}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Vazio = visível para todos.
            </p>
          </div>

          <div>
            <Label>Descrição (opcional)</Label>
            <Textarea
              rows={2}
              value={draft.description ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={busy}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
