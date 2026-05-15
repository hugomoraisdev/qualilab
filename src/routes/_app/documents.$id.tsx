import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuditAccess, logAudit } from "@/lib/audit";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { documentsStore, saveDocument, type DocumentRow, type DocumentClassification } from "@/lib/documents-store";
import { useTableStore } from "@/lib/table-store";
import {
  ArrowLeft,
  FileText,
  Download,
  History,
  MessageSquare,
  CheckCircle2,
  BookOpenCheck,
  GitBranch,
  Loader2,
  Send,
  ShieldCheck,
  ListChecks,
  Eye,
  Folder,
  Plus,
  Trash2,
  AlertTriangle,
  Lock,
  Printer,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { confirmRead, hasConfirmed, useDocumentReads } from "@/lib/document-reads-store";
import {
  archiveDocumentVersion,
  useDocumentVersions,
} from "@/lib/document-versions-store";
import {
  useDocumentMeta,
  addDocumentComment,
  setStageAssignment,
  signStage,
  addDistributionCopy,
  setDocumentObsolete,
  setDocumentTaxonomy,
  setCustomField,
  removeCustomField,
  logDocumentAccess,
  setDocumentBody,
  setExternalMeta,
  stageLabel,
  type Stage,
} from "@/lib/document-meta-store";
import { toast } from "sonner";
import { sendEmail } from "@/lib/send-email.functions";
import { buildDocumentWorkflowHtml, buildDocumentReadReminderHtml } from "@/lib/email-templates";
import { listProfiles } from "@/lib/profiles-store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DOCUMENT_FOLDERS,
  DOCUMENT_SECTORS,
  DOCUMENT_PROCESSES,
} from "@/lib/document-taxonomy";
import { useCustomFields } from "@/lib/custom-fields-store";
import { CustomFieldsRenderer } from "@/components/CustomFieldsRenderer";

export const Route = createFileRoute("/_app/documents/$id")({
  component: DocumentDetail,
});

/* ───────────── Helpers ───────────── */

function suggestNextVersion(current: string): string {
  const m = current.match(/^(\d+)\.(\d+)$/);
  if (!m) return `${current}.1`;
  return `${Number(m[1])}.${Number(m[2]) + 1}`;
}

/**
 * Converte uma URL (http(s) ou data:) num Blob URL utilizável para abrir
 * em nova aba ou disparar download. Necessário porque Chrome bloqueia
 * navegação top-level para `data:` URLs.
 */
async function toBlobUrl(url: string): Promise<{ blobUrl: string; mime: string } | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return { blobUrl: URL.createObjectURL(blob), mime: blob.type || "application/octet-stream" };
  } catch (err) {
    console.error("[documents] toBlobUrl:", err);
    return null;
  }
}

function extFromMime(mime: string, fallback = "bin"): string {
  const map: Record<string, string> = {
    "application/pdf": "pdf",
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
    "text/plain": "txt",
    "text/csv": "csv",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  };
  return map[mime] ?? fallback;
}

async function openFile(fileUrl: string, action: "download" | "print", fileName: string) {
  const result = await toBlobUrl(fileUrl);
  if (!result) {
    toast.error("Falha ao abrir arquivo");
    return;
  }
  const { blobUrl, mime } = result;
  if (action === "download") {
    const a = document.createElement("a");
    a.href = blobUrl;
    const hasExt = /\.[a-z0-9]{2,5}$/i.test(fileName);
    a.download = hasExt ? fileName : `${fileName}.${extFromMime(mime)}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } else {
    window.open(blobUrl, "_blank", "noopener,noreferrer");
  }
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}

const CLASSIFICATION_LABELS: Record<DocumentClassification, string> = {
  publico: "Público",
  interno: "Interno",
  restrito: "Restrito",
  confidencial: "Confidencial",
};
const CLASSIFICATION_COLORS: Record<DocumentClassification, string> = {
  publico: "bg-green-100 text-green-800 border-green-200",
  interno: "bg-blue-100 text-blue-800 border-blue-200",
  restrito: "bg-orange-100 text-orange-800 border-orange-200",
  confidencial: "bg-red-100 text-red-800 border-red-200",
};
function ClassificationBadge({ value }: { value: DocumentClassification | null | undefined }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${CLASSIFICATION_COLORS[value]}`}>
      {CLASSIFICATION_LABELS[value]}
    </span>
  );
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR");
  } catch {
    return iso;
  }
}

/* ───────────── Read confirmation ───────────── */

function ReadConfirmationCard({ doc }: { doc: DocumentRow }) {
  const { user } = useAuth();
  const reads = useDocumentReads(doc.id);
  const already = user ? hasConfirmed(doc.id, user.email) : false;
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
            documentId: doc.id,
            userId: user.id,
            userEmail: user.email,
            userName: user.name,
            documentVersion: doc.version,
          });
          await logDocumentAccess({
            documentId: doc.id,
            userId: user.id,
            userName: user.name,
            action: "read",
            version: doc.version,
          });
          toast.success("Leitura confirmada", { description: `${user.name} · v${doc.version}` });
        }}
      >
        {already ? (
          <>
            <CheckCircle2 className="size-4" /> Leitura confirmada
          </>
        ) : (
          <>Confirmar leitura</>
        )}
      </Button>

      <div className="mt-4">
        <div className="text-xs font-semibold mb-2">Confirmações registradas</div>
        {reads.length === 0 && (
          <div className="text-xs text-muted-foreground italic">Nenhuma confirmação ainda.</div>
        )}
        <ul className="space-y-1.5">
          {reads.map((r) => (
            <li
              key={`${r.user_email}-${r.confirmed_at}`}
              className="text-sm flex items-center justify-between border-t border-border pt-1.5"
            >
              <span className="flex items-center gap-2">
                <CheckCircle2 className="size-3.5 text-success" />
                {r.user_name}
              </span>
              <span className="text-xs text-muted-foreground">
                {r.document_version ? `v${r.document_version}` : `v${doc.version}`} · {new Date(r.confirmed_at).toLocaleString("pt-BR")}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ───────────── Nova revisão ───────────── */

function NewRevisionDialog({ doc }: { doc: DocumentRow }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [version, setVersion] = useState(suggestNextVersion(doc.version));
  const [reason, setReason] = useState("");
  const [fileUrl, setFileUrl] = useState(doc.file_url ?? "");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!version.trim() || version.trim() === doc.version) {
      toast.error("Informe uma nova versão diferente da atual");
      return;
    }
    setBusy(true);
    try {
      await archiveDocumentVersion({
        current: doc,
        reason: reason.trim() || null,
        archivedBy: user?.id ?? null,
        archivedByName: user?.name ?? null,
        fileUrl: doc.file_url ?? null,
        fileName: `${doc.code}-v${doc.version}.pdf`,
      });
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
    } catch (err) {
      toast.error("Falha ao criar revisão", {
        description: String((err as Error)?.message ?? err),
      });
    } finally {
      setBusy(false);
    }
  };

  const locked = doc.status === "aprovado";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={locked ? "default" : "outline"}>
          <GitBranch className="size-4" /> Nova revisão
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova revisão de documento</DialogTitle>
          <DialogDescription>
            A versão <span className="font-mono">v{doc.version}</span> será preservada no histórico.
            O documento volta para rascunho da nova versão até nova aprovação.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="nv">Nova versão</Label>
            <Input id="nv" value={version} onChange={(e) => setVersion(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="nr">Motivo da revisão</Label>
            <Textarea id="nr" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nf-upload">Arquivo do novo documento (opcional)</Label>
            <Input
              id="nf-upload"
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 10 * 1024 * 1024) {
                  toast.error("Arquivo muito grande", { description: "Limite de 10 MB." });
                  e.target.value = "";
                  return;
                }
                const reader = new FileReader();
                reader.onload = () => {
                  setFileUrl(String(reader.result ?? ""));
                  toast.success("Arquivo anexado", { description: file.name });
                };
                reader.onerror = () => toast.error("Falha ao ler arquivo");
                reader.readAsDataURL(file);
              }}
            />
            <div className="text-xs text-muted-foreground">ou informe uma URL pública abaixo (opcional)</div>
            <Input
              id="nf"
              placeholder="https://…/doc.pdf"
              value={fileUrl.startsWith("data:") ? "" : fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
            />
            {fileUrl.startsWith("data:") && (
              <div className="text-xs text-muted-foreground">
                Arquivo carregado localmente ({Math.round(fileUrl.length / 1024)} KB).
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" />} Arquivar e revisar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ───────────── Workflow ───────────── */

function StageRow({
  doc,
  stageKey,
  label,
  assignment,
  currentStage,
  onAfterSign,
}: {
  doc: DocumentRow;
  stageKey: "elaboration" | "review" | "approval";
  label: string;
  assignment: {
    user_name: string | null;
    deadline: string | null;
    signed_at: string | null;
    signed_by_name: string | null;
  };
  currentStage: Stage;
  onAfterSign?: (stage: "elaboration" | "review" | "approval") => void;
}) {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(assignment.user_name ?? "");
  const [deadline, setDeadline] = useState(assignment.deadline ?? "");

  useEffect(() => {
    setName(assignment.user_name ?? "");
    setDeadline(assignment.deadline ?? "");
  }, [assignment.user_name, assignment.deadline]);

  const stageOrder: Stage[] = ["elaboracao", "revisao", "aprovacao", "aprovado"];
  const stageMap: Record<typeof stageKey, Stage> = {
    elaboration: "elaboracao",
    review: "revisao",
    approval: "aprovacao",
  };
  const myStage = stageMap[stageKey];
  const isCurrent = currentStage === myStage;
  const overdue =
    !assignment.signed_at && assignment.deadline && new Date(assignment.deadline) < new Date();
  const order = stageOrder.indexOf(myStage);
  const cur = stageOrder.indexOf(currentStage);

  const dot = assignment.signed_at
    ? "bg-success"
    : isCurrent
      ? overdue
        ? "bg-destructive animate-pulse"
        : "bg-primary"
      : "bg-muted";

  return (
    <div className="border border-border rounded-md p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`inline-block size-2 rounded-full ${dot}`} />
          <span className="text-sm font-medium">{label}</span>
          {assignment.signed_at && <CheckCircle2 className="size-3.5 text-success" />}
          {overdue && <AlertTriangle className="size-3.5 text-destructive" />}
        </div>
        {!editing && (
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
            Editar
          </Button>
        )}
      </div>

      {editing ? (
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Responsável" value={name} onChange={(e) => setName(e.target.value)} />
          <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          <div className="col-span-2 flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={async () => {
                await setStageAssignment(doc.id, stageKey, {
                  user_name: name.trim() || null,
                  user_id: user?.id ?? null,
                  deadline: deadline || null,
                });
                setEditing(false);
                toast.success("Etapa atualizada");
                if (name.trim()) {
                  const profile = listProfiles().find((p) => p.name === name.trim());
                  if (profile?.email) {
                    sendEmail({
                      data: {
                        to: profile.email,
                        subject: `Qualilab — Documento aguarda sua ação: ${label}`,
                        html: buildDocumentWorkflowHtml({
                          docCode: doc.code,
                          docTitle: doc.title,
                          stage: label,
                          recipientName: profile.name,
                          deadline: deadline || null,
                        }),
                      },
                    }).catch(console.warn);
                  }
                }
              }}
            >
              Salvar
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-xs text-muted-foreground space-y-1">
          <div>
            <span className="font-medium text-foreground">Responsável:</span>{" "}
            {assignment.user_name ?? "—"}
          </div>
          <div>
            <span className="font-medium text-foreground">Prazo:</span>{" "}
            {assignment.deadline ? new Date(assignment.deadline).toLocaleDateString("pt-BR") : "—"}
            {overdue && <span className="ml-2 text-destructive">(atrasada)</span>}
          </div>
          {assignment.signed_at && (
            <div className="text-success">
              Assinada por {assignment.signed_by_name ?? "—"} em {fmtDate(assignment.signed_at)}
            </div>
          )}
        </div>
      )}

      {!assignment.signed_at &&
        order <= cur &&
        currentStage !== "aprovado" &&
        currentStage !== "obsoleto" && (
          <Button
            size="sm"
            disabled={!user || !isCurrent}
            onClick={async () => {
              if (!user) return;
              await signStage(doc.id, stageKey, user.name);
              if (stageKey === "approval") {
                await saveDocument({
                  ...doc,
                  status: "aprovado",
                  updated_at: new Date().toISOString(),
                });
              } else if (stageKey === "review") {
                await saveDocument({
                  ...doc,
                  status: "em_revisao",
                  updated_at: new Date().toISOString(),
                });
              }
              onAfterSign?.(stageKey);
              toast.success(`Etapa ${label.toLowerCase()} assinada`);
            }}
          >
            <ShieldCheck className="size-4" /> {isCurrent ? "Assinar" : "Aguardando etapa anterior"}
          </Button>
        )}
    </div>
  );
}

function WorkflowCard({ doc }: { doc: DocumentRow }) {
  const meta = useDocumentMeta(doc.id);
  const wf = meta.workflow;

  function notifyNextStage(signedStage: "elaboration" | "review" | "approval") {
    const stageToNext: Record<string, { key: "review" | "approval"; label: string } | null> = {
      elaboration: { key: "review", label: "Revisão" },
      review: { key: "approval", label: "Aprovação" },
      approval: null,
    };
    const next = stageToNext[signedStage];
    if (next) {
      const nextAssignment = wf[next.key];
      if (nextAssignment.user_name) {
        const profile = listProfiles().find((p) => p.name === nextAssignment.user_name);
        if (profile?.email) {
          sendEmail({
            data: {
              to: profile.email,
              subject: `Qualilab — Documento aguarda sua ação: ${next.label}`,
              html: buildDocumentWorkflowHtml({
                docCode: doc.code,
                docTitle: doc.title,
                stage: next.label,
                recipientName: profile.name,
                deadline: nextAssignment.deadline,
              }),
            },
          }).catch(console.warn);
        }
      }
    } else {
      for (const p of listProfiles()) {
        if (!p.email) continue;
        sendEmail({
          data: {
            to: p.email,
            subject: `Qualilab — Novo documento para leitura: ${doc.code}`,
            html: buildDocumentReadReminderHtml({
              docCode: doc.code,
              docTitle: doc.title,
              version: doc.version,
              recipientName: p.name,
            }),
          },
        }).catch(console.warn);
      }
    }
  }

  return (
    <section className="bg-card border border-border rounded-lg p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <ListChecks className="size-4" /> Fluxo de aprovação
        </h3>
        <StatusBadge>{stageLabel[wf.stage]}</StatusBadge>
      </div>
      <div className="space-y-2">
        <StageRow
          doc={doc}
          stageKey="elaboration"
          label="Elaboração"
          assignment={wf.elaboration}
          currentStage={wf.stage}
          onAfterSign={notifyNextStage}
        />
        <StageRow
          doc={doc}
          stageKey="review"
          label="Revisão"
          assignment={wf.review}
          currentStage={wf.stage}
          onAfterSign={notifyNextStage}
        />
        <StageRow
          doc={doc}
          stageKey="approval"
          label="Aprovação"
          assignment={wf.approval}
          currentStage={wf.stage}
          onAfterSign={notifyNextStage}
        />
      </div>
      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {meta.obsolete
            ? "Documento marcado como obsoleto."
            : "Apenas a versão vigente é distribuída."}
        </span>
        <Button
          size="sm"
          variant={meta.obsolete ? "outline" : "ghost"}
          onClick={async () => {
            await setDocumentObsolete(doc.id, !meta.obsolete);
            await saveDocument({
              ...doc,
              status: meta.obsolete ? "rascunho" : "obsoleto",
              updated_at: new Date().toISOString(),
            });
            toast.success(
              meta.obsolete ? "Documento reativado" : "Documento marcado como obsoleto",
            );
          }}
        >
          <Lock className="size-4" /> {meta.obsolete ? "Reativar" : "Marcar obsoleto"}
        </Button>
      </div>
    </section>
  );
}

/* ───────────── Comentários ───────────── */

function CommentsCard({ doc }: { doc: DocumentRow }) {
  const { user } = useAuth();
  const meta = useDocumentMeta(doc.id);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <section className="bg-card border border-border rounded-lg p-5 shadow-sm">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <MessageSquare className="size-4" /> Comunicação interna
      </h3>
      <div className="space-y-3 mb-3 max-h-72 overflow-y-auto">
        {meta.comments.length === 0 && (
          <p className="text-xs text-muted-foreground italic">Nenhuma interação ainda.</p>
        )}
        {meta.comments.map((c) => (
          <div key={c.id} className="text-sm border-l-2 border-primary pl-3">
            <div className="text-xs text-muted-foreground">
              {c.author_name} · {fmtDate(c.created_at)} · {stageLabel[c.stage]}
            </div>
            {c.text}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Textarea
          rows={2}
          placeholder="Comentar a revisão…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <Button
          disabled={!user || !text.trim() || busy}
          onClick={async () => {
            if (!user || !text.trim()) return;
            setBusy(true);
            try {
              await addDocumentComment({
                documentId: doc.id,
                authorId: user.id,
                authorName: user.name,
                text: text.trim(),
                stage: meta.workflow.stage,
              });
              setText("");
              toast.success("Comentário publicado");
            } finally {
              setBusy(false);
            }
          }}
        >
          <Send className="size-4" />
        </Button>
      </div>
    </section>
  );
}

/* ───────────── Distribuição (cópias controladas) ───────────── */

function DistributionCard({ doc }: { doc: DocumentRow }) {
  const meta = useDocumentMeta(doc.id);
  const [open, setOpen] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [copyNumber, setCopyNumber] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <section className="bg-card border border-border rounded-lg p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Printer className="size-4" /> Cópias controladas / distribuição
        </h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="size-4" /> Registrar cópia
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova cópia controlada</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Destinatário / setor</Label>
                <Input value={recipient} onChange={(e) => setRecipient(e.target.value)} />
              </div>
              <div>
                <Label>Nº da cópia</Label>
                <Input
                  value={copyNumber}
                  onChange={(e) => setCopyNumber(e.target.value)}
                  placeholder="ex.: 001"
                />
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={async () => {
                  if (!recipient.trim()) {
                    toast.error("Informe o destinatário");
                    return;
                  }
                  await addDistributionCopy(doc.id, {
                    recipient: recipient.trim(),
                    copy_number: copyNumber.trim() || "—",
                    sent_at: new Date().toISOString(),
                    returned_at: null,
                    status: "ativa",
                    notes: notes.trim() || null,
                  });
                  setRecipient("");
                  setCopyNumber("");
                  setNotes("");
                  setOpen(false);
                  toast.success("Cópia registrada");
                }}
              >
                Registrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {meta.distribution.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">Nenhuma cópia controlada registrada.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr className="text-left">
              <th>Cópia</th>
              <th>Destinatário</th>
              <th>Enviada</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {meta.distribution.map((d) => (
              <tr key={d.id} className="border-t border-border">
                <td className="py-1.5 font-mono text-xs">#{d.copy_number}</td>
                <td>{d.recipient}</td>
                <td className="text-xs">{new Date(d.sent_at).toLocaleDateString("pt-BR")}</td>
                <td>
                  <StatusBadge>{d.status}</StatusBadge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

/* ───────────── Acesso & alterações ───────────── */

function AccessLogCard({ doc }: { doc: DocumentRow }) {
  const meta = useDocumentMeta(doc.id);
  return (
    <section className="bg-card border border-border rounded-lg p-5 shadow-sm">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <Eye className="size-4" /> Histórico de acessos e alterações
        <span className="text-xs font-normal text-muted-foreground">
          ({meta.access_log.length})
        </span>
      </h3>
      {meta.access_log.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">Sem registros ainda.</p>
      ) : (
        <ul className="space-y-1 text-sm max-h-64 overflow-y-auto">
          {meta.access_log.slice(0, 50).map((e) => (
            <li
              key={e.id}
              className="flex items-center justify-between border-t border-border py-1"
            >
              <span>
                {e.user_name} · <span className="text-xs text-muted-foreground">{e.action}</span>
              </span>
              <span className="text-xs text-muted-foreground">
                v{e.version} · {fmtDate(e.at)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ───────────── Informações de documento externo ───────────── */

const EXTERNAL_CATEGORIES = new Set(["Documento Externo", "Norma externa"]);
const EXTERNAL_FOLDER = "SGQ > Documentos Externos";

function ExternalMetaSection({ doc }: { doc: DocumentRow }) {
  const meta = useDocumentMeta(doc.id);
  const isExternal =
    EXTERNAL_CATEGORIES.has(doc.category) || meta.folder === EXTERNAL_FOLDER;

  const [issuer, setIssuer] = useState(meta.external_issuer ?? "");
  const [ref, setRef] = useState(meta.external_ref ?? "");
  const [validity, setValidity] = useState(meta.external_validity ?? "");
  const [url, setUrl] = useState(meta.external_url ?? "");

  useEffect(() => {
    setIssuer(meta.external_issuer ?? "");
    setRef(meta.external_ref ?? "");
    setValidity(meta.external_validity ?? "");
    setUrl(meta.external_url ?? "");
  }, [meta.external_issuer, meta.external_ref, meta.external_validity, meta.external_url]);

  if (!isExternal) return null;

  const persist = (patch: Parameters<typeof setExternalMeta>[1]) => {
    void setExternalMeta(doc.id, patch);
  };

  return (
    <div className="border-t border-border pt-3 mt-3">
      <div className="text-xs font-semibold mb-2 flex items-center gap-1">
        <ExternalLink className="size-3.5" /> Informações do documento externo
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Órgão emissor</Label>
          <Input
            value={issuer}
            onChange={(e) => setIssuer(e.target.value)}
            onBlur={() => persist({ external_issuer: issuer.trim() || null })}
            placeholder="Ex: ABNT, ISO, ANVISA"
          />
        </div>
        <div>
          <Label className="text-xs">Número / referência</Label>
          <Input
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            onBlur={() => persist({ external_ref: ref.trim() || null })}
            placeholder="Ex: NBR ISO 9001:2015"
          />
        </div>
        <div>
          <Label className="text-xs">Data de vigência externa</Label>
          <Input
            type="date"
            value={validity}
            onChange={(e) => setValidity(e.target.value)}
            onBlur={() => persist({ external_validity: validity || null })}
          />
        </div>
        <div>
          <Label className="text-xs">URL de acesso externo</Label>
          <Input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onBlur={() => persist({ external_url: url.trim() || null })}
            placeholder="https://…"
          />
        </div>
      </div>
    </div>
  );
}

/* ───────────── Pasta / setor / processo / campos personalizados ───────────── */

function TaxonomyCard({ doc }: { doc: DocumentRow }) {
  const meta = useDocumentMeta(doc.id);
  const customFields = useCustomFields("documents");
  const [folder, setFolder] = useState(meta.folder ?? "");
  const [sector, setSector] = useState(meta.sector ?? "");
  const [process, setProcess] = useState(meta.process ?? "");
  const [folderFree, setFolderFree] = useState(false);
  const [sectorFree, setSectorFree] = useState(false);
  const [processFree, setProcessFree] = useState(false);

  useEffect(() => {
    setFolder(meta.folder ?? "");
    setSector(meta.sector ?? "");
    setProcess(meta.process ?? "");
    setFolderFree(!!meta.folder && !DOCUMENT_FOLDERS.includes(meta.folder as never));
    setSectorFree(!!meta.sector && !DOCUMENT_SECTORS.includes(meta.sector as never));
    setProcessFree(!!meta.process && !DOCUMENT_PROCESSES.includes(meta.process as never));
  }, [meta.folder, meta.sector, meta.process]);

  const FREE = "__livre__";

  const renderTaxonomySelect = (
    label: string,
    value: string,
    free: boolean,
    setFree: (b: boolean) => void,
    setValue: (v: string) => void,
    options: readonly string[],
    persist: (v: string | null) => void,
  ) => (
    <div>
      <Label className="text-xs">{label}</Label>
      <Select
        value={free ? FREE : value || undefined}
        onValueChange={(v) => {
          if (v === FREE) {
            setFree(true);
            setValue("");
            persist(null);
          } else {
            setFree(false);
            setValue(v);
            persist(v);
          }
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Selecione…" />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
          <SelectItem value={FREE}>Outro / digitar manualmente</SelectItem>
        </SelectContent>
      </Select>
      {free && (
        <Input
          className="mt-1"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => persist(value.trim() || null)}
          placeholder="Digite…"
        />
      )}
    </div>
  );

  // Mantém valores antigos vindos de campos personalizados que não estão mais
  // definidos na configuração — apenas exibimos como leitura para não perdê-los.
  const definedKeys = new Set(customFields.map((f) => f.key));
  const legacyEntries = Object.entries(meta.custom_fields).filter(([k]) => !definedKeys.has(k));

  return (
    <section className="bg-card border border-border rounded-lg p-5 shadow-sm">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <Folder className="size-4" /> Organização & campos personalizados
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        {renderTaxonomySelect(
          "Pasta",
          folder,
          folderFree,
          setFolderFree,
          setFolder,
          DOCUMENT_FOLDERS,
          (v) => setDocumentTaxonomy(doc.id, { folder: v }),
        )}
        {renderTaxonomySelect(
          "Setor",
          sector,
          sectorFree,
          setSectorFree,
          setSector,
          DOCUMENT_SECTORS,
          (v) => setDocumentTaxonomy(doc.id, { sector: v }),
        )}
        {renderTaxonomySelect(
          "Processo",
          process,
          processFree,
          setProcessFree,
          setProcess,
          DOCUMENT_PROCESSES,
          (v) => setDocumentTaxonomy(doc.id, { process: v }),
        )}
      </div>

      <div className="border-t border-border pt-3">
        <div className="text-xs font-semibold mb-2">Campos personalizados</div>
        {customFields.filter((f) => f.active).length === 0 ? (
          <p className="text-xs text-muted-foreground italic mb-2">
            Nenhum campo personalizado configurado. Configure em <strong>Configurações → Campos
            Personalizados → Documentos</strong>.
          </p>
        ) : (
          <CustomFieldsRenderer
            fields={customFields}
            values={meta.custom_fields as Record<string, never>}
            onChange={(k, v) => {
              void setCustomField(doc.id, k, v);
            }}
          />
        )}

        {legacyEntries.length > 0 && (
          <div className="mt-4 border-t border-dashed border-border pt-3">
            <div className="text-[11px] text-muted-foreground mb-1">
              Campos legados (preservados, sem definição ativa):
            </div>
            <ul className="space-y-1">
              {legacyEntries.map(([k, v]) => (
                <li key={k} className="flex items-center gap-2 text-sm">
                  <span className="font-medium min-w-[120px]">{k}:</span>
                  <span className="flex-1 text-muted-foreground">
                    {v === null || v === undefined
                      ? "—"
                      : Array.isArray(v)
                        ? v.join(", ")
                        : typeof v === "boolean"
                          ? v ? "Sim" : "Não"
                          : String(v)}
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => removeCustomField(doc.id, k)}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <ExternalMetaSection doc={doc} />
    </section>
  );
}

/* ───────────── Conteúdo do documento ───────────── */

function DocumentBodyCard({ doc }: { doc: DocumentRow }) {
  const { user } = useAuth();
  const meta = useDocumentMeta(doc.id);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const body = meta.body ?? null;

  const startEdit = () => {
    setDraft(body ?? "");
    setEditing(true);
  };

  const cancel = () => {
    setEditing(false);
    setDraft("");
  };

  const save = async () => {
    setBusy(true);
    try {
      const newBody = draft.trim() || null;
      const previousBody = body;
      await setDocumentBody(doc.id, newBody);
      logAudit({
        module: "documents",
        action: "content_edited",
        record_id: doc.id,
        record_label: doc.title,
        before: { body: previousBody, version: doc.version },
        after: { body: newBody, version: doc.version },
      });
      setEditing(false);
      setDraft("");
      toast.success("Conteúdo salvo com sucesso");
    } catch (err) {
      toast.error("Falha ao salvar conteúdo", {
        description: String((err as Error)?.message ?? err),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="bg-card border border-border rounded-lg p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <FileText className="size-4 text-primary" /> Conteúdo do documento
        </h3>
        {!editing && (
          <Button size="sm" variant="outline" onClick={startEdit}>
            Editar conteúdo
          </Button>
        )}
      </div>

      {editing ? (
        <div className="space-y-3">
          <div>
            <Label htmlFor="doc-body" className="sr-only">
              Conteúdo do documento
            </Label>
            <Textarea
              id="doc-body"
              rows={10}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Escreva o conteúdo do documento aqui…"
              className="resize-y min-h-[200px]"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={cancel} disabled={busy}>
              Cancelar
            </Button>
            <Button size="sm" onClick={save} disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />} Salvar
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-sm">
          {body ? (
            <p className="whitespace-pre-wrap text-foreground leading-relaxed">{body}</p>
          ) : (
            <p className="text-muted-foreground italic">
              Nenhum conteúdo redigido. Clique em Editar para adicionar.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

/* ───────────── Página ───────────── */

function DocumentDetail() {
  useAuditAccess("documents");
  const { user } = useAuth();
  const { id } = Route.useParams();
  const documents = useTableStore(documentsStore);
  const doc = documents.find((d) => d.id === id);
  const versions = useDocumentVersions(doc?.id);
  const meta = useDocumentMeta(doc?.id);

  // Log de visualização (uma vez por sessão por documento+versão)
  useEffect(() => {
    if (!doc || !user) return;
    const k = `viewed:${doc.id}:${doc.version}`;
    if (sessionStorage.getItem(k)) return;
    sessionStorage.setItem(k, "1");
    void logDocumentAccess({
      documentId: doc.id,
      userId: user.id,
      userName: user.name,
      action: "view",
      version: doc.version,
    });
  }, [doc, user]);

  const isObsolete = useMemo(() => {
    if (!doc) return false;
    if (meta.obsolete) return true;
    if (doc.validity && new Date(doc.validity) < new Date()) return true;
    return false;
  }, [doc, meta.obsolete]);

  if (!doc) {
    return (
      <>
        <Link
          to="/documents"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="size-4 mr-1" /> Voltar para documentos
        </Link>
        <PageHeader title="Documento não encontrado" description={id} />
      </>
    );
  }

  const handleDownload = async (action: "download" | "print" = "download") => {
    if (isObsolete) {
      toast.error("Versão obsoleta — distribuição bloqueada");
      return;
    }
    if (!doc.file_url) {
      toast.info("Nenhum arquivo anexado");
      return;
    }
    await openFile(doc.file_url, action, `${doc.code}-v${doc.version}`);
    if (user) {
      await logDocumentAccess({
        documentId: doc.id,
        userId: user.id,
        userName: user.name,
        action,
        version: doc.version,
      });
    }
  };

  return (
    <>
      <Link
        to="/documents"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="size-4 mr-1" /> Voltar para documentos
      </Link>

      {isObsolete && (
        <div className="mb-3 flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertTriangle className="size-4" /> Documento obsoleto — apenas a versão vigente aprovada
          deve ser distribuída.
        </div>
      )}
      {user?.role === "consulta" && doc.status !== "aprovado" && (
        <div className="mb-3 flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <AlertTriangle className="size-4" /> Este documento ainda não está vigente — somente documentos aprovados são oficialmente válidos.
        </div>
      )}

      <PageHeader
        title={doc.title}
        description={`Código ${doc.code} · Versão ${doc.version} · Atualizado ${fmtDate(doc.updated_at)}`}
        actions={
          <>
            <StatusBadge>{isObsolete ? "obsoleto" : doc.status}</StatusBadge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownload("download")}
              disabled={isObsolete}
            >
              <Download className="size-4" /> Baixar vigente
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDownload("print")}
              disabled={isObsolete}
            >
              <Printer className="size-4" /> Imprimir
            </Button>
            <NewRevisionDialog doc={doc} />
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <section className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-semibold mb-3">Identificação padronizada</h3>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Código</dt>
                <dd className="font-mono">{doc.code}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Categoria</dt>
                <dd>{doc.category}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Versão</dt>
                <dd className="font-mono">v{doc.version}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Validade</dt>
                <dd>{doc.validity ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Responsável</dt>
                <dd>{doc.responsible ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Pasta / setor / processo</dt>
                <dd>
                  {[meta.folder, meta.sector, meta.process].filter(Boolean).join(" / ") || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Classificação</dt>
                <dd><ClassificationBadge value={doc.classification} /></dd>
              </div>
            </dl>
          </section>

          <DocumentBodyCard doc={doc} />

          <WorkflowCard doc={doc} />

          <section className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <History className="size-4" /> Histórico de versões
                <span className="text-xs font-normal text-muted-foreground">
                  ({versions.length + 1} no total)
                </span>
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
                <tr className="border-t border-border bg-primary/5">
                  <td className="py-2 font-mono">v{doc.version}</td>
                  <td>
                    {doc.updated_at ? new Date(doc.updated_at).toLocaleDateString("pt-BR") : "—"}
                  </td>
                  <td>{doc.responsible ?? "—"}</td>
                  <td className="text-muted-foreground italic">Versão vigente</td>
                  <td>
                    <StatusBadge>{isObsolete ? "Obsoleta" : "Atual"}</StatusBadge>
                  </td>
                  <td className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDownload("download")}
                      disabled={isObsolete}
                    >
                      <Download className="size-3.5" /> Baixar
                    </Button>
                  </td>
                </tr>
                {versions.map((v) => (
                  <tr key={v.id} className="border-t border-border">
                    <td className="py-2 font-mono">v{v.version}</td>
                    <td>{new Date(v.archived_at).toLocaleDateString("pt-BR")}</td>
                    <td>{v.archived_by_name ?? v.snapshot.responsible ?? "—"}</td>
                    <td className="text-muted-foreground max-w-xs truncate" title={v.reason ?? ""}>
                      {v.reason ?? <span className="italic">—</span>}
                    </td>
                    <td>
                      <StatusBadge>Substituída</StatusBadge>
                    </td>
                    <td className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled
                        title="Apenas a versão vigente pode ser aberta"
                      >
                        <Lock className="size-3.5" /> Bloqueada
                      </Button>
                    </td>
                  </tr>
                ))}
                {versions.length === 0 && (
                  <tr className="border-t border-border">
                    <td
                      colSpan={6}
                      className="py-3 text-center text-xs text-muted-foreground italic"
                    >
                      Nenhuma revisão anterior. Use “Nova revisão” para arquivar a versão atual.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

          <CommentsCard doc={doc} />
          <DistributionCard doc={doc} />
          <AccessLogCard doc={doc} />
          <TaxonomyCard doc={doc} />
        </div>

        <aside className="space-y-4">
          <section className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <FileText className="size-4" /> Arquivo vigente
            </h3>
            <div className="border border-dashed border-border rounded-md p-4 text-center text-sm text-muted-foreground">
              {doc.code}-v{doc.version}.pdf
              <br />
              {doc.file_url ? (
                <button
                  type="button"
                  className="text-xs underline disabled:opacity-50"
                  disabled={isObsolete}
                  onClick={() => handleDownload("print")}
                >
                  Abrir
                </button>
              ) : (
                <span className="text-xs italic">sem arquivo</span>
              )}
            </div>
          </section>
          <ReadConfirmationCard doc={doc} />
        </aside>
      </div>
    </>
  );
}
