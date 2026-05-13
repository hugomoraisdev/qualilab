import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { History, Plus, Pencil, Trash2 } from "lucide-react";
import { competenciesStore, type CompetencyRow } from "@/lib/competencies-store";
import { competencyHistoryStore, type CompetencyHistoryRow } from "@/lib/competency-history-store";
import { profilesStore, profileName } from "@/lib/profiles-store";
import { useTableStore } from "@/lib/table-store";

export const Route = createFileRoute("/_app/competencies")({ component: CompPage });

function CompPage() {
  const competencies = useTableStore(competenciesStore);
  useTableStore(profilesStore);
  const history = useTableStore(competencyHistoryStore);
  const [openFor, setOpenFor] = useState<CompetencyRow | null>(null);

  const collaborators = Array.from(new Set(competencies.map((c) => c.user_id)));
  const allSkills = Array.from(new Set(competencies.map((c) => c.skill)));

  const recent = useMemo(() => history.slice(0, 30), [history]);

  return (
    <>
      <PageHeader title="Competências" description="Matriz de competências, treinamentos e histórico de alterações" />

      <Tabs defaultValue="matriz" className="mb-4">
        <TabsList>
          <TabsTrigger value="matriz">Matriz e cadastros</TabsTrigger>
          <TabsTrigger value="historico">
            <History className="size-3.5 mr-1.5" />
            Histórico geral{history.length > 0 ? ` (${history.length})` : ""}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="matriz" className="mt-4 space-y-6">
          {competencies.length > 0 && (
            <div className="bg-card border border-border rounded-lg p-5 shadow-sm overflow-x-auto">
              <h3 className="text-sm font-semibold mb-3">Matriz de competências</h3>
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="text-left py-1.5 pr-3">Colaborador</th>
                    {allSkills.map((s) => (
                      <th key={s} className="px-2 py-1.5 text-left font-medium text-muted-foreground" style={{ minWidth: 140 }}>{s}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {collaborators.map((uid) => (
                    <tr key={uid} className="border-t border-border">
                      <td className="py-2 pr-3 font-medium">{profileName(uid)}</td>
                      {allSkills.map((s) => {
                        const item = competencies.find((x) => x.user_id === uid && x.skill === s);
                        return (
                          <td key={s} className="px-2 py-2">
                            {item ? <StatusBadge>{item.status}</StatusBadge> : <span className="text-muted-foreground">—</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <DataTable
            data={competencies}
            searchKeys={["area", "skill", "level", "status"]}
            newLabel="Nova competência"
            columns={[
              { key: "user_id", header: "Colaborador", render: (r) => <span className="font-medium">{profileName(r.user_id)}</span> },
              { key: "area", header: "Área" },
              { key: "skill", header: "Competência" },
              { key: "level", header: "Nível" },
              { key: "certified_at", header: "Certificado em", render: (r) => r.certified_at ?? "—" },
              { key: "expires_at", header: "Expira em", render: (r) => r.expires_at ?? "—" },
              { key: "status", header: "Status", render: (r) => <StatusBadge>{r.status}</StatusBadge> },
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
                      onClick={(e) => { e.stopPropagation(); setOpenFor(r); }}
                    >
                      <History className="size-3.5 mr-1" /> {count}
                    </Button>
                  );
                },
              },
            ]}
          />
        </TabsContent>

        <TabsContent value="historico" className="mt-4">
          <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-semibold mb-3">Últimas alterações</h3>
            <HistoryTimeline rows={recent} />
            {history.length > recent.length && (
              <p className="text-xs text-muted-foreground mt-3">
                Mostrando {recent.length} de {history.length}. Acesse o histórico individual de cada competência para a linha completa.
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!openFor} onOpenChange={(o) => !o && setOpenFor(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Histórico — {openFor?.skill}</DialogTitle>
            <DialogDescription>
              {openFor ? `${profileName(openFor.user_id)} · ${openFor.area}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto pr-1">
            <HistoryTimeline rows={openFor ? history.filter((h) => h.competency_id === openFor.id) : []} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

const ACTION_META = {
  created: { label: "Criada", tone: "success" as const, Icon: Plus },
  updated: { label: "Atualizada", tone: "info" as const, Icon: Pencil },
  deleted: { label: "Removida", tone: "destructive" as const, Icon: Trash2 },
};

function HistoryTimeline({ rows }: { rows: CompetencyHistoryRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground italic py-4 text-center">Nenhum registro de alteração.</p>;
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
              <span className="text-muted-foreground"> · {h.area ?? "—"} · nível {h.level ?? "—"} · {h.status ?? "—"}</span>
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
