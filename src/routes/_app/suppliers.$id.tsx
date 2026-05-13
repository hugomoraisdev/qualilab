import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  suppliersStore,
  ratingToClassification,
  getEvaluationStatus,
  evaluationStatusLabel,
  FREQUENCY_OPTIONS,
  addDaysISO,
} from "@/lib/suppliers-store";
import {
  supplierEvaluationsStore,
  listEvaluationsForSupplier,
} from "@/lib/supplier-evaluations-store";
import {
  supplierPortalStore,
  listSubmissionsByCode,
  statusLabel,
  statusTone,
  type SubmissionStatus,
} from "@/lib/supplier-portal-store";
import { useTableStore } from "@/lib/table-store";
import { useAuth } from "@/lib/auth";
import { ArrowLeft, Star, ExternalLink, FileText } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/suppliers/$id")({ component: SupDetail });

function SupDetail() {
  const { id } = Route.useParams();
  const suppliers = useTableStore(suppliersStore);
  useTableStore(supplierEvaluationsStore);
  useTableStore(supplierPortalStore);
  const { user } = useAuth();
  const s = suppliers.find((x) => x.id === id);

  const [score, setScore] = useState<number>(4);
  const [obs, setObs] = useState("");
  const [evalDate, setEvalDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  if (!s) {
    return (
      <>
        <Link to="/suppliers" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="size-4 mr-1" /> Voltar
        </Link>
        <p className="text-sm text-muted-foreground">Fornecedor não encontrado.</p>
      </>
    );
  }

  const evaluations = listEvaluationsForSupplier(s.id);
  const evalStatus = getEvaluationStatus(s);
  const tone =
    evalStatus === "em_dia" ? "success" :
    evalStatus === "a_vencer" ? "warning" :
    evalStatus === "vencida" ? "destructive" : "muted";

  const setFrequency = async (days: number) => {
    const next = s.last_evaluation_date ? addDaysISO(s.last_evaluation_date, days) : null;
    await suppliersStore.upsert({ ...s, evaluation_frequency_days: days, next_evaluation_date: next });
    toast.success("Frequência atualizada");
  };

  const registerEvaluation = async () => {
    if (!evalDate) { toast.error("Informe a data"); return; }
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      await supplierEvaluationsStore.upsert({
        id,
        supplier_id: s.id,
        evaluation_date: evalDate,
        score,
        observations: obs || null,
        evaluator_id: user?.id ?? null,
        evaluator_name: user?.name ?? null,
      });
      const freq = s.evaluation_frequency_days ?? 180;
      const next = addDaysISO(evalDate, freq);
      // Recalcula média (rating em escala 0-10 ≈ score*2)
      const all = [...evaluations, { score } as any];
      const avg = all.reduce((sum, e) => sum + (e.score ?? 0), 0) / all.length;
      await suppliersStore.upsert({
        ...s,
        last_evaluation_date: evalDate,
        next_evaluation_date: next,
        evaluation_frequency_days: freq,
        rating: Number((avg * 2).toFixed(1)),
      });
      setObs("");
      setScore(4);
      toast.success("Avaliação registrada");
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao registrar");
    } finally {
      setSaving(false);
    }
  };

  const updateSubmissionStatus = async (subId: string, status: SubmissionStatus) => {
    const sub = supplierPortalStore.list().find((x) => x.id === subId);
    if (!sub) return;
    await supplierPortalStore.upsert({
      ...sub,
      status,
      reviewed_by: user?.id ?? null,
      reviewed_at: new Date().toISOString(),
      linked_supplier_id: sub.linked_supplier_id ?? s.id,
    });
    toast.success(`Documento ${status === "aprovado" ? "aprovado" : status === "reprovado" ? "reprovado" : "atualizado"}`);
  };

  const submissions = s.code ? listSubmissionsByCode(s.code) : [];
  const pendingSubmissions = submissions.filter((x) => x.status === "recebido").length;

  return (
    <>
      <Link to="/suppliers" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="size-4 mr-1" /> Voltar
      </Link>
      <PageHeader
        title={s.name}
        description={`${s.code ?? s.id.slice(0, 8)} · ${s.cnpj ?? ""}`}
        actions={<StatusBadge>{ratingToClassification(s.rating)}</StatusBadge>}
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className="bg-card border border-border rounded-lg p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-3">Dados</h3>
          <dl className="text-sm space-y-1.5">
            <div className="flex justify-between"><dt className="text-muted-foreground">Categoria</dt><dd>{s.category ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Contato</dt><dd>{s.contact_name ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">E-mail</dt><dd className="text-xs">{s.email ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Telefone</dt><dd>{s.phone ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Qualificado até</dt><dd>{s.qualified_until ?? "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Nota média</dt><dd className="font-mono">{(s.rating ?? 0).toFixed(1)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Status</dt><dd><StatusBadge>{s.status}</StatusBadge></dd></div>
          </dl>
        </section>
        <section className="lg:col-span-2 bg-card border border-border rounded-lg p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-3">Endereço & observações</h3>
          <p className="text-sm whitespace-pre-line">{s.address ?? "—"}</p>
          {s.notes && <p className="text-sm text-muted-foreground mt-3 whitespace-pre-line">{s.notes}</p>}
        </section>
      </div>

      <section className="bg-card border border-border rounded-lg p-5 shadow-sm mt-4">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <div>
            <h3 className="text-sm font-semibold">Avaliações Periódicas</h3>
            <p className="text-xs text-muted-foreground">
              Última: {s.last_evaluation_date ?? "—"} · Próxima: {s.next_evaluation_date ?? "—"}
            </p>
          </div>
          <StatusBadge tone={tone}>{evaluationStatusLabel(evalStatus)}</StatusBadge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3 border border-border rounded-md p-3">
            <div>
              <Label className="text-xs">Frequência de avaliação</Label>
              <Select
                value={String(s.evaluation_frequency_days ?? "")}
                onValueChange={(v) => setFrequency(Number(v))}
              >
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {FREQUENCY_OPTIONS.map((o) => (
                    <SelectItem key={o.days} value={String(o.days)}>{o.label} ({o.days} dias)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3 border border-border rounded-md p-3">
            <h4 className="text-xs font-semibold">Registrar avaliação</h4>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Data</Label>
                <Input type="date" value={evalDate} onChange={(e) => setEvalDate(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Pontuação (1-5)</Label>
                <Select value={String(score)} onValueChange={(v) => setScore(Number(v))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n} ★</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Observações</Label>
              <Textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} className="mt-1" />
            </div>
            <Button onClick={registerEvaluation} disabled={saving} size="sm" className="w-full">
              {saving ? "Salvando…" : "Registrar avaliação"}
            </Button>
          </div>
        </div>

        <div className="mt-5">
          <h4 className="text-xs font-semibold mb-2">Histórico</h4>
          {evaluations.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma avaliação registrada.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Pontuação</TableHead>
                  <TableHead>Avaliador</TableHead>
                  <TableHead>Observações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {evaluations.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono text-xs">{e.evaluation_date}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1">
                        <Star className="size-3 fill-warning text-warning" />
                        {e.score}/5
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">{e.evaluator_name ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{e.observations ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </section>

      <section className="bg-card border border-border rounded-lg p-5 shadow-sm mt-4">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <FileText className="size-4" /> Documentos recebidos
              {pendingSubmissions > 0 && (
                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-warning px-1.5 text-[10px] font-bold text-warning-foreground">
                  {pendingSubmissions}
                </span>
              )}
            </h3>
            <p className="text-xs text-muted-foreground">
              Submissões enviadas pelo fornecedor via portal público (código <span className="font-mono">{s.code ?? "—"}</span>).
            </p>
          </div>
        </div>

        {!s.code ? (
          <p className="text-xs text-muted-foreground">Defina um código para este fornecedor para receber documentos via portal.</p>
        ) : submissions.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum documento recebido até o momento.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Protocolo</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Arquivo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell className="font-mono text-xs">{sub.protocol}</TableCell>
                  <TableCell className="text-xs">{sub.created_at?.slice(0, 10) ?? "—"}</TableCell>
                  <TableCell className="text-xs">{sub.document_type}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-xs truncate" title={sub.description ?? ""}>
                    {sub.description ?? "—"}
                  </TableCell>
                  <TableCell>
                    {sub.file_url ? (
                      <a href={sub.file_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary underline">
                        Abrir <ExternalLink className="size-3" />
                      </a>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    <StatusBadge tone={statusTone(sub.status)}>{statusLabel(sub.status)}</StatusBadge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1">
                      {sub.status !== "aprovado" && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateSubmissionStatus(sub.id, "aprovado")}>Aprovar</Button>
                      )}
                      {sub.status !== "reprovado" && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateSubmissionStatus(sub.id, "reprovado")}>Reprovar</Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </>
  );
}
