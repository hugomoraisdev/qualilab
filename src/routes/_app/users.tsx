import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuditAccess } from "@/lib/audit";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuth, type Role } from "@/lib/auth";
import { useLabUnits, assignUserUnit } from "@/lib/lab-units-store";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ShieldOff, UserPlus, Trash2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { adminCreateUser, adminDeleteUser } from "@/lib/admin-users.functions";

export const Route = createFileRoute("/_app/users")({ component: UsersPage });

const ROLES: { value: Role; label: string; tone: string }[] = [
  { value: "admin", label: "Administrador", tone: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30" },
  { value: "gestor", label: "Gestor da Qualidade", tone: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30" },
  { value: "tecnico", label: "Técnico de Laboratório", tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
  { value: "auditor", label: "Auditor", tone: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30" },
  { value: "consulta", label: "Consulta/Leitura", tone: "bg-muted text-muted-foreground border-border" },
];

const roleLabel = (r: Role) => ROLES.find((x) => x.value === r)?.label ?? r;
const roleTone = (r: Role) => ROLES.find((x) => x.value === r)?.tone ?? "";

interface UserRow {
  id: string;
  email: string;
  name: string;
  created_at: string;
  roles: Role[];
  lab_unit_id: string | null;
}

function UsersPage() {
  useAuditAccess("users");
  const { user } = useAuth();
  const { units } = useLabUnits();
  const isAdmin = user?.role === "admin";
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<Role>("consulta");
  const [creating, setCreating] = useState(false);
  const createUserFn = useServerFn(adminCreateUser);
  const deleteUserFn = useServerFn(adminDeleteUser);

  async function load() {
    setLoading(true);
    const { data: profiles, error: pErr } = await (supabase as any)
      .from("profiles")
      .select("id,email,name,created_at,lab_unit_id")
      .order("created_at", { ascending: false });
    if (pErr) {
      toast.error("Erro ao carregar usuários: " + pErr.message);
      setLoading(false);
      return;
    }
    const ids = (profiles ?? []).map((p: any) => p.id);
    const { data: roles } = ids.length
      ? await supabase.from("user_roles").select("user_id,role").in("user_id", ids)
      : { data: [] as { user_id: string; role: Role }[] };
    const byUser = new Map<string, Role[]>();
    (roles ?? []).forEach((r) => {
      const list = byUser.get(r.user_id) ?? [];
      list.push(r.role as Role);
      byUser.set(r.user_id, list);
    });
    setRows(
      (profiles ?? []).map((p: any) => ({
        id: p.id,
        email: p.email,
        name: p.name,
        created_at: p.created_at,
        lab_unit_id: p.lab_unit_id ?? null,
        roles: byUser.get(p.id) ?? [],
      })),
    );
    setLoading(false);
  }

  useEffect(() => {
    if (isAdmin) load();
    else setLoading(false);
  }, [isAdmin]);

  async function setUserRole(targetId: string, newRole: Role) {
    setSavingId(targetId);
    try {
      // Remove papéis existentes e atribui um único — modelo simples e auditável
      const del = await supabase.from("user_roles").delete().eq("user_id", targetId);
      if (del.error) throw del.error;
      const ins = await supabase.from("user_roles").insert({ user_id: targetId, role: newRole });
      if (ins.error) throw ins.error;
      toast.success(`Papel atualizado para ${roleLabel(newRole)}`);
      await load();
    } catch (err) {
      toast.error("Erro ao atualizar papel: " + (err as Error).message);
    } finally {
      setSavingId(null);
    }
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      await createUserFn({
        data: {
          email: newEmail.trim().toLowerCase(),
          name: newName.trim(),
          password: newPassword,
          role: newRole,
        },
      });
      toast.success("Usuário criado com sucesso");
      setNewEmail(""); setNewName(""); setNewPassword(""); setNewRole("consulta");
      await load();
    } catch (err) {
      toast.error("Erro ao criar usuário: " + (err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  async function deleteUser(targetId: string, label: string) {
    if (!confirm(`Remover permanentemente o usuário "${label}"? Esta ação não pode ser desfeita.`)) return;
    setSavingId(targetId);
    try {
      await deleteUserFn({ data: { userId: targetId } });
      toast.success("Usuário removido");
      await load();
    } catch (err) {
      toast.error("Erro: " + (err as Error).message);
    } finally {
      setSavingId(null);
    }
  }

  async function revokeAll(targetId: string) {
    if (!confirm("Revogar todos os papéis deste usuário? Ele ficará sem acesso até receber um novo papel.")) return;
    setSavingId(targetId);
    try {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", targetId);
      if (error) throw error;
      toast.success("Papéis revogados");
      await load();
    } catch (err) {
      toast.error("Erro: " + (err as Error).message);
    } finally {
      setSavingId(null);
    }
  }

  if (!isAdmin) {
    return (
      <>
        <PageHeader title="Usuários e Permissões" description="Controle de acesso por perfil" />
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <ShieldOff className="mx-auto size-10 text-muted-foreground" />
          <h3 className="mt-3 font-semibold">Acesso restrito</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Apenas administradores podem gerenciar usuários e papéis.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            Seu papel atual: <Badge variant="outline">{user ? roleLabel(user.role) : "—"}</Badge>
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Usuários e Permissões"
        description="Atribua papéis aos usuários cadastrados na plataforma"
      />

      {/* Criar novo usuário */}
      <div className="rounded-lg border border-border bg-card p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <UserPlus className="size-4 text-primary" />
          <h3 className="font-semibold text-sm">Criar novo usuário</h3>
        </div>
        <form onSubmit={createUser} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_180px_180px_auto]">
          <div>
            <Label htmlFor="new-name" className="text-xs">Nome</Label>
            <Input id="new-name" required maxLength={120}
              placeholder="Maria Silva"
              value={newName} onChange={(e) => setNewName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="new-email" className="text-xs">E-mail</Label>
            <Input id="new-email" type="email" required maxLength={255}
              placeholder="usuario@empresa.com"
              value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="new-password" className="text-xs">Senha provisória</Label>
            <Input id="new-password" type="text" required minLength={8} maxLength={72}
              placeholder="mín. 8 caracteres"
              value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="new-role" className="text-xs">Papel</Label>
            <Select value={newRole} onValueChange={(v) => setNewRole(v as Role)}>
              <SelectTrigger id="new-role"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={creating} className="w-full sm:w-auto">
              {creating ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
              Criar
            </Button>
          </div>
        </form>
        <p className="mt-2 text-xs text-muted-foreground">
          O usuário é criado com e-mail já confirmado. Compartilhe a senha provisória de forma segura.
        </p>
      </div>

      {/* Lista */}
      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Papel atual</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead>Cadastro</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">
                <Loader2 className="size-5 animate-spin mx-auto text-muted-foreground" />
              </TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-sm text-muted-foreground">
                Nenhum usuário cadastrado ainda.
              </TableCell></TableRow>
            ) : rows.map((r) => {
              const primary = r.roles[0];
              return (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.email}</TableCell>
                  <TableCell>
                    {r.roles.length === 0 ? (
                      <Badge variant="outline" className="text-muted-foreground">Sem papel</Badge>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {r.roles.map((role) => (
                          <Badge key={role} variant="outline" className={roleTone(role)}>
                            {roleLabel(role)}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={r.lab_unit_id ?? "__none"}
                      onValueChange={async (v) => {
                        const next = v === "__none" ? null : v;
                        try {
                          await assignUserUnit(r.id, next);
                          toast.success("Unidade atualizada");
                          await load();
                        } catch (err) {
                          toast.error("Erro: " + (err as Error).message);
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 w-44">
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">Sem unidade</SelectItem>
                        {units.map((u) => (
                          <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Select
                        value={primary ?? ""}
                        onValueChange={(v) => setUserRole(r.id, v as Role)}
                        disabled={savingId === r.id || r.id === user?.id}
                      >
                        <SelectTrigger className="h-8 w-44">
                          <SelectValue placeholder="Papel..." />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map((role) => (
                            <SelectItem key={role.value} value={role.value}>
                              {role.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm" variant="ghost"
                        disabled={savingId === r.id || r.roles.length === 0 || r.id === user?.id}
                        onClick={() => revokeAll(r.id)}
                        title={r.id === user?.id ? "Não é possível revogar seu próprio acesso" : "Revogar todos os papéis"}
                      >
                        <ShieldOff className="size-4" />
                      </Button>
                      <Button
                        size="sm" variant="ghost"
                        className="text-destructive hover:text-destructive"
                        disabled={savingId === r.id || r.id === user?.id}
                        onClick={() => deleteUser(r.id, r.name || r.email)}
                        title={r.id === user?.id ? "Não é possível remover a si mesmo" : "Remover usuário"}
                      >
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

      <p className="mt-4 text-xs text-muted-foreground">
        Você não pode alterar nem revogar seu próprio papel para evitar perda de acesso ao painel.
      </p>
    </>
  );
}
