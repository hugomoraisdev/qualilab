import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuditAccess } from "@/lib/audit";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/lib/auth";
import {
  useLabUnits, createUnit, updateUnit, deleteUnit,
  readModuleRestrictions, writeModuleRestrictions,
} from "@/lib/lab-units-store";
import { toast } from "sonner";
import { FlaskConical, Plus, Trash2, ShieldOff, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_app/lab-units")({ component: LabUnitsPage });

const MODULES: { key: string; label: string }[] = [
  { key: "documents", label: "Documentos" },
  { key: "occurrences", label: "Ocorrências / NCs" },
  { key: "audits", label: "Auditorias" },
  { key: "risks", label: "Riscos" },
  { key: "indicators", label: "Indicadores" },
  { key: "calibrations", label: "Calibrações" },
  { key: "equipments", label: "Equipamentos" },
  { key: "suppliers", label: "Fornecedores" },
  { key: "purchases", label: "Compras" },
  { key: "competencies", label: "Competências" },
  { key: "meetings", label: "Reuniões" },
  { key: "forms", label: "Formulários" },
  { key: "process-map", label: "Mapa de processos" },
  { key: "reports", label: "Relatórios" },
];

function LabUnitsPage() {
  useAuditAccess("lab_units");
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { units, moduleRestrictions, loading } = useLabUnits();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draftModules, setDraftModules] = useState<string[]>([]);

  useEffect(() => {
    if (editing) setDraftModules(moduleRestrictions[editing] ?? []);
  }, [editing, moduleRestrictions]);

  if (!isAdmin) {
    return (
      <>
        <PageHeader title="Unidades / Setores" description="Restrição de acesso por unidade" />
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <ShieldOff className="mx-auto size-10 text-muted-foreground" />
          <h3 className="mt-3 font-semibold">Acesso restrito</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Apenas administradores podem gerenciar unidades.
          </p>
        </div>
      </>
    );
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await createUnit({ name: name.trim(), code: code.trim() || undefined });
      setName(""); setCode("");
      toast.success("Unidade criada");
      // força refresh do hook
      window.dispatchEvent(new Event("storage:lab-units-modules"));
    } catch (err) {
      toast.error("Operação falhou. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(id: string, active: boolean) {
    try {
      await updateUnit(id, { active });
      window.dispatchEvent(new Event("storage:lab-units-modules"));
    } catch (err) {
      toast.error("Operação falhou. Tente novamente.");
    }
  }

  async function remove(id: string) {
    if (!confirm("Excluir esta unidade? Usuários atribuídos a ela ficarão sem unidade.")) return;
    try {
      await deleteUnit(id);
      const mods = await readModuleRestrictions();
      delete mods[id];
      await writeModuleRestrictions(mods);
      toast.success("Unidade excluída");
    } catch (err) {
      toast.error("Operação falhou. Tente novamente.");
    }
  }

  async function saveModules() {
    if (!editing) return;
    const mods = await readModuleRestrictions();
    if (draftModules.length === 0) delete mods[editing];
    else mods[editing] = draftModules;
    await writeModuleRestrictions(mods);
    toast.success("Restrição salva");
    setEditing(null);
  }

  return (
    <>
      <PageHeader
        title="Unidades / Setores"
        description="Cadastre unidades e defina quais módulos cada uma pode acessar"
      />

      <div className="rounded-lg border border-border bg-card p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <FlaskConical className="size-4 text-primary" />
          <h3 className="font-semibold text-sm">Nova unidade</h3>
        </div>
        <form onSubmit={add} className="grid gap-3 sm:grid-cols-[1fr_180px_auto]">
          <div>
            <Label htmlFor="u-name" className="text-xs">Nome</Label>
            <Input id="u-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Laboratório Central" />
          </div>
          <div>
            <Label htmlFor="u-code" className="text-xs">Código</Label>
            <Input id="u-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="LAB-CENT" />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Adicionar
            </Button>
          </div>
        </form>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Módulos permitidos</TableHead>
              <TableHead>Ativa</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8">
                <Loader2 className="size-5 animate-spin mx-auto text-muted-foreground" />
              </TableCell></TableRow>
            ) : units.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-sm text-muted-foreground">
                Nenhuma unidade cadastrada.
              </TableCell></TableRow>
            ) : units.map((u) => {
              const allowed = moduleRestrictions[u.id] ?? [];
              return (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{u.code ?? "—"}</TableCell>
                  <TableCell>
                    {allowed.length === 0 ? (
                      <Badge variant="outline" className="text-muted-foreground">Todos</Badge>
                    ) : (
                      <Badge variant="outline">{allowed.length} módulos</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch checked={u.active} onCheckedChange={(v) => toggleActive(u.id, v)} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(u.id)}>
                        Restringir módulos
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(u.id)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4" onClick={() => setEditing(null)}>
          <div className="bg-card border border-border rounded-lg p-5 w-full max-w-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold mb-1">Restringir módulos da unidade</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Selecione os módulos permitidos. Se nada for selecionado, a unidade terá acesso a todos os módulos.
            </p>
            <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto">
              {MODULES.map((m) => {
                const checked = draftModules.includes(m.key);
                return (
                  <label key={m.key} className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded hover:bg-accent">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) => {
                        if (v) setDraftModules([...draftModules, m.key]);
                        else setDraftModules(draftModules.filter((x) => x !== m.key));
                      }}
                    />
                    {m.label}
                  </label>
                );
              })}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
              <Button onClick={saveModules}>Salvar</Button>
            </div>
          </div>
        </div>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        A restrição é aplicada na navegação lateral. Atribua usuários a unidades em <a className="text-primary underline" href="/users">Usuários e Permissões</a>.
      </p>
    </>
  );
}
