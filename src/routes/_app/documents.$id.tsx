import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { documentsStore, type DocumentRow } from "@/lib/documents-store";
import { useTableStore } from "@/lib/table-store";
import { ArrowLeft, FileText, Download, History, MessageSquare, CheckCircle2, BookOpenCheck, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { confirmRead, hasConfirmed, useDocumentReads } from "@/lib/document-reads-store";
import { supabase } from "@/integrations/supabase/client";
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

function AttachmentCard({ doc }: { doc: DocumentRow }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const safeName = file.name.replace(/[/\\.:]/g, "_");
      const path = `${doc.id}/${safeName}`;
      const { error } = await supabase.storage
        .from("document-attachments")
        .upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage
        .from("document-attachments")
        .getPublicUrl(path);
      await documentsStore.upsert({ ...doc, attachment_url: data.publicUrl });
      if (fileRef.current) fileRef.current.value = "";
      toast.success("Arquivo anexado com sucesso");
    } catch {
      toast.error("Falha ao anexar arquivo");
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="bg-card border border-border rounded-lg p-5 shadow-sm">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <FileText className="size-4" /> Arquivo anexo
      </h3>
      {doc.attachment_url ? (
        <div className="space-y-3">
          <a
            href={doc.attachment_url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-sm text-primary hover:underline break-all"
          >
            <Download className="size-4 shrink-0" />
            {decodeURIComponent(doc.attachment_url.split("/").pop() ?? "Arquivo")}
          </a>
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="size-4 animate-spin mr-1" />
            ) : (
              <Upload className="size-4 mr-1" />
            )}
            Substituir arquivo
          </Button>
        </div>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="size-4 animate-spin mr-1" />
          ) : (
            <Upload className="size-4 mr-1" />
          )}
          Anexar arquivo
        </Button>
      )}
      <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} />
    </section>
  );
}

function DocumentDetail() {
  const { id } = Route.useParams();
  const documents = useTableStore(documentsStore);
  const doc = documents.find(d => d.id === id);

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

  const versions = [
    { v: doc.version, date: "2025-09-15", author: doc.responsible ?? "—", status: "Atual" },
    { v: "1.0", date: "2024-02-10", author: doc.responsible ?? "—", status: "Substituída" },
  ];

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
            <Button variant="outline" size="sm"><Download className="size-4" /> Baixar</Button>
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
              <h3 className="text-sm font-semibold flex items-center gap-2"><History className="size-4" /> Histórico de versões</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground"><tr className="text-left"><th className="py-1.5">Versão</th><th>Data</th><th>Autor</th><th>Status</th></tr></thead>
              <tbody>
                {versions.map((v, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="py-2 font-mono">v{v.v}</td><td>{v.date}</td><td>{v.author}</td><td><StatusBadge>{v.status}</StatusBadge></td>
                  </tr>
                ))}
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
          <AttachmentCard doc={doc} />
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
