import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Building2, FlaskConical, Tag, AlertTriangle, ShieldAlert, Truck, Gauge, ListChecks, Users } from "lucide-react";

const SECTIONS = [
  { icon: Building2, title: "Dados da organização", desc: "Razão social, CNPJ, endereço e logo" },
  { icon: FlaskConical, title: "Unidades / Laboratórios", desc: "Cadastro de filiais e laboratórios" },
  { icon: Tag, title: "Categorias de documentos", desc: "Manual, POP, Instrução, Política, Registro, Formulário" },
  { icon: AlertTriangle, title: "Tipos de ocorrência", desc: "NC, reclamação, desvio, oportunidade de melhoria" },
  { icon: ShieldAlert, title: "Tipos de risco", desc: "Categorização e taxonomia dos riscos" },
  { icon: Truck, title: "Critérios de avaliação de fornecedores", desc: "Pesos para qualidade, prazo, conformidade" },
  { icon: Gauge, title: "Periodicidade de calibração", desc: "Padrões por tipo de equipamento" },
  { icon: ListChecks, title: "Modelos de checklist", desc: "Checklists reutilizáveis para auditorias" },
  { icon: Users, title: "Perfis e permissões", desc: "Administrador, Gestor, Técnico, Auditor, Consulta" },
];

export const Route = createFileRoute("/_app/settings")({ component: SettingsPage });

function SettingsPage() {
  return (
    <>
      <PageHeader title="Configurações" description="Parâmetros gerais do sistema QualiLab" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {SECTIONS.map(s => (
          <button key={s.title} className="text-left bg-card border border-border rounded-lg p-4 shadow-sm hover:shadow-md hover:border-primary/30 transition-all">
            <div className="size-9 rounded-lg bg-primary/10 grid place-items-center text-primary mb-3"><s.icon className="size-4" /></div>
            <div className="font-medium text-sm">{s.title}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.desc}</div>
          </button>
        ))}
      </div>
    </>
  );
}
