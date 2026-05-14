import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { documentsStore, saveDocument, type DocumentRow } from "@/lib/documents-store";
import { useTableStore } from "@/lib/table-store";
import {
  ArrowLeft, FileText, Download, History, MessageSquare, CheckCircle2,
  BookOpenCheck, GitBranch, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { confirmRead, hasConfirmed, useDocumentReads } from "@/lib/document-reads-store";
import {
  archiveDocumentVersion, useDocumentVersions, type DocumentVersion,
} from "@/lib/document-versions-store";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/documents/$id")({
  component: DocumentDetail,
});

function ReadConfirmationCard({ documentId }: { documentId: string }) {
  const { user } = useAuth();
  const reads = useDocumentReads(documentId);
  const already = user ? hasConfirmed(documentId, user.email) : false;
  const totalApplicable = 5;
  const pct = Math.min(100, Math.round((reads.length / totalApplicable) * 100));

  return (
    <section className="bg-card border border-border rounded-lg p-5 shadow-sm">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <BookOpenCheck className="size-4 text-primary" /> Confirmação de leitura
      </h3>
      <div className="text-xs text-muted-foreground mb-3">
        {reads.length} de {totalApplicable} colaboradores aplicáveis confirmaram leitura ({pct}%).
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden mb-4">
        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      <Button
        size="sm"
        disabled={already || !user}
        variant={already ? "outline" : "default"}
        onClick={async () => {
          if (!user) return;
          await confirmRead({
            documentId,
            userId: user.id,
            userEmail: user.email,
            userName: user.name,
          });
          toast.success("Leitura confirmada", { description: `${user.name} · ${new Date().toLocaleString("pt-BR")}` });
        }}
      >
        {already ? <><CheckCircle2 className="size-4" /> Leitura confirmada</> : <>Confirmar leitura</>}
      </Button>

      <div className="mt-4">
        <div className="text-xs font-semibold mb-2">Confirmações registradas</div>
        {reads.length === 0 && <div className="text-xs text-muted-foreground italic">Nenhuma confirmação ainda.</div>}
        <ul className="space-y-1.5">
          {reads.map((r) => (
            <li key={`${r.user_email}-${r.confirmed_at}`} className="text-sm flex items-center justify-between border-t border-border pt-1.5">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="size-3.5 text-success" />
                {r.user_name}
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(r.confirmed_at).toLocaleString("pt-BR")}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** Sugere a próxima versão (ex.: 1.0 → 1.1, 1.9 → 2.0). */
function suggestNextVersion(current: string): string {
  const m = current.match(/^(\d+)\.(\d+)$/);
  if (!m) return `${current}.1`;
  const major = Number(m[1]);
  const minor = Number(m[2]);
  return `${major}.${minor + 1}`;
}

function downloadVersion(v: DocumentVersion) {
  if (v.file_url) {
    window.open(v.file_url, "_blank", "noopener,noreferrer");
    return;
  }
  // Sem arquivo binário associado — exporta o snapshot como JSON,
  // garantindo que a versão histórica completa seja recuperável.
  const blob = new Blob([JSON.stringify(v, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = (v.file_name ?? `${v.snapshot.code}-v${v.version}`) + ".json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function NewRevisionDialog({
  doc,
  onArchived,
}: {
  doc: DocumentRow;
  onArchived: () => void;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [version, setVersion] = useState(suggestNextVersion(doc.version));
  const [reason, setReason] = useState("");
  const [fileUrl, setFileUrl] = useState(doc.file_url ?? "");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!version.trim()) {
      toast.error("Informe a nova versão");
      return;
    }
    if (version.trim() === doc.version) {
      toast.error("A nova versão deve ser diferente da atual");
      return;
    }
    setBusy(true);
    try {
      // 1. arquiva o estado atual como revisão histórica
      await archiveDocumentVersion({
        current: doc,
        reason: reason.trim() || null,
        archivedBy: user?.id ?? null,
        archivedByName: user?.name ?? null,
        fileUrl: doc.file_url ?? null,
        fileName: `${doc.code}-v${doc.version}.pdf`,
      });
      // 2. atualiza o documento com a nova versão (volta para rascunho)
      await saveDocument({
        ...doc,
        version: version.trim(),
        status: "rascunho",
        file_url: fileUrl.trim() || null,
        updated_at: new Date().toISOString(),
      });
      toast.success("Nova revisão criada", {
        description: `v${doc.version} arquivada · v${version.trim()} agora é a vigente`,
      });
      setOpen(false);
      setReason("");
      onArchived();
    } catch (err) {
      toast.error("Falha ao criar revisão", { description: String((err as Error)?.message ?? err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><GitBranch className="size-4" /> Nova revisão</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova revisão de documento</DialogTitle>
          <DialogDescription>
            A versão <span className="font-mono">v{doc.version}</span> será preservada
            no histórico e poderá ser baixada a qualquer momento. O documento passa a
            vigorar como rascunho da nova versão até nova aprovação.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="new-version">Nova versão</Label>
            <Input id="new-version" value={version} onChange={(e) => setVersion(e.target.value)} placeholder="ex.: 2.0" />
          </div>
          <div>
            <Label htmlFor="rev-reason">Motivo da revisão</Label>
            <Textarea
              id="rev-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="ex.: Atualização do item 5.2 conforme não conformidade NC-2025-014"
              rows={3}
            />
          </div>
          <div>
            <Label htmlFor="rev-file">URL do novo arquivo (opcional)</Label>
            <Input id="rev-file" value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} placeholder="https://…/doc.pdf" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancelar</Button>
          <Button onClick={submit} disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" />} Arquivar e revisar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DocumentDetail() {
  const { id } = Route.useParams();
  const documents = useTableStore(documentsStore);
  const doc = documents.find(d => d.id === id);
  const versions = useDocumentVersions(doc?.id);

  if (!doc) {
    return (
      <>
        <Link to="/documents" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="size-4 mr-1" /> Voltar para documentos
        </Link>
        <PageHeader title="Documento não encontrado" description={id} />
      </>
    );
  }

  return (
    <>
      <Link to="/documents" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="size-4 mr-1" /> Voltar para documentos
      </Link>

      <PageHeader
        title={doc.title}
        description={`Código ${doc.code} · Versão ${doc.version}`}
        actions={
          <>
            <StatusBadge>{doc.status}</StatusBadge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if ((doc as any).file_url) {
                  window.open((doc as any).file_url, "_blank", "noopener,noreferrer");
                } else {
                  toast.info("Nenhum arquivo anexado", { description: "A versão atual ainda não possui PDF." });
                }
              }}
            >
              <Download className="size-4" /> Baixar
            </Button>
            <NewRevisionDialog doc={doc} onArchived={() => { /* hook re-fetch dispara sozinho */ }} />
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <section className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-semibold mb-3">Dados gerais</h3>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-xs text-muted-foreground">Categoria</dt><dd>{doc.category}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Responsável</dt><dd>{doc.responsible}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Validade</dt><dd>{doc.validity}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Versão</dt><dd className="font-mono">v{doc.version}</dd></div>
            </dl>
          </section>

          <section className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <History className="size-4" /> Histórico de versões
                <span className="text-xs font-normal text-muted-foreground">({versions.length + 1} no total)</span>
              </h3>
            </div>
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="text-left">
                  <th className="py-1.5">Versão</th>
                  <th>Data</th>
                  <th>Autor</th>
                  <th>Motivo</th>
                  <th>Status</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {/* Versão vigente — sempre no topo */}
                <tr className="border-t border-border bg-primary/5">
                  <td className="py-2 font-mono">v{doc.version}</td>
                  <td>{doc.updated_at ? new Date(doc.updated_at).toLocaleDateString("pt-BR") : "—"}</td>
                  <td>{doc.responsible ?? "—"}</td>
                  <td className="text-muted-foreground italic">Versão vigente</td>
                  <td><StatusBadge>Atual</StatusBadge></td>
                  <td className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if ((doc as any).file_url) {
                          window.open((doc as any).file_url, "_blank", "noopener,noreferrer");
                        } else {
                          toast.info("Sem arquivo anexado");
                        }
                      }}
                    >
                      <Download className="size-3.5" /> Baixar
                    </Button>
                  </td>
                </tr>
                {/* Versões arquivadas */}
                {versions.map((v) => (
                  <tr key={v.id} className="border-t border-border">
                    <td className="py-2 font-mono">v{v.version}</td>
                    <td>{new Date(v.archived_at).toLocaleDateString("pt-BR")}</td>
                    <td>{v.archived_by_name ?? v.snapshot.responsible ?? "—"}</td>
                    <td className="text-muted-foreground max-w-xs truncate" title={v.reason ?? ""}>
                      {v.reason ?? <span className="italic">—</span>}
                    </td>
                    <td><StatusBadge>Substituída</StatusBadge></td>
                    <td className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => downloadVersion(v)}>
                        <Download className="size-3.5" /> Baixar
                      </Button>
                    </td>
                  </tr>
                ))}
                {versions.length === 0 && (
                  <tr className="border-t border-border">
                    <td colSpan={6} className="py-3 text-center text-xs text-muted-foreground italic">
                      Nenhuma revisão anterior. Use “Nova revisão” para arquivar a versão atual.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

          <section className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><MessageSquare className="size-4" /> Comentários de revisão</h3>
            <div className="space-y-3">
              <div className="text-sm border-l-2 border-primary pl-3">
                <div className="text-xs text-muted-foreground">Roberto Gestor · 2025-09-12</div>
                Atualizada seção 4 conforme requisito 7.7 da ISO/IEC 17025:2017.
              </div>
              <div className="text-sm border-l-2 border-success pl-3">
                <div className="text-xs text-muted-foreground">Carla Administradora · 2025-09-15</div>
                Revisão aprovada. Distribuir para a equipe técnica.
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><FileText className="size-4" /> Arquivo anexado</h3>
            <div className="border border-dashed border-border rounded-md p-4 text-center text-sm text-muted-foreground">
              {doc.code}-v{doc.version}.pdf<br/><span className="text-xs">2.3 MB · PDF/A</span>
            </div>
          </section>
          <section className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><CheckCircle2 className="size-4 text-success" /> Aprovações</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center justify-between"><span>Elaboração</span><span className="text-xs text-muted-foreground">Mariana T.</span></li>
              <li className="flex items-center justify-between"><span>Revisão</span><span className="text-xs text-muted-foreground">Roberto G.</span></li>
              <li className="flex items-center justify-between"><span>Aprovação</span><span className="text-xs text-muted-foreground">Carla A.</span></li>
            </ul>
          </section>
          <ReadConfirmationCard documentId={doc.id} />
        </aside>
      </div>
    </>
  );
}
