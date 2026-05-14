// Central de notificações in-app — derivada das stores existentes.
// Calcula alertas em tempo real (sem precisar de e-mail/cron).
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTableStore } from "./table-store";
import { calibrationsStore } from "./calibrations-store";
import { equipmentsStore } from "./equipments-store";
import { actionPlansStore } from "./action-plans-store";
import { competenciesStore } from "./competencies-store";
import { meetingsStore } from "./meetings-store";
import { documentsStore } from "./documents-store";
import { suppliersStore } from "./suppliers-store";
import type { DocumentMeta } from "./document-meta-store";
import { emptyMeta, stageLabel } from "./document-meta-store";

export type NotificationLevel = "info" | "warning" | "danger";
export type NotificationCategory =
  | "calibration"
  | "action"
  | "competency"
  | "meeting"
  | "document"
  | "supplier";

export interface NotificationItem {
  id: string;
  category: NotificationCategory;
  level: NotificationLevel;
  title: string;
  description: string;
  date: string;
  href: string;
}

const today = () => new Date().toISOString().slice(0, 10);
const daysUntil = (iso: string) => {
  const a = new Date(iso + "T00:00:00").getTime();
  const b = new Date(today() + "T00:00:00").getTime();
  return Math.round((a - b) / 86_400_000);
};

const levelFor = (days: number): NotificationLevel =>
  days < 0 ? "danger" : days <= 7 ? "warning" : "info";

export function useNotifications(): NotificationItem[] {
  const calibrations = useTableStore(calibrationsStore);
  const equipments = useTableStore(equipmentsStore);
  const actions = useTableStore(actionPlansStore);
  const competencies = useTableStore(competenciesStore);
  const meetings = useTableStore(meetingsStore);
  const documents = useTableStore(documentsStore);
  const suppliers = useTableStore(suppliersStore);

  return useMemo(() => {
    const out: NotificationItem[] = [];

    // Calibrações vencidas / a vencer (≤30 dias)
    calibrations.forEach((c) => {
      if (!c.next_due_date) return;
      const d = daysUntil(c.next_due_date);
      if (d > 30) return;
      const eq = equipments.find((e) => e.id === c.equipment_id);
      out.push({
        id: `cal-${c.id}`,
        category: "calibration",
        level: levelFor(d),
        title: d < 0 ? "Calibração vencida" : `Calibração vence em ${d} dia(s)`,
        description: `${eq?.name ?? "Equipamento"} (${eq?.code ?? ""}) — próxima em ${c.next_due_date}`,
        date: c.next_due_date,
        href: `/equipments/${c.equipment_id}`,
      });
    });

    // Equipamentos sem calibração registrada
    equipments.forEach((e) => {
      if (!e.next_calibration_date) return;
      const d = daysUntil(e.next_calibration_date);
      if (d > 30 || calibrations.some((c) => c.equipment_id === e.id && c.next_due_date === e.next_calibration_date)) return;
      out.push({
        id: `eq-${e.id}`,
        category: "calibration",
        level: levelFor(d),
        title: d < 0 ? "Equipamento com calibração atrasada" : `Equipamento a calibrar em ${d} dia(s)`,
        description: `${e.name} (${e.code})`,
        date: e.next_calibration_date,
        href: `/equipments/${e.id}`,
      });
    });

    // Ações vencidas / a vencer
    actions.forEach((a) => {
      if (!a.deadline || a.status === "concluida" || a.status === "verificada") return;
      const d = daysUntil(a.deadline);
      if (d > 14) return;
      out.push({
        id: `act-${a.id}`,
        category: "action",
        level: levelFor(d),
        title: d < 0 ? "Ação vencida" : `Ação vence em ${d} dia(s)`,
        description: a.description.slice(0, 80),
        date: a.deadline,
        href: `/action-plans`,
      });
    });

    // Competências/treinamentos vencendo
    competencies.forEach((c) => {
      if (!c.expires_at) return;
      const d = daysUntil(c.expires_at);
      if (d > 60) return;
      out.push({
        id: `comp-${c.id}`,
        category: "competency",
        level: levelFor(d),
        title: d < 0 ? "Treinamento vencido" : `Treinamento vence em ${d} dia(s)`,
        description: `${c.skill} · ${c.area}`,
        date: c.expires_at,
        href: `/competencies`,
      });
    });

    // Reuniões nos próximos 3 dias
    meetings.forEach((m) => {
      const d = daysUntil(m.meeting_date);
      if (d < 0 || d > 3 || m.status === "Realizada" || m.status === "Cancelada") return;
      out.push({
        id: `meet-${m.id}`,
        category: "meeting",
        level: d <= 1 ? "warning" : "info",
        title: d === 0 ? "Reunião hoje" : `Reunião em ${d} dia(s)`,
        description: `${m.type}${m.meeting_time ? " · " + m.meeting_time : ""}`,
        date: m.meeting_date,
        href: `/meetings/${m.id}`,
      });
    });

    // Documentos com validade próxima
    documents.forEach((doc) => {
      if (!doc.validity) return;
      const d = daysUntil(doc.validity);
      if (d > 30) return;
      out.push({
        id: `doc-${doc.id}`,
        category: "document",
        level: levelFor(d),
        title: d < 0 ? "Documento vencido" : `Documento vence em ${d} dia(s)`,
        description: `${doc.code} — ${doc.title}`,
        date: doc.validity,
        href: `/documents/${doc.id}`,
      });
    });

    // Fornecedores com qualificação a expirar
    suppliers.forEach((s) => {
      if (!s.qualified_until) return;
      const d = daysUntil(s.qualified_until);
      if (d > 30) return;
      out.push({
        id: `sup-${s.id}`,
        category: "supplier",
        level: levelFor(d),
        title: d < 0 ? "Fornecedor com qualificação vencida" : `Fornecedor a requalificar em ${d} dia(s)`,
        description: s.name,
        date: s.qualified_until,
        href: `/suppliers/${s.id}`,
      });
    });

    return out.sort((a, b) => a.date.localeCompare(b.date));
  }, [calibrations, equipments, actions, competencies, meetings, documents, suppliers]);
}
