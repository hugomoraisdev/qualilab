import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { sendEmail } from "./send-email.functions";
import {
  buildDigestHtml,
  buildActionAssignedHtml,
  buildDocumentWorkflowHtml,
  buildDocumentReadReminderHtml,
  type DigestAlert,
} from "./email-templates";

const EMAIL_TYPES = [
  "digest_full",
  "calibracao",
  "competencia",
  "risco",
  "fornecedor",
  "documento_etapa",
  "acao_atribuida",
  "documento_leitura",
  "documento_workflow",
] as const;

type EmailType = (typeof EMAIL_TYPES)[number];

const InputSchema = z.object({
  to: z.string().email(),
  type: z.enum(EMAIL_TYPES),
});

function today(): string {
  return new Date().toLocaleDateString("pt-BR");
}

function buildSampleHtml(type: EmailType): { subject: string; html: string } {
  switch (type) {
    case "digest_full": {
      const alerts: DigestAlert[] = [
        {
          category: "Calibração",
          level: "danger",
          title: "Calibração vencida",
          description: "Espectrofotômetro UV-Vis (EQ-042)",
          daysLeft: -3,
        },
        {
          category: "Ação",
          level: "warning",
          title: "Ação vence em 2 dia(s)",
          description: "Revisar POP de coleta de amostras microbiológicas",
          daysLeft: 2,
        },
        {
          category: "Competência",
          level: "warning",
          title: "Treinamento vence em 15 dia(s)",
          description: "BPL — Boas Práticas Laboratoriais · Microbiologia",
          daysLeft: 15,
        },
        {
          category: "Risco",
          level: "danger",
          title: "Tratamento de risco atrasado",
          description: "RSK-008 — Falha no controle de temperatura da câmara fria",
          daysLeft: -5,
        },
        {
          category: "Documento",
          level: "warning",
          title: "Etapa Aprovação vence em 3 dia(s)",
          description: "POP-031 — Procedimento de calibração de balanças · Aprovação",
          daysLeft: 3,
        },
        {
          category: "Fornecedor",
          level: "warning",
          title: "Documento de fornecedor vence em 10 dia(s)",
          description: "LabSupply Brasil — Certificado ISO 9001",
          daysLeft: 10,
        },
      ];
      return {
        subject: `Qualilab — ${alerts.length} alertas pendentes (teste — ${today()})`,
        html: buildDigestHtml("Usuário de Teste", alerts),
      };
    }

    case "calibracao": {
      const alerts: DigestAlert[] = [
        {
          category: "Calibração",
          level: "danger",
          title: "Calibração vencida",
          description: "Espectrofotômetro UV-Vis (EQ-042)",
          daysLeft: -3,
        },
        {
          category: "Calibração",
          level: "warning",
          title: "Calibração vence em 7 dia(s)",
          description: "Balança Analítica Mettler (EQ-018)",
          daysLeft: 7,
        },
      ];
      return {
        subject: `Qualilab — Alerta de calibração (teste — ${today()})`,
        html: buildDigestHtml("Usuário de Teste", alerts),
      };
    }

    case "competencia": {
      const alerts: DigestAlert[] = [
        {
          category: "Competência",
          level: "warning",
          title: "Treinamento vence em 15 dia(s)",
          description: "BPL — Boas Práticas Laboratoriais · Microbiologia",
          daysLeft: 15,
        },
        {
          category: "Competência",
          level: "danger",
          title: "Treinamento vencido",
          description: "NR-10 — Segurança em Instalações Elétricas · Elétrica",
          daysLeft: -8,
        },
      ];
      return {
        subject: `Qualilab — Alerta de competência (teste — ${today()})`,
        html: buildDigestHtml("Usuário de Teste", alerts),
      };
    }

    case "risco": {
      const alerts: DigestAlert[] = [
        {
          category: "Risco",
          level: "danger",
          title: "Tratamento de risco atrasado",
          description: "RSK-008 — Falha no controle de temperatura da câmara fria",
          daysLeft: -5,
        },
        {
          category: "Risco",
          level: "warning",
          title: "Tratamento de risco vence em 5 dia(s)",
          description: "RSK-012 — Contaminação cruzada em área de manipulação",
          daysLeft: 5,
        },
      ];
      return {
        subject: `Qualilab — Alerta de risco (teste — ${today()})`,
        html: buildDigestHtml("Usuário de Teste", alerts),
      };
    }

    case "fornecedor": {
      const alerts: DigestAlert[] = [
        {
          category: "Fornecedor",
          level: "warning",
          title: "Documento de fornecedor vence em 10 dia(s)",
          description: "LabSupply Brasil — Certificado ISO 9001",
          daysLeft: 10,
        },
        {
          category: "Fornecedor",
          level: "danger",
          title: "Documento de fornecedor vencido",
          description: "Reagentes Nacionais Ltda — Licença de funcionamento ANVISA",
          daysLeft: -2,
        },
      ];
      return {
        subject: `Qualilab — Alerta de fornecedor (teste — ${today()})`,
        html: buildDigestHtml("Usuário de Teste", alerts),
      };
    }

    case "documento_etapa": {
      const alerts: DigestAlert[] = [
        {
          category: "Documento",
          level: "warning",
          title: "Etapa Aprovação vence em 3 dia(s)",
          description: "POP-031 — Procedimento de calibração de balanças · Aprovação",
          daysLeft: 3,
        },
        {
          category: "Documento",
          level: "danger",
          title: "Etapa Revisão vencida",
          description: "IT-007 — Instrução de descarte de reagentes · Revisão",
          daysLeft: -1,
        },
      ];
      return {
        subject: `Qualilab — Alerta de documento (teste — ${today()})`,
        html: buildDigestHtml("Usuário de Teste", alerts),
      };
    }

    case "acao_atribuida":
      return {
        subject: "Qualilab — Nova ação atribuída a você (teste)",
        html: buildActionAssignedHtml({
          description:
            "Revisar e atualizar o POP de coleta de amostras microbiológicas conforme nova resolução RDC 786",
          responsible: "Usuário de Teste",
          originLabel: "Não Conformidade NC-2024-045",
          deadline: "2026-06-15",
        }),
      };

    case "documento_workflow":
      return {
        subject: "Qualilab — Documento aguarda sua ação (teste)",
        html: buildDocumentWorkflowHtml({
          docCode: "POP-031",
          docTitle: "Procedimento de Calibração de Balanças Analíticas",
          stage: "Aprovação",
          recipientName: "Usuário de Teste",
          deadline: "2026-05-20",
        }),
      };

    case "documento_leitura":
      return {
        subject: "Qualilab — Novo documento para leitura obrigatória (teste)",
        html: buildDocumentReadReminderHtml({
          docCode: "POP-031",
          docTitle: "Procedimento de Calibração de Balanças Analíticas",
          version: "3.0",
          recipientName: "Usuário de Teste",
        }),
      };
  }
}

export const sendTestEmail = createServerFn({ method: "POST" })
  .inputValidator((input) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const { subject, html } = buildSampleHtml(data.type as EmailType);
    await sendEmail({ data: { to: data.to, subject, html } });
    return { ok: true };
  });
