import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DOCUMENT_TYPES,
  nextSubmissionProtocol,
  type SupplierPortalSubmissionRow,
} from "@/lib/supplier-portal-store";
import { CheckCircle2 } from "lucide-react";
import logo from "@/assets/logo.png";
import { toast } from "sonner";

export const Route = createFileRoute("/suppliers/portal")({
  head: () => ({
    meta: [
      { title: "QualiLab — Portal de Fornecedores" },
      { name: "description", content: "Canal público para envio de documentos por fornecedores." },
    ],
  }),
  component: SupplierPortal,
});

function SupplierPortal() {
  const [supplierCode, setSupplierCode] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [documentType, setDocumentType] = useState<string>(DOCUMENT_TYPES[0]);
  const [description, setDescription] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [protocol, setProtocol] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setProtocol(null);
    setSupplierCode("");
    setSupplierName("");
    setContactEmail("");
    setDocumentType(DOCUMENT_TYPES[0]);
    setDescription("");
    setFileUrl("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierCode.trim() || !documentType.trim()) return;
    setSaving(true);
    try {
      const proto = await nextSubmissionProtocol();
      const row: SupplierPortalSubmissionRow = {
        id: crypto.randomUUID(),
        protocol: proto,
        supplier_code: supplierCode.trim(),
        supplier_name: supplierName.trim() || null,
        contact_email: contactEmail.trim() || null,
        document_type: documentType,
        description: description.trim() || null,
        file_url: fileUrl.trim() || null,
        status: "recebido",
        origin: "portal",
        reviewed_by: null,
        reviewed_at: null,
        review_notes: null,
        linked_supplier_id: null,
      };
      const { error } = await (supabase as any).from("supplier_portal_submissions").insert(row);
      if (error) throw error;
      setProtocol(proto);
    } catch (err: any) {
      toast.error("Erro ao enviar documento. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-card border border-border rounded-xl shadow-lg p-8">
        <div className="flex items-center gap-3 mb-6">
          <img src={logo} alt="QualiLab" className="size-10 rounded-lg object-contain bg-white p-1 ring-1 ring-border" />
          <div>
            <div className="text-lg font-semibold">QualiLab — Portal de Fornecedores</div>
            <div className="text-xs text-muted-foreground">Envio de documentos e certidões</div>
          </div>
        </div>

        {protocol ? (
          <div className="text-center space-y-3 py-6">
            <CheckCircle2 className="size-12 text-success mx-auto" />
            <h2 className="text-xl font-semibold">Documento enviado!</h2>
            <p className="text-sm text-muted-foreground">
              Sua submissão foi registrada e está aguardando análise da equipe de qualidade.
            </p>
            <div className="inline-block bg-muted rounded-md px-4 py-2 text-sm">
              Protocolo: <span className="font-mono font-semibold">{protocol}</span>
            </div>
            <div className="pt-4">
              <button onClick={reset} className="text-sm text-primary underline">
                Enviar outro documento
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Código do fornecedor *</Label>
                <Input value={supplierCode} onChange={(e) => setSupplierCode(e.target.value)} required maxLength={50} placeholder="Ex.: FORN-001" />
              </div>
              <div className="space-y-1.5">
                <Label>Razão social</Label>
                <Input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} maxLength={150} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>E-mail de contato</Label>
              <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} maxLength={150} />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo de documento *</Label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                required
              >
                {DOCUMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1500} rows={3} placeholder="Descreva brevemente o documento enviado." />
            </div>
            <div className="space-y-1.5">
              <Label>URL do arquivo (opcional)</Label>
              <Input type="url" value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} placeholder="https://..." />
              <p className="text-[11px] text-muted-foreground">Se não tiver um link, apenas descreva o documento e envie. Nossa equipe entrará em contato.</p>
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? "Enviando…" : "Enviar documento"}
            </Button>
            <div className="text-center text-xs text-muted-foreground">
              <Link to="/" className="underline hover:text-foreground">Voltar ao site</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
