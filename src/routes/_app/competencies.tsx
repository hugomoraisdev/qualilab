import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuditAccess } from "@/lib/audit";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  History,
  Plus,
  Pencil,
  Trash2,
  Award,
  Briefcase,
  ShieldCheck,
  ShieldAlert,
  ExternalLink,
  FileSpreadsheet,
  Save,
  X,
  Paperclip,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  competenciesStore,
  type CompetencyRow,
  saveCompetency,
  deleteCompetency,
} from "@/lib/competencies-store";
import { competencyHistoryStore, type CompetencyHistoryRow } from "@/lib/competency-history-store";
import { profilesStore, profileName, listProfiles } from "@/lib/profiles-store";
import { useTableStore } from "@/lib/table-store";
import {
  useJobRoles,
  upsertJobRole,
  deleteJobRole,
  type JobRole,
  type JobRoleRequirement,
  LEVEL_LABEL,
  LEVEL_RANK,
} from "@/lib/job-roles-store";
import { useAssignments, setAssignment } from "@/lib/role-assignments-store";
import { useExtras, setExtra, type CompetencyExtra } from "@/lib/competency-extras-store";
import {
  useEmployeeExtras,
  setEmployeeMeta,
  emptyEmployeeMeta,
  type EmployeeMeta,
} from "@/lib/employee-meta-store";

export const Route = createFileRoute("/_app/competencies")({ component: CompPage });

const today = () => new Date().toISOString().slice(0, 10);
const uid = () =>
  crypto.randomUUID?.() ??
  `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const isExpired = (iso: string | null | undefined) => !!iso && iso < today();

function CompPage() {
  useAuditAccess("competencies");
  const competencies = useTableStore(competenciesStore);
  useTableStore(profilesStore);
  const history = useTableStore(competencyHistoryStore);
  const { roles } = useJobRoles();
  const { map: assignments } = useAssignments();
  const { map: extras } = useExtras();

  const { map: employeeExtras } = useEmployeeExtras();

  const [openFor, setOpenFor] = useState<CompetencyRow | null>(null);
  const [editingComp, setEditingComp] = useState<CompetencyRow | null>(null);
  const [editingRole, setEditingRole] = useState<JobRole | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<string | null>(null);
  const [filterUser, setFilterUser] = useState("");
  const [filterArea, setFilterArea] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterExpiry, setFilterExpiry] = useState("");

  const profiles = listProfiles();
  const collaborators = useMemo(() => {
    const ids = new Set<string>();
    competencies.forEach((c) => ids.add(c.user_id));
    Object.keys(assignments).forEach((id) => ids.add(id));
    profiles.forEach((p) => ids.add(p.id));
    return Array.from(ids);
  }, [competencies, assignments, profiles]);
  const allSkills = Array.from(new Set(competencies.map((c) => c.skill)));
  const allAreas = Array.from(new Set(competencies.map((c) => c.area))).sort();
  const recent = useMemo(() => history.slice(0, 30), [history]);

  const filteredCompetencies = useMemo(() => {
    const todayStr = today();
    const d30 = new Date();
    d30.setDate(d30.getDate() + 30);
    const d30Str = d30.toISOString().slice(0, 10);
    const d60 = new Date();
    d60.setDate(d60.getDate() + 60);
    const d60Str = d60.toISOString().slice(0, 10);
    return competencies.filter((c) => {
      if (filterUser && c.user_id !== filterUser) return false;
      if (filterArea && c.area !== filterArea) return false;
      if (filterStatus && c.status !== filterStatus) return false;
      if (filterExpiry === "vencidos") return !!c.expires_at && c.expires_at < todayStr;
      if (filterExpiry === "30dias")
        return !!c.expires_at && c.expires_at >= todayStr && c.expires_at <= d30Str;
      if (filterExpiry === "60dias")
        return !!c.expires_at && c.expires_at >= todayStr && c.expires_at <= d60Str;
      return true;
    });
  }, [competencies, filterUser, filterArea, filterStatus, filterExpiry]);

  const competencyMeetsRequirement = (userId: string, req: JobRoleRequirement) => {
    return competencies.some(
      (c) =>
        c.user_id === userId &&
        c.area === req.area &&
        c.skill === req.skill &&
        c.status === "ativo" &&
        !isExpired(c.expires_at) &&
        (LEVEL_RANK[c.level] ?? 0) >= (LEVEL_RANK[req.min_level] ?? 0),
    );
  };

  const apidaoRows = collaborators
    .map((userId) => {
      const roleId = assignments[userId];
      const role = roles.find((r) => r.id === roleId);
      if (!role) return null;
      const requirements = role.requirements;
      const met = requirements.filter((r) => competencyMeetsRequirement(userId, r));
      return {
        userId,
        roleId: role.id,
        roleName: role.name,
        total: requirements.length,
        ok: met.length,
        gaps: requirements.filter((r) => !competencyMeetsRequirement(userId, r)),
        apt: requirements.length > 0 && met.length === requirements.length,
      };
    })
    .filter((x): x is NonNullable<typeof x> => !!x);

  const exportApidaoCsv = () => {
    const lines = ["Colaborador,Função,Requisitos,Atendidos,Lacunas,Apto"];
    apidaoRows.forEach((r) => {
      lines.push(
        [
          profileName(r.userId),
          r.roleName,
          r.total,
          r.ok,
          r.gaps.map((g) => `${g.area}:${g.skill}@${LEVEL_LABEL[g.min_level]}`).join("; "),
          r.apt ? "Sim" : "Não",
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(","),
      );
    });
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aptidao_${today()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Aptidão exportada");
  };

  return (
    <>
      <PageHeader
        title="Competências"
        description="Cargos, competências exigidas, treinamentos, qualificações e aptidão da equipe"
      />

      <Tabs defaultValue="matriz" className="mb-4">
        <TabsList>
          <TabsTrigger value="matriz">
            <Award className="size-3.5 mr-1.5" />
            Matriz e cadastros
          </TabsTrigger>
          <TabsTrigger value="funcoes">
            <Briefcase className="size-3.5 mr-1.5" />
            Funções{roles.length > 0 ? ` (${roles.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="aptidao">
            <ShieldCheck className="size-3.5 mr-1.5" />
            Aptidão{apidaoRows.length > 0 ? ` (${apidaoRows.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="historico">
            <History className="size-3.5 mr-1.5" />
            Histórico{history.length > 0 ? ` (${history.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="colaboradores">Colaboradores ({profiles.length})</TabsTrigger>
        </TabsList>

        {/* MATRIZ */}
        <TabsContent value="matriz" className="mt-4 space-y-6">
          {competencies.length > 0 && (
            <div className="bg-card border border-border rounded-lg p-5 shadow-sm overflow-x-auto">
              <h3 className="text-sm font-semibold mb-3">Matriz de competências</h3>
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="text-left py-1.5 pr-3">Colaborador</th>
                    {allSkills.map((s) => (
                      <th
                        key={s}
                        className="px-2 py-1.5 text-left font-medium text-muted-foreground"
                        style={{ minWidth: 140 }}
                      >
                        {s}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from(new Set(competencies.map((c) => c.user_id))).map((uidv) => (
                    <tr key={uidv} className="border-t border-border">
                      <td className="py-2 pr-3 font-medium">{profileName(uidv)}</td>
                      {allSkills.map((s) => {
                        const item = competencies.find((x) => x.user_id === uidv && x.skill === s);
                        return (
                          <td key={s} className="px-2 py-2">
                            {item ? (
                              <StatusBadge>{item.status}</StatusBadge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Filtros personalizados */}
          <div className="flex flex-wrap gap-2 items-end pb-1">
            <div className="space-y-1">
              <Label className="text-xs">Colaborador</Label>
              <Select value={filterUser} onValueChange={setFilterUser}>
                <SelectTrigger className="h-8 w-44 text-xs">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name || p.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Área</Label>
              <Select value={filterArea} onValueChange={setFilterArea}>
                <SelectTrigger className="h-8 w-40 text-xs">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas</SelectItem>
                  {allAreas.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-8 w-36 text-xs">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="vencido">Vencido</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="suspenso">Suspenso</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Validade</Label>
              <Select value={filterExpiry} onValueChange={setFilterExpiry}>
                <SelectTrigger className="h-8 w-48 text-xs">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="vencidos">Vencidos</SelectItem>
                  <SelectItem value="30dias">A vencer em 30 dias</SelectItem>
                  <SelectItem value="60dias">A vencer em 60 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(filterUser || filterArea || filterStatus || filterExpiry) && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 self-end"
                onClick={() => {
                  setFilterUser("");
                  setFilterArea("");
                  setFilterStatus("");
                  setFilterExpiry("");
                }}
              >
                <X className="size-3.5 mr-1" /> Limpar filtros
              </Button>
            )}
            {filteredCompetencies.length !== competencies.length && (
              <span className="text-xs text-muted-foreground self-end pb-1.5">
                {filteredCompetencies.length} de {competencies.length} registros
              </span>
            )}
          </div>

          <DataTable
            data={filteredCompetencies}
            searchKeys={["area", "skill", "level", "status"]}
            newLabel="Nova competência / treinamento"
            onNew={() =>
              setEditingComp({
                id: uid(),
                user_id: profiles[0]?.id ?? "",
                area: "",
                skill: "",
                level: "basico",
                status: "ativo",
                certified_at: today(),
                expires_at: null,
                evidence: null,
                notes: null,
              })
            }
            onRowClick={(r) => setEditingComp(r)}
            columns={[
              {
                key: "user_id",
                header: "Colaborador",
                render: (r) => <span className="font-medium">{profileName(r.user_id)}</span>,
                accessor: (r) => profileName(r.user_id),
              },
              { key: "area", header: "Área" },
              { key: "skill", header: "Competência" },
              { key: "level", header: "Nível", render: (r) => LEVEL_LABEL[r.level] ?? r.level },
              {
                key: "certified_at",
                header: "Certificado em",
                render: (r) => r.certified_at ?? "—",
              },
              {
                key: "expires_at",
                header: "Validade",
                render: (r) =>
                  r.expires_at ? (
                    <span className={isExpired(r.expires_at) ? "text-red-600 font-medium" : ""}>
                      {r.expires_at}
                    </span>
                  ) : (
                    "—"
                  ),
              },
              {
                key: "cert",
                header: "Certificado",
                render: (r) =>
                  extras[r.id]?.certificate_url ? (
                    <a
                      href={extras[r.id]!.certificate_url!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline text-xs"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="size-3" /> Ver
                    </a>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  ),
              },
              {
                key: "status",
                header: "Status",
                render: (r) => <StatusBadge>{r.status}</StatusBadge>,
              },
              {
                key: "id",
                header: "Histórico",
                render: (r) => {
                  const count = history.filter((h) => h.competency_id === r.id).length;
                  return (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenFor(r);
                      }}
                    >
                      <History className="size-3.5 mr-1" /> {count}
                    </Button>
                  );
                },
              },
            ]}
            exportName="competencias"
          />
        </TabsContent>

        {/* FUNÇÕES */}
        <TabsContent value="funcoes" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Cargos / Funções</h3>
              <p className="text-xs text-muted-foreground">
                Defina os requisitos de competência por função e atribua a função aos colaboradores.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() =>
                setEditingRole({
                  id: uid(),
                  name: "",
                  description: null,
                  department: null,
                  requirements: [],
                })
              }
            >
              <Plus className="size-4" /> Nova função
            </Button>
          </div>

          {roles.length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-8 text-center text-sm text-muted-foreground">
              Nenhuma função cadastrada.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {roles.map((r) => {
                const assigned = Object.entries(assignments)
                  .filter(([, rid]) => rid === r.id)
                  .map(([uidv]) => uidv);
                return (
                  <div key={r.id} className="bg-card border border-border rounded-lg p-4 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold">{r.name}</div>
                        {r.department && (
                          <div className="text-xs text-muted-foreground">{r.department}</div>
                        )}
                        {r.description && (
                          <p className="text-xs text-muted-foreground mt-1">{r.description}</p>
                        )}
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => setEditingRole(r)}>
                        <Pencil className="size-3.5" />
                      </Button>
                    </div>
                    <div className="mt-3">
                      <div className="text-[11px] uppercase text-muted-foreground tracking-wider mb-1">
                        Requisitos ({r.requirements.length})
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {r.requirements.length === 0 ? (
                          <span className="text-xs text-muted-foreground italic">
                            Sem requisitos definidos
                          </span>
                        ) : (
                          r.requirements.map((req) => (
                            <Badge key={req.id} variant="outline" className="text-xs">
                              {req.area} · {req.skill} · {LEVEL_LABEL[req.min_level]}
                            </Badge>
                          ))
                        )}
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="text-[11px] uppercase text-muted-foreground tracking-wider mb-1">
                        Colaboradores ({assigned.length})
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {assigned.length === 0 ? (
                          <span className="text-xs text-muted-foreground italic">—</span>
                        ) : (
                          assigned.map((uidv) => (
                            <Badge key={uidv} variant="secondary" className="text-xs">
                              {profileName(uidv)}
                            </Badge>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Atribuição função × colaborador */}
          <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-semibold mb-3">Atribuir função ao colaborador</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr>
                    <th className="text-left py-2">Colaborador</th>
                    <th className="text-left py-2">Função atual</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((p) => (
                    <tr key={p.id} className="border-t border-border">
                      <td className="py-2">{p.name || p.email}</td>
                      <td className="py-2">
                        <Select
                          value={assignments[p.id] ?? "none"}
                          onValueChange={async (v) => {
                            await setAssignment(p.id, v === "none" ? null : v);
                            toast.success("Função atualizada");
                          }}
                        >
                          <SelectTrigger className="h-8 w-64">
                            <SelectValue placeholder="Sem função" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sem função</SelectItem>
                            {roles.map((r) => (
                              <SelectItem key={r.id} value={r.id}>
                                {r.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))}
                  {profiles.length === 0 && (
                    <tr>
                      <td colSpan={2} className="py-6 text-center text-sm text-muted-foreground">
                        Nenhum colaborador cadastrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* APTIDÃO */}
        <TabsContent value="aptidao" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Aptidão da equipe</h3>
              <p className="text-xs text-muted-foreground">
                Comprovação de que cada colaborador atende aos requisitos da função atribuída.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={exportApidaoCsv}
              disabled={apidaoRows.length === 0}
            >
              <FileSpreadsheet className="size-4" /> Exportar
            </Button>
          </div>

          {apidaoRows.length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-8 text-center text-sm text-muted-foreground">
              Atribua funções aos colaboradores na aba <strong>Funções</strong> para ver o painel de
              aptidão.
            </div>
          ) : (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-2.5">Colaborador</th>
                    <th className="text-left px-4 py-2.5">Função</th>
                    <th className="text-left px-4 py-2.5">Cobertura</th>
                    <th className="text-left px-4 py-2.5">Lacunas</th>
                    <th className="text-left px-4 py-2.5">Aptidão</th>
                  </tr>
                </thead>
                <tbody>
                  {apidaoRows.map((r) => (
                    <tr key={r.userId} className="border-t border-border">
                      <td className="px-4 py-3 font-medium">{profileName(r.userId)}</td>
                      <td className="px-4 py-3">{r.roleName}</td>
                      <td className="px-4 py-3 text-xs">
                        {r.ok}/{r.total} requisitos
                      </td>
                      <td className="px-4 py-3">
                        {r.gaps.length === 0 ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {r.gaps.map((g) => (
                              <Badge
                                key={g.id}
                                variant="outline"
                                className="text-[10px] border-red-300 text-red-700 dark:text-red-400"
                              >
                                {g.skill} ≥ {LEVEL_LABEL[g.min_level]}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {r.apt ? (
                          <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                            <ShieldCheck className="size-3 mr-1" /> Apto
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                            <ShieldAlert className="size-3 mr-1" /> Pendente
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* HISTÓRICO */}
        <TabsContent value="historico" className="mt-4">
          <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-semibold mb-3">Últimas alterações</h3>
            <HistoryTimeline rows={recent} />
            {history.length > recent.length && (
              <p className="text-xs text-muted-foreground mt-3">
                Mostrando {recent.length} de {history.length}.
              </p>
            )}
          </div>
        </TabsContent>
        {/* COLABORADORES */}
        <TabsContent value="colaboradores" className="mt-4">
          <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Colaboradores</h3>
                <p className="text-xs text-muted-foreground">
                  Matrícula, setor, cargo e situação de cada colaborador.
                </p>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2.5">Nome</th>
                  <th className="text-left px-4 py-2.5">E-mail</th>
                  <th className="text-left px-4 py-2.5">Matrícula</th>
                  <th className="text-left px-4 py-2.5">Setor</th>
                  <th className="text-left px-4 py-2.5">Cargo</th>
                  <th className="text-left px-4 py-2.5">Admissão</th>
                  <th className="text-left px-4 py-2.5">Situação</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {profiles.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-muted-foreground text-xs">
                      Nenhum colaborador cadastrado.
                    </td>
                  </tr>
                )}
                {profiles.map((p) => {
                  const em = employeeExtras[p.id] ?? emptyEmployeeMeta();
                  return (
                    <tr key={p.id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-4 py-2.5 font-medium">{p.name || "—"}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{p.email}</td>
                      <td className="px-4 py-2.5 font-mono text-xs">{em.registration ?? "—"}</td>
                      <td className="px-4 py-2.5 text-xs">{em.department ?? "—"}</td>
                      <td className="px-4 py-2.5 text-xs">{em.position ?? "—"}</td>
                      <td className="px-4 py-2.5 text-xs">{em.admission_date ?? "—"}</td>
                      <td className="px-4 py-2.5">
                        <StatusBadge
                          tone={
                            em.situation === "ativo"
                              ? "success"
                              : em.situation === "afastado"
                                ? "warning"
                                : "muted"
                          }
                        >
                          {em.situation}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2"
                          onClick={() => setEditingEmployee(p.id)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog histórico individual */}
      <Dialog open={!!openFor} onOpenChange={(o) => !o && setOpenFor(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Histórico — {openFor?.skill}</DialogTitle>
            <DialogDescription>
              {openFor ? `${profileName(openFor.user_id)} · ${openFor.area}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto pr-1">
            <HistoryTimeline
              rows={openFor ? history.filter((h) => h.competency_id === openFor.id) : []}
            />
          </div>
        </DialogContent>
      </Dialog>

      <CompetencyForm row={editingComp} extras={extras} onClose={() => setEditingComp(null)} />
      <RoleForm row={editingRole} onClose={() => setEditingRole(null)} />
      <EmployeeForm
        profileId={editingEmployee}
        initial={editingEmployee ? (employeeExtras[editingEmployee] ?? emptyEmployeeMeta()) : null}
        profileName={
          editingEmployee ? (profiles.find((p) => p.id === editingEmployee)?.name ?? "") : ""
        }
        onClose={() => setEditingEmployee(null)}
      />
    </>
  );
}

// =========== Form: Competência / Treinamento ===========
function CompetencyForm({
  row,
  extras,
  onClose,
}: {
  row: CompetencyRow | null;
  extras: Record<string, CompetencyExtra>;
  onClose: () => void;
}) {
  const profiles = listProfiles();
  const [form, setForm] = useState<CompetencyRow | null>(row);
  const [extra, setExtraState] = useState<CompetencyExtra>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const certFileRef = useRef<HTMLInputElement>(null);

  async function handleCertUpload(file: File) {
    setUploading(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `certificates/comp-${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("certificates")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("certificates").getPublicUrl(path);
      setExtraState((prev) => ({ ...prev, certificate_url: urlData.publicUrl }));
      toast.success("Certificado anexado", { description: file.name });
    } catch (err) {
      toast.error("Falha no upload", { description: (err as Error).message });
    } finally {
      setUploading(false);
    }
  }

  useEffect(() => {
    setForm(row);
    setExtraState(row ? (extras[row.id] ?? {}) : {});
  }, [row, extras]);

  if (!form) return null;
  const set = <K extends keyof CompetencyRow>(k: K, v: CompetencyRow[K]) =>
    setForm({ ...form, [k]: v });
  const setEx = <K extends keyof CompetencyExtra>(k: K, v: CompetencyExtra[K]) =>
    setExtraState({ ...extra, [k]: v });

  const handleSave = async () => {
    if (!form.user_id || !form.area || !form.skill) {
      toast.error("Preencha colaborador, área e competência");
      return;
    }
    setSaving(true);
    try {
      await saveCompetency(form);
      await setExtra(form.id, extra);
      toast.success("Competência salva");
      onClose();
    } catch (e) {
      toast.error("Erro ao salvar: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Remover esta competência?")) return;
    setSaving(true);
    try {
      await deleteCompetency(form.id);
      toast.success("Removida");
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!form} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{row?.skill ? "Editar" : "Nova"} competência / treinamento</DialogTitle>
          <DialogDescription>
            Registro de qualificação, treinamento ou capacitação com validade e certificado.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label>Colaborador *</Label>
            <Select value={form.user_id} onValueChange={(v) => set("user_id", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name || p.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Área *</Label>
            <Input
              value={form.area}
              onChange={(e) => set("area", e.target.value)}
              placeholder="Ex.: Laboratório"
            />
          </div>
          <div>
            <Label>Competência / Treinamento *</Label>
            <Input
              value={form.skill}
              onChange={(e) => set("skill", e.target.value)}
              placeholder="Ex.: ISO 17025"
            />
          </div>
          <div>
            <Label>Tipo</Label>
            <Select
              value={extra.training_type ?? "treinamento"}
              onValueChange={(v) => setEx("training_type", v as CompetencyExtra["training_type"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="treinamento">Treinamento</SelectItem>
                <SelectItem value="qualificacao">Qualificação</SelectItem>
                <SelectItem value="capacitacao">Capacitação</SelectItem>
                <SelectItem value="reciclagem">Reciclagem</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Nível alcançado</Label>
            <Select value={form.level} onValueChange={(v) => set("level", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="basico">Básico</SelectItem>
                <SelectItem value="intermediario">Intermediário</SelectItem>
                <SelectItem value="avancado">Avançado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Provedor / Instrutor</Label>
            <Input
              value={extra.training_provider ?? ""}
              onChange={(e) => setEx("training_provider", e.target.value)}
              placeholder="Ex.: SENAI"
            />
          </div>
          <div>
            <Label>Carga horária (h)</Label>
            <Input
              type="number"
              value={extra.hours ?? ""}
              onChange={(e) => setEx("hours", e.target.value ? Number(e.target.value) : null)}
            />
          </div>
          <div>
            <Label>Data do treinamento</Label>
            <Input
              type="date"
              value={extra.training_date ?? ""}
              onChange={(e) => setEx("training_date", e.target.value || null)}
            />
          </div>
          <div>
            <Label>Certificado em</Label>
            <Input
              type="date"
              value={form.certified_at ?? ""}
              onChange={(e) => set("certified_at", e.target.value || null)}
            />
          </div>
          <div>
            <Label>Validade</Label>
            <Input
              type="date"
              value={form.expires_at ?? ""}
              onChange={(e) => set("expires_at", e.target.value || null)}
            />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="vencido">Vencido</SelectItem>
                <SelectItem value="suspenso">Suspenso</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label>Certificado (PDF / link)</Label>
            <div className="flex gap-1.5">
              <Input
                className="flex-1"
                value={extra.certificate_url ?? ""}
                onChange={(e) => setEx("certificate_url", e.target.value || null)}
                placeholder="Cole um link ou faça upload →"
              />
              <input
                ref={certFileRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleCertUpload(f);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                title="Fazer upload do certificado"
                disabled={uploading}
                className="h-9 px-2.5 rounded-md border border-input bg-background text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50 shrink-0"
                onClick={() => certFileRef.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Paperclip className="size-4" />
                )}
              </button>
            </div>
            {extra.certificate_url && (
              <a
                href={extra.certificate_url}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-primary hover:underline truncate block mt-1"
              >
                {extra.certificate_url}
              </a>
            )}
          </div>
          <div className="md:col-span-2">
            <Label>Evidência (descrição)</Label>
            <Input
              value={form.evidence ?? ""}
              onChange={(e) => set("evidence", e.target.value || null)}
            />
          </div>
          <div className="md:col-span-2">
            <Label>Observações</Label>
            <Textarea
              value={form.notes ?? ""}
              onChange={(e) => set("notes", e.target.value || null)}
              rows={2}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          {row && (
            <Button variant="ghost" onClick={handleDelete} disabled={saving}>
              <Trash2 className="size-4" /> Remover
            </Button>
          )}
          <Button variant="outline" onClick={onClose} disabled={saving}>
            <X className="size-4" /> Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="size-4" /> Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =========== Form: Função / Cargo ===========
function RoleForm({ row, onClose }: { row: JobRole | null; onClose: () => void }) {
  const [form, setForm] = useState<JobRole | null>(row);
  const [saving, setSaving] = useState(false);
  useEffect(() => setForm(row), [row]);
  if (!form) return null;
  const set = <K extends keyof JobRole>(k: K, v: JobRole[K]) => setForm({ ...form, [k]: v });

  const addReq = () =>
    set("requirements", [
      ...form.requirements,
      { id: uid(), area: "", skill: "", min_level: "basico" },
    ]);
  const updateReq = (id: string, patch: Partial<JobRoleRequirement>) =>
    set(
      "requirements",
      form.requirements.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    );
  const removeReq = (id: string) =>
    set(
      "requirements",
      form.requirements.filter((r) => r.id !== id),
    );

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Informe o nome da função");
      return;
    }
    setSaving(true);
    try {
      await upsertJobRole(form);
      toast.success("Função salva");
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };
  const handleDelete = async () => {
    if (!confirm("Remover esta função?")) return;
    setSaving(true);
    try {
      await deleteJobRole(form.id);
      toast.success("Removida");
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!form} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{row?.name ? "Editar" : "Nova"} função</DialogTitle>
          <DialogDescription>
            Defina o cargo e as competências exigidas para considerá-lo apto.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label>Nome *</Label>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Ex.: Analista de Laboratório"
            />
          </div>
          <div>
            <Label>Departamento / Setor</Label>
            <Input
              value={form.department ?? ""}
              onChange={(e) => set("department", e.target.value || null)}
            />
          </div>
          <div className="md:col-span-2">
            <Label>Descrição</Label>
            <Textarea
              rows={2}
              value={form.description ?? ""}
              onChange={(e) => set("description", e.target.value || null)}
            />
          </div>
        </div>

        <div className="mt-2">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold">Requisitos de competência</h4>
            <Button size="sm" variant="outline" onClick={addReq}>
              <Plus className="size-3.5" /> Adicionar
            </Button>
          </div>
          {form.requirements.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-3">Nenhum requisito definido.</p>
          ) : (
            <div className="space-y-2">
              {form.requirements.map((req) => (
                <div key={req.id} className="grid gap-2 grid-cols-[1fr_1fr_140px_auto] items-end">
                  <Input
                    placeholder="Área"
                    value={req.area}
                    onChange={(e) => updateReq(req.id, { area: e.target.value })}
                  />
                  <Input
                    placeholder="Competência"
                    value={req.skill}
                    onChange={(e) => updateReq(req.id, { skill: e.target.value })}
                  />
                  <Select
                    value={req.min_level}
                    onValueChange={(v) =>
                      updateReq(req.id, { min_level: v as JobRoleRequirement["min_level"] })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basico">Básico</SelectItem>
                      <SelectItem value="intermediario">Intermediário</SelectItem>
                      <SelectItem value="avancado">Avançado</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="ghost" onClick={() => removeReq(req.id)}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 mt-3">
          {row?.name && (
            <Button variant="ghost" onClick={handleDelete} disabled={saving}>
              <Trash2 className="size-4" /> Remover
            </Button>
          )}
          <Button variant="outline" onClick={onClose} disabled={saving}>
            <X className="size-4" /> Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="size-4" /> Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =========== Form: Colaborador (dados extras) ===========
function EmployeeForm({
  profileId,
  initial,
  profileName: name,
  onClose,
}: {
  profileId: string | null;
  initial: EmployeeMeta | null;
  profileName: string;
  onClose: () => void;
}) {
  const [form, setForm] = useState<EmployeeMeta | null>(initial);
  const [saving, setSaving] = useState(false);
  useEffect(() => setForm(initial), [initial]);
  if (!profileId || !form) return null;
  const set = <K extends keyof EmployeeMeta>(k: K, v: EmployeeMeta[K]) =>
    setForm({ ...form, [k]: v });

  const handleSave = async () => {
    setSaving(true);
    try {
      await setEmployeeMeta(profileId, form);
      toast.success("Colaborador atualizado");
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!profileId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Colaborador — {name}</DialogTitle>
          <DialogDescription>Dados administrativos do colaborador.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label className="text-xs">Matrícula</Label>
            <Input
              value={form.registration ?? ""}
              onChange={(e) => set("registration", e.target.value || null)}
              placeholder="Ex.: MAT-001"
            />
          </div>
          <div>
            <Label className="text-xs">Setor / Departamento</Label>
            <Input
              value={form.department ?? ""}
              onChange={(e) => set("department", e.target.value || null)}
              placeholder="Ex.: Lab. Qualidade"
            />
          </div>
          <div>
            <Label className="text-xs">Cargo / Função</Label>
            <Input
              value={form.position ?? ""}
              onChange={(e) => set("position", e.target.value || null)}
              placeholder="Ex.: Analista"
            />
          </div>
          <div>
            <Label className="text-xs">Data de admissão</Label>
            <Input
              type="date"
              value={form.admission_date ?? ""}
              onChange={(e) => set("admission_date", e.target.value || null)}
            />
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs">Situação</Label>
            <Select
              value={form.situation}
              onValueChange={(v) => set("situation", v as EmployeeMeta["situation"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
                <SelectItem value="afastado">Afastado</SelectItem>
                <SelectItem value="desligado">Desligado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            <X className="size-4" /> Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="size-4" /> Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const ACTION_META = {
  created: { label: "Criada", tone: "success" as const, Icon: Plus },
  updated: { label: "Atualizada", tone: "info" as const, Icon: Pencil },
  deleted: { label: "Removida", tone: "destructive" as const, Icon: Trash2 },
};

function HistoryTimeline({ rows }: { rows: CompetencyHistoryRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic py-4 text-center">
        Nenhum registro de alteração.
      </p>
    );
  }
  return (
    <ol className="relative border-l border-border ml-2">
      {rows.map((h) => {
        const meta = ACTION_META[h.action];
        const Icon = meta.Icon;
        return (
          <li key={h.id} className="ml-4 mb-4 last:mb-0">
            <div className="absolute -left-[7px] mt-1 size-3 rounded-full bg-primary" />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Icon className="size-3.5" />
              <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
              <span>{new Date(h.changed_at).toLocaleString("pt-BR")}</span>
              {h.changed_by_name && <span>· por {h.changed_by_name}</span>}
            </div>
            <div className="mt-1 text-sm">
              <span className="font-medium">{h.skill ?? "—"}</span>
              <span className="text-muted-foreground">
                {" "}
                · {h.area ?? "—"} · nível {h.level ?? "—"} · {h.status ?? "—"}
              </span>
            </div>
            {(h.certified_at || h.expires_at) && (
              <div className="text-xs text-muted-foreground">
                {h.certified_at && <>Certificado em {h.certified_at}</>}
                {h.certified_at && h.expires_at && " · "}
                {h.expires_at && <>Expira em {h.expires_at}</>}
              </div>
            )}
            {h.notes && <div className="text-xs text-muted-foreground mt-1">{h.notes}</div>}
          </li>
        );
      })}
    </ol>
  );
}
