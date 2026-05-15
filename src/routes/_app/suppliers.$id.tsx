import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAuditAccess } from "@/lib/audit";
import { PageHeader } from "@/components/PageHeader";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import {
  useSupplierMeta,
  updateSupplierMeta,
  classificationLabel,
  classificationTone,
  deriveDocumentStatus,
  type SupplierStrategicClassification,
  type SupplierDocument,
  type SupplierDocumentRequest,
  type SupplierInspection,
  type SupplierMessage,
  type PurchaseOrder,
  type PurchaseOrderField,
} from "@/lib/supplier-meta-store";
import { actionPlansStore, saveActionPlan, type ActionPlanRow } from "@/lib/action-plans-store";
import { profilesStore } from "@/lib/profiles-store";
import { sendEmail } from "@/lib/send-email.functions";
import { useServerFn } from "@tanstack/react-start";
import { useTableStore } from "@/lib/table-store";
import { useAuth } from "@/lib/auth";
import {
  ArrowLeft,
  Star,
  ExternalLink,
  FileText,
  Plus,
  Trash2,
  Send,
  MessageSquare,
  ClipboardList,
  ShoppingCart,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/suppliers/$id")({ component: SupDetail });

function SupDetail() {
  useAuditAccess("suppliers");
  const { id } = Route.useParams();
  const suppliers = useTableStore(suppliersStore);
  useTableStore(supplierEvaluationsStore);
  useTableStore(supplierPortalStore);
  const actionPlans = useTableStore(actionPlansStore);
  const profiles = useTableStore(profilesStore);
  const { user } = useAuth();
  const s = suppliers.find((x) => x.id === id);
  const { meta } = useSupplierMeta(id);
  const sendEmailFn = useServerFn(sendEmail);

  const [score, setScore] = useState<number>(4);
  const [obs, setObs] = useState("");
  const [evalDate, setEvalDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [newActionDesc, setNewActionDesc] = useState("");
  const [newActionResponsible, setNewActionResponsible] = useState("");
  const [newActionDeadline, setNewActionDeadline] = useState("");
  const [newActionPriority, setNewActionPriority] = useState("media");
  const [newOrder, setNewOrder] = useState<{
    order_number: string;
    description: string;
    date: string;
    status: PurchaseOrder["status"];
    value: string;
    notes: string;
  }>({
    order_number: "",
    description: "",
    date: new Date().toISOString().slice(0, 10),
    status: "solicitado",
    value: "",
    notes: "",
  });
  const [pendingCfs, setPendingCfs] = useState<PurchaseOrderField[]>([]);
  const [cfLabel, setCfLabel] = useState("");
  const [cfValue, setCfValue] = useState("");
  const [newDoc, setNewDoc] = useState<Partial<SupplierDocument>>({
    type: "",
    validity: "",
    url: "",
    number: "",
  });
  const [newReq, setNewReq] = useState<Partial<SupplierDocumentRequest>>({
    document_type: "",
    description: "",
    due_date: "",
  });
  const [requesting, setRequesting] = useState(false);
  const [newInsp, setNewInsp] = useState<Partial<SupplierInspection>>({
    inspection_date: new Date().toISOString().slice(0, 10),
    type: "Recebimento",
    result: "aprovado",
  });
  const [msg, setMsg] = useState("");

  if (!s) {
    return (
      <>
        <Link
          to="/suppliers"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="size-4 mr-1" /> Voltar
        </Link>
        <p className="text-sm text-muted-foreground">Fornecedor não encontrado.</p>
      </>
    );
  }

  const evaluations = listEvaluationsForSupplier(s.id);
  const evalStatus = getEvaluationStatus(s);
  const tone =
    evalStatus === "em_dia"
      ? "success"
      : evalStatus === "a_vencer"
        ? "warning"
        : evalStatus === "vencida"
          ? "destructive"
          : "muted";
  const actor = user?.name ?? user?.email ?? null;
  const supplierActions = actionPlans.filter(
    (a) => a.origin_type === "supplier" && a.origin_id === s.id,
  );

  const setFrequency = async (days: number) => {
    const next = s.last_evaluation_date ? addDaysISO(s.last_evaluation_date, days) : null;
    await suppliersStore.upsert({
      ...s,
      evaluation_frequency_days: days,
      next_evaluation_date: next,
    });
    toast.success("Frequência atualizada");
  };

  const setStrategicClassification = async (c: SupplierStrategicClassification) => {
    await updateSupplierMeta(id, (m) => ({ ...m, classification: c }), {
      action: "Classificação alterada",
      detail: c ? classificationLabel[c] : "Não definida",
      actor,
    });
    toast.success("Classificação atualizada");
  };

  const registerEvaluation = async () => {
    if (!evalDate) {
      toast.error("Informe a data");
      return;
    }
    setSaving(true);
    try {
      const evId = crypto.randomUUID();
      await supplierEvaluationsStore.upsert({
        id: evId,
        supplier_id: s.id,
        evaluation_date: evalDate,
        score,
        observations: obs || null,
        evaluator_id: user?.id ?? null,
        evaluator_name: user?.name ?? null,
      });
      const freq = s.evaluation_frequency_days ?? 180;
      const next = addDaysISO(evalDate, freq);
      const all = [...evaluations, { score } as { score: number }];
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
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao registrar");
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
    toast.success(
      `Documento ${status === "aprovado" ? "aprovado" : status === "reprovado" ? "reprovado" : "atualizado"}`,
    );
  };

  const submissions = s.code ? listSubmissionsByCode(s.code) : [];
  const pendingSubmissions = submissions.filter((x) => x.status === "recebido").length;
  const expiredDocs = meta.documents.filter((d) => deriveDocumentStatus(d) === "vencido").length;
  const pendingRequests = meta.requested_documents.filter((r) => r.status === "pendente").length;

  // ===== Documentos internos =====
  const addDocument = async () => {
    if (!newDoc.type) {
      toast.error("Tipo do documento é obrigatório");
      return;
    }
    const doc: SupplierDocument = {
      id: crypto.randomUUID(),
      type: newDoc.type,
      number: newDoc.number || null,
      issued_at: null,
      validity: newDoc.validity || null,
      url: newDoc.url || null,
      notes: null,
      status: deriveDocumentStatus({ validity: newDoc.validity || null }),
      uploaded_at: new Date().toISOString(),
    };
    await updateSupplierMeta(id, (m) => ({ ...m, documents: [doc, ...m.documents] }), {
      action: "Documento adicionado",
      detail: doc.type,
      actor,
    });
    setNewDoc({ type: "", validity: "", url: "", number: "" });
    toast.success("Documento cadastrado");
  };
  const removeDocument = async (docId: string) => {
    await updateSupplierMeta(
      id,
      (m) => ({ ...m, documents: m.documents.filter((d) => d.id !== docId) }),
      {
        action: "Documento removido",
        actor,
      },
    );
  };

  // ===== Solicitações =====
  const addRequest = async (sendByEmail: boolean) => {
    if (!newReq.document_type) {
      toast.error("Tipo do documento é obrigatório");
      return;
    }
    setRequesting(true);
    try {
      const req: SupplierDocumentRequest = {
        id: crypto.randomUUID(),
        document_type: newReq.document_type,
        description: newReq.description || null,
        requested_at: new Date().toISOString(),
        due_date: newReq.due_date || null,
        status: "pendente",
        email_sent_at: null,
      };
      if (sendByEmail) {
        if (!s.email) {
          toast.error("Fornecedor sem e-mail cadastrado");
          setRequesting(false);
          return;
        }
        try {
          await sendEmailFn({
            data: {
              to: s.email,
              subject: `[Qualilab] Solicitação de documento — ${req.document_type}`,
              html: `
                <p>Olá ${s.contact_name ?? s.name},</p>
                <p>Solicitamos o envio do documento <strong>${req.document_type}</strong>.</p>
                ${req.description ? `<p>${req.description}</p>` : ""}
                ${req.due_date ? `<p>Prazo: <strong>${req.due_date}</strong></p>` : ""}
                <p>Acesse o portal para enviar usando o código <strong>${s.code ?? ""}</strong>.</p>
                <p>Obrigado.</p>
              `,
            },
          });
          req.email_sent_at = new Date().toISOString();
          toast.success("Solicitação enviada por e-mail");
        } catch (e) {
          toast.error(`E-mail não enviado: ${e instanceof Error ? e.message : "erro"}`);
        }
      }
      await updateSupplierMeta(
        id,
        (m) => ({ ...m, requested_documents: [req, ...m.requested_documents] }),
        {
          action: "Documento solicitado",
          detail: req.document_type,
          actor,
        },
      );
      setNewReq({ document_type: "", description: "", due_date: "" });
    } finally {
      setRequesting(false);
    }
  };
  const updateRequest = async (rid: string, patch: Partial<SupplierDocumentRequest>) => {
    await updateSupplierMeta(
      id,
      (m) => ({
        ...m,
        requested_documents: m.requested_documents.map((r) =>
          r.id === rid ? { ...r, ...patch } : r,
        ),
      }),
      { action: `Solicitação ${patch.status ?? "atualizada"}`, actor },
    );
  };

  // ===== Inspeções =====
  const addInspection = async () => {
    if (!newInsp.inspection_date || !newInsp.type) {
      toast.error("Data e tipo são obrigatórios");
      return;
    }
    const insp: SupplierInspection = {
      id: crypto.randomUUID(),
      inspection_date: newInsp.inspection_date,
      type: newInsp.type,
      result: (newInsp.result as SupplierInspection["result"]) ?? "aprovado",
      inspector_name: user?.name ?? null,
      observations: newInsp.observations || null,
    };
    await updateSupplierMeta(id, (m) => ({ ...m, inspections: [insp, ...m.inspections] }), {
      action: "Inspeção registrada",
      detail: `${insp.type} — ${insp.result}`,
      actor,
    });
    setNewInsp({
      inspection_date: new Date().toISOString().slice(0, 10),
      type: "Recebimento",
      result: "aprovado",
    });
    toast.success("Inspeção registrada");
  };

  // ===== Mensagens =====
  const sendMessage = async () => {
    if (!msg.trim()) return;
    const m: SupplierMessage = {
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      author_name: user?.name ?? user?.email ?? "Interno",
      author_role: "interno",
      body: msg.trim(),
    };
    await updateSupplierMeta(id, (mm) => ({ ...mm, messages: [...mm.messages, m] }), {
      action: "Mensagem enviada",
      actor,
    });
    setMsg("");
  };

  const createAction = async () => {
    if (!newActionDesc.trim()) {
      toast.error("Informe a descrição da ação");
      return;
    }
    const row: ActionPlanRow = {
      id: `AP-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      code: null,
      origin_type: "supplier",
      origin_id: s.id,
      description: newActionDesc.trim(),
      responsible_id: newActionResponsible || null,
      deadline: newActionDeadline || null,
      priority: newActionPriority,
      status: "pendente",
      progress: 0,
      notes: null,
    };
    await saveActionPlan(row);
    setNewActionDesc("");
    setNewActionResponsible("");
    setNewActionDeadline("");
    setNewActionPriority("media");
    toast.success("Ação criada");
  };

  const addOrder = async () => {
    if (!newOrder.order_number.trim() || !newOrder.description.trim()) {
      toast.error("Número do pedido e descrição são obrigatórios");
      return;
    }
    const order: PurchaseOrder = {
      id: crypto.randomUUID(),
      order_number: newOrder.order_number.trim(),
      description: newOrder.description.trim(),
      date: newOrder.date,
      expected_delivery: null,
      status: newOrder.status,
      value: newOrder.value ? parseFloat(newOrder.value) : null,
      notes: newOrder.notes || null,
      custom_fields: pendingCfs,
    };
    await updateSupplierMeta(
      id,
      (m) => ({ ...m, purchase_orders: [order, ...(m.purchase_orders ?? [])] }),
      {
        action: "Aquisição registrada",
        detail: `${order.order_number} — ${order.description}`,
        actor,
      },
    );
    setNewOrder({
      order_number: "",
      description: "",
      date: new Date().toISOString().slice(0, 10),
      status: "solicitado",
      value: "",
      notes: "",
    });
    setPendingCfs([]);
    setCfLabel("");
    setCfValue("");
    toast.success("Aquisição registrada");
  };

  const updateOrderStatus = async (orderId: string, status: PurchaseOrder["status"]) => {
    await updateSupplierMeta(
      id,
      (m) => ({
        ...m,
        purchase_orders: (m.purchase_orders ?? []).map((o) =>
          o.id === orderId ? { ...o, status } : o,
        ),
      }),
      { action: `Aquisição ${status}`, actor },
    );
  };

  const removeOrder = async (orderId: string) => {
    await updateSupplierMeta(
      id,
      (m) => ({
        ...m,
        purchase_orders: (m.purchase_orders ?? []).filter((o) => o.id !== orderId),
      }),
      { action: "Aquisição removida", actor },
    );
  };

  return (
    <>
      <Link
        to="/suppliers"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="size-4 mr-1" /> Voltar
      </Link>
      <PageHeader
        title={s.name}
        description={`${s.code ?? s.id.slice(0, 8)} · ${s.cnpj ?? ""}`}
        actions={
          <div className="flex items-center gap-2">
            {meta.classification && (
              <StatusBadge tone={classificationTone(meta.classification)}>
                {classificationLabel[meta.classification]}
              </StatusBadge>
            )}
            <StatusBadge>{ratingToClassification(s.rating)}</StatusBadge>
          </div>
        }
      />

      <Tabs defaultValue="geral" className="mt-2">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="avaliacoes">Avaliações</TabsTrigger>
          <TabsTrigger value="documentos">
            Documentos{" "}
            {expiredDocs > 0 && <span className="ml-1 text-destructive">({expiredDocs})</span>}
          </TabsTrigger>
          <TabsTrigger value="solicitacoes">
            Solicitações{" "}
            {pendingRequests > 0 && <span className="ml-1 text-warning">({pendingRequests})</span>}
          </TabsTrigger>
          <TabsTrigger value="inspecoes">Inspeções</TabsTrigger>
          <TabsTrigger value="portal">
            Portal{" "}
            {pendingSubmissions > 0 && (
              <span className="ml-1 text-warning">({pendingSubmissions})</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="comunicacao">Comunicação</TabsTrigger>
          <TabsTrigger value="acoes">Ações ({supplierActions.length})</TabsTrigger>
          <TabsTrigger value="aquisicoes">
            Aquisições ({(meta.purchase_orders ?? []).length})
          </TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        {/* ============ GERAL ============ */}
        <TabsContent value="geral" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <section className="bg-card border border-border rounded-lg p-5 shadow-sm">
              <h3 className="text-sm font-semibold mb-3">Dados</h3>
              <dl className="text-sm space-y-1.5">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Categoria</dt>
                  <dd>{s.category ?? "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Contato</dt>
                  <dd>{s.contact_name ?? "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">E-mail</dt>
                  <dd className="text-xs">{s.email ?? "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Telefone</dt>
                  <dd>{s.phone ?? "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Qualificado até</dt>
                  <dd>{s.qualified_until ?? "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Nota média</dt>
                  <dd className="font-mono">{(s.rating ?? 0).toFixed(1)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Status</dt>
                  <dd>
                    <StatusBadge>{s.status}</StatusBadge>
                  </dd>
                </div>
              </dl>
            </section>
            <section className="bg-card border border-border rounded-lg p-5 shadow-sm">
              <h3 className="text-sm font-semibold mb-3">Classificação estratégica</h3>
              <p className="text-xs text-muted-foreground mb-2">
                Categorize a criticidade do fornecedor para o negócio.
              </p>
              <Select
                value={meta.classification ?? "nenhuma"}
                onValueChange={(v) =>
                  setStrategicClassification(
                    v === "nenhuma" ? null : (v as SupplierStrategicClassification),
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhuma">Não definida</SelectItem>
                  <SelectItem value="critico">Crítico</SelectItem>
                  <SelectItem value="estrategico">Estratégico</SelectItem>
                  <SelectItem value="operacional">Operacional</SelectItem>
                  <SelectItem value="nao_critico">Não crítico</SelectItem>
                </SelectContent>
              </Select>
            </section>
            <section className="bg-card border border-border rounded-lg p-5 shadow-sm">
              <h3 className="text-sm font-semibold mb-3">Endereço & observações</h3>
              <p className="text-sm whitespace-pre-line">{s.address ?? "—"}</p>
              {s.notes && (
                <p className="text-sm text-muted-foreground mt-3 whitespace-pre-line">{s.notes}</p>
              )}
            </section>
          </div>
        </TabsContent>

        {/* ============ AVALIAÇÕES ============ */}
        <TabsContent value="avaliacoes" className="mt-4">
          <section className="bg-card border border-border rounded-lg p-5 shadow-sm">
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
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {FREQUENCY_OPTIONS.map((o) => (
                        <SelectItem key={o.days} value={String(o.days)}>
                          {o.label} ({o.days} dias)
                        </SelectItem>
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
                    <Input
                      type="date"
                      value={evalDate}
                      onChange={(e) => setEvalDate(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Pontuação (1-5)</Label>
                    <Select value={String(score)} onValueChange={(v) => setScore(Number(v))}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n} ★
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Observações</Label>
                  <Textarea
                    value={obs}
                    onChange={(e) => setObs(e.target.value)}
                    rows={2}
                    className="mt-1"
                  />
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
                        <TableCell className="text-xs text-muted-foreground">
                          {e.observations ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </section>
        </TabsContent>

        {/* ============ DOCUMENTOS INTERNOS ============ */}
        <TabsContent value="documentos" className="mt-4">
          <section className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-semibold mb-3">Documentos do fornecedor</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-4">
              <Input
                placeholder="Tipo (ex: ISO 9001)"
                value={newDoc.type ?? ""}
                onChange={(e) => setNewDoc({ ...newDoc, type: e.target.value })}
              />
              <Input
                placeholder="Número"
                value={newDoc.number ?? ""}
                onChange={(e) => setNewDoc({ ...newDoc, number: e.target.value })}
              />
              <Input
                type="date"
                value={newDoc.validity ?? ""}
                onChange={(e) => setNewDoc({ ...newDoc, validity: e.target.value })}
              />
              <Input
                placeholder="URL do arquivo"
                value={newDoc.url ?? ""}
                onChange={(e) => setNewDoc({ ...newDoc, url: e.target.value })}
              />
              <Button onClick={addDocument} size="sm">
                <Plus className="size-4 mr-1" />
                Adicionar
              </Button>
            </div>
            {meta.documents.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum documento cadastrado.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Número</TableHead>
                    <TableHead>Validade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Arquivo</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {meta.documents.map((d) => {
                    const st = deriveDocumentStatus(d);
                    return (
                      <TableRow key={d.id}>
                        <TableCell className="text-xs font-medium">{d.type}</TableCell>
                        <TableCell className="text-xs">{d.number ?? "—"}</TableCell>
                        <TableCell className="text-xs">{d.validity ?? "—"}</TableCell>
                        <TableCell>
                          <StatusBadge tone={st === "vencido" ? "destructive" : "success"}>
                            {st}
                          </StatusBadge>
                        </TableCell>
                        <TableCell>
                          {d.url ? (
                            <a
                              href={d.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-primary inline-flex items-center gap-1"
                            >
                              Abrir <ExternalLink className="size-3" />
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="icon" variant="ghost" onClick={() => removeDocument(d.id)}>
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </section>
        </TabsContent>

        {/* ============ SOLICITAÇÕES ============ */}
        <TabsContent value="solicitacoes" className="mt-4">
          <section className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-semibold mb-3">Solicitar documentos do fornecedor</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-4">
              <Input
                placeholder="Tipo"
                value={newReq.document_type ?? ""}
                onChange={(e) => setNewReq({ ...newReq, document_type: e.target.value })}
              />
              <Input
                placeholder="Descrição"
                value={newReq.description ?? ""}
                onChange={(e) => setNewReq({ ...newReq, description: e.target.value })}
              />
              <Input
                type="date"
                placeholder="Prazo"
                value={newReq.due_date ?? ""}
                onChange={(e) => setNewReq({ ...newReq, due_date: e.target.value })}
              />
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addRequest(false)}
                  disabled={requesting}
                  className="flex-1"
                >
                  <Plus className="size-4 mr-1" />
                  Registrar
                </Button>
                <Button
                  size="sm"
                  onClick={() => addRequest(true)}
                  disabled={requesting || !s.email}
                >
                  <Send className="size-4 mr-1" />
                  Enviar
                </Button>
              </div>
            </div>
            {!s.email && (
              <p className="text-xs text-warning mb-2">
                Cadastre um e-mail para o fornecedor para habilitar envio automático.
              </p>
            )}
            {meta.requested_documents.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma solicitação registrada.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Solicitado</TableHead>
                    <TableHead>Prazo</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {meta.requested_documents.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs font-medium">{r.document_type}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                        {r.description ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs">{r.requested_at.slice(0, 10)}</TableCell>
                      <TableCell className="text-xs">{r.due_date ?? "—"}</TableCell>
                      <TableCell className="text-xs">
                        {r.email_sent_at ? "✓ enviado" : "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          tone={
                            r.status === "atendido"
                              ? "success"
                              : r.status === "cancelado"
                                ? "muted"
                                : "warning"
                          }
                        >
                          {r.status}
                        </StatusBadge>
                      </TableCell>
                      <TableCell className="text-right">
                        {r.status === "pendente" && (
                          <div className="inline-flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() =>
                                updateRequest(r.id, {
                                  status: "atendido",
                                  fulfilled_at: new Date().toISOString(),
                                })
                              }
                            >
                              Atendido
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={() => updateRequest(r.id, { status: "cancelado" })}
                            >
                              Cancelar
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </section>
        </TabsContent>

        {/* ============ INSPEÇÕES ============ */}
        <TabsContent value="inspecoes" className="mt-4">
          <section className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-semibold mb-3">Inspeções</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-4">
              <Input
                type="date"
                value={newInsp.inspection_date ?? ""}
                onChange={(e) => setNewInsp({ ...newInsp, inspection_date: e.target.value })}
              />
              <Select
                value={newInsp.type ?? "Recebimento"}
                onValueChange={(v) => setNewInsp({ ...newInsp, type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Recebimento">Recebimento</SelectItem>
                  <SelectItem value="Auditoria in loco">Auditoria in loco</SelectItem>
                  <SelectItem value="Qualidade">Qualidade</SelectItem>
                  <SelectItem value="Outros">Outros</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={newInsp.result ?? "aprovado"}
                onValueChange={(v) =>
                  setNewInsp({ ...newInsp, result: v as SupplierInspection["result"] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                  <SelectItem value="aprovado_restricao">Aprovado c/ restrição</SelectItem>
                  <SelectItem value="reprovado">Reprovado</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Observações"
                value={newInsp.observations ?? ""}
                onChange={(e) => setNewInsp({ ...newInsp, observations: e.target.value })}
              />
              <Button onClick={addInspection} size="sm">
                <Plus className="size-4 mr-1" />
                Registrar
              </Button>
            </div>
            {meta.inspections.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma inspeção registrada.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Resultado</TableHead>
                    <TableHead>Inspetor</TableHead>
                    <TableHead>Observações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {meta.inspections.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell className="text-xs font-mono">{i.inspection_date}</TableCell>
                      <TableCell className="text-xs">{i.type}</TableCell>
                      <TableCell>
                        <StatusBadge
                          tone={
                            i.result === "aprovado"
                              ? "success"
                              : i.result === "reprovado"
                                ? "destructive"
                                : "warning"
                          }
                        >
                          {i.result}
                        </StatusBadge>
                      </TableCell>
                      <TableCell className="text-xs">{i.inspector_name ?? "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {i.observations ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </section>
        </TabsContent>

        {/* ============ PORTAL ============ */}
        <TabsContent value="portal" className="mt-4">
          <section className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="size-4" /> Documentos recebidos via portal
                </h3>
                <p className="text-xs text-muted-foreground">
                  Submissões enviadas pelo fornecedor (código{" "}
                  <span className="font-mono">{s.code ?? "—"}</span>).
                </p>
              </div>
            </div>
            {!s.code ? (
              <p className="text-xs text-muted-foreground">
                Defina um código para este fornecedor.
              </p>
            ) : submissions.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum documento recebido.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Protocolo</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Arquivo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell className="font-mono text-xs">{sub.protocol}</TableCell>
                      <TableCell className="text-xs">
                        {sub.created_at?.slice(0, 10) ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs">{sub.document_type}</TableCell>
                      <TableCell>
                        {sub.file_url ? (
                          <a
                            href={sub.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary"
                          >
                            <ExternalLink className="size-3" />
                          </a>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge tone={statusTone(sub.status)}>
                          {statusLabel(sub.status)}
                        </StatusBadge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex gap-1">
                          {sub.status !== "aprovado" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => updateSubmissionStatus(sub.id, "aprovado")}
                            >
                              Aprovar
                            </Button>
                          )}
                          {sub.status !== "reprovado" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => updateSubmissionStatus(sub.id, "reprovado")}
                            >
                              Reprovar
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </section>
        </TabsContent>

        {/* ============ COMUNICAÇÃO ============ */}
        <TabsContent value="comunicacao" className="mt-4">
          <section className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <MessageSquare className="size-4" />
              Comunicação estruturada
            </h3>
            <div className="space-y-2 max-h-96 overflow-y-auto mb-4">
              {meta.messages.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhuma mensagem ainda.</p>
              ) : (
                meta.messages.map((m) => (
                  <div key={m.id} className="border border-border rounded-md p-3">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span className="font-medium">
                        {m.author_name} <span className="text-[10px]">({m.author_role})</span>
                      </span>
                      <span>{new Date(m.at).toLocaleString("pt-BR")}</span>
                    </div>
                    <p className="text-sm whitespace-pre-line">{m.body}</p>
                  </div>
                ))
              )}
            </div>
            <div className="flex gap-2">
              <Textarea
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                rows={2}
                placeholder="Escreva uma mensagem…"
                className="flex-1"
              />
              <Button onClick={sendMessage} disabled={!msg.trim()}>
                <Send className="size-4 mr-1" />
                Enviar
              </Button>
            </div>
          </section>
        </TabsContent>

        {/* ============ AÇÕES ============ */}
        <TabsContent value="acoes" className="mt-4 space-y-4">
          <section className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <ClipboardList className="size-4" /> Nova ação vinculada a este fornecedor
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
              <div className="md:col-span-2">
                <Input
                  placeholder="Descrição da ação *"
                  value={newActionDesc}
                  onChange={(e) => setNewActionDesc(e.target.value)}
                />
              </div>
              <Select value={newActionResponsible} onValueChange={setNewActionResponsible}>
                <SelectTrigger>
                  <SelectValue placeholder="Responsável" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— Sem responsável —</SelectItem>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={newActionDeadline}
                onChange={(e) => setNewActionDeadline(e.target.value)}
              />
            </div>
            <div className="flex gap-2 items-center">
              <Select value={newActionPriority} onValueChange={setNewActionPriority}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="critica">Crítica</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={createAction} size="sm">
                <Plus className="size-4 mr-1" />
                Criar ação
              </Button>
            </div>
          </section>
          <section className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-semibold mb-3">Ações relacionadas a este fornecedor</h3>
            {supplierActions.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Nenhuma ação registrada para este fornecedor.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Prazo</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supplierActions.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="text-sm">{a.description}</TableCell>
                      <TableCell className="text-xs">
                        {profiles.find((p) => p.id === a.responsible_id)?.name ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs">{a.deadline ?? "—"}</TableCell>
                      <TableCell>
                        <StatusBadge>{a.priority}</StatusBadge>
                      </TableCell>
                      <TableCell>
                        <StatusBadge>{a.status}</StatusBadge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </section>
        </TabsContent>

        {/* ============ AQUISIÇÕES ============ */}
        <TabsContent value="aquisicoes" className="mt-4 space-y-4">
          <section className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <ShoppingCart className="size-4" /> Registrar aquisição
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
              <Input
                placeholder="Nº do pedido *"
                value={newOrder.order_number}
                onChange={(e) => setNewOrder({ ...newOrder, order_number: e.target.value })}
              />
              <div className="md:col-span-2">
                <Input
                  placeholder="Descrição *"
                  value={newOrder.description}
                  onChange={(e) => setNewOrder({ ...newOrder, description: e.target.value })}
                />
              </div>
              <Input
                type="date"
                value={newOrder.date}
                onChange={(e) => setNewOrder({ ...newOrder, date: e.target.value })}
              />
              <Select
                value={newOrder.status}
                onValueChange={(v) =>
                  setNewOrder({ ...newOrder, status: v as PurchaseOrder["status"] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="solicitado">Solicitado</SelectItem>
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                  <SelectItem value="em_andamento">Em andamento</SelectItem>
                  <SelectItem value="entregue">Entregue</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                placeholder="Valor (R$)"
                value={newOrder.value}
                onChange={(e) => setNewOrder({ ...newOrder, value: e.target.value })}
              />
            </div>
            <div className="mb-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Campos adicionais do processo
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="Campo (ex: Incoterm)"
                  className="flex-1"
                  value={cfLabel}
                  onChange={(e) => setCfLabel(e.target.value)}
                />
                <Input
                  placeholder="Valor (ex: CIF)"
                  className="flex-1"
                  value={cfValue}
                  onChange={(e) => setCfValue(e.target.value)}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (!cfLabel.trim()) return;
                    setPendingCfs((prev) => [...prev, { label: cfLabel.trim(), value: cfValue }]);
                    setCfLabel("");
                    setCfValue("");
                  }}
                >
                  <Plus className="size-4" />
                </Button>
              </div>
              {pendingCfs.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {pendingCfs.map((cf, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 bg-muted text-xs px-2 py-1 rounded-full"
                    >
                      <span className="text-muted-foreground">{cf.label}:</span> {cf.value}
                      <button
                        onClick={() => setPendingCfs((prev) => prev.filter((_, j) => j !== i))}
                        className="hover:text-destructive ml-0.5"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <Button onClick={addOrder} size="sm">
              <Plus className="size-4 mr-1" />
              Registrar aquisição
            </Button>
          </section>
          <section className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-semibold mb-3">Histórico de aquisições</h3>
            {(meta.purchase_orders ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma aquisição registrada.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Campos extras</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(meta.purchase_orders ?? []).map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-xs">{o.order_number}</TableCell>
                      <TableCell className="text-xs max-w-xs">{o.description}</TableCell>
                      <TableCell className="text-xs">{o.date}</TableCell>
                      <TableCell>
                        <StatusBadge
                          tone={
                            o.status === "entregue"
                              ? "success"
                              : o.status === "cancelado"
                                ? "muted"
                                : o.status === "em_andamento"
                                  ? "info"
                                  : "warning"
                          }
                        >
                          {o.status}
                        </StatusBadge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {o.value != null ? `R$ ${o.value.toLocaleString("pt-BR")}` : "—"}
                      </TableCell>
                      <TableCell>
                        {o.custom_fields.length === 0 ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <div className="flex flex-col gap-0.5">
                            {o.custom_fields.map((cf, i) => (
                              <span key={i} className="text-xs">
                                <span className="text-muted-foreground">{cf.label}:</span>{" "}
                                {cf.value}
                              </span>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex gap-1">
                          {o.status !== "entregue" && o.status !== "cancelado" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => updateOrderStatus(o.id, "entregue")}
                            >
                              Entregue
                            </Button>
                          )}
                          {o.status !== "cancelado" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={() => updateOrderStatus(o.id, "cancelado")}
                            >
                              Cancelar
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => removeOrder(o.id)}
                          >
                            <Trash2 className="size-3.5 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </section>
        </TabsContent>

        {/* ============ HISTÓRICO ============ */}
        <TabsContent value="historico" className="mt-4">
          <section className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-semibold mb-3">Histórico de alterações</h3>
            {meta.history.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sem eventos.</p>
            ) : (
              <ul className="space-y-2">
                {meta.history.map((h) => (
                  <li key={h.id} className="text-xs border-l-2 border-border pl-3">
                    <div className="text-muted-foreground">
                      {new Date(h.at).toLocaleString("pt-BR")} · {h.actor ?? "sistema"}
                    </div>
                    <div className="font-medium">
                      {h.action}
                      {h.detail ? `: ${h.detail}` : ""}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </TabsContent>
      </Tabs>
    </>
  );
}
