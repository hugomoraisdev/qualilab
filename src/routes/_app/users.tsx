import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";

const USERS = [
  { id: "U-001", name: "Carla Administradora", email: "admin@qualilab.com", role: "Administrador", lab: "Matriz", status: "Ativo" },
  { id: "U-002", name: "Roberto Gestor", email: "gestor@qualilab.com", role: "Gestor da Qualidade", lab: "Matriz", status: "Ativo" },
  { id: "U-003", name: "Mariana Técnica", email: "tecnico@qualilab.com", role: "Técnico de Laboratório", lab: "Matriz", status: "Ativo" },
  { id: "U-004", name: "Paulo Auditor", email: "auditor@qualilab.com", role: "Auditor", lab: "Matriz", status: "Ativo" },
  { id: "U-005", name: "João Estagiário", email: "joao@qualilab.com", role: "Consulta/Leitura", lab: "Matriz", status: "Ativo" },
];

export const Route = createFileRoute("/_app/users")({ component: UsersPage });

function UsersPage() {
  return (
    <>
      <PageHeader title="Usuários e Permissões" description="Controle de acesso por perfil e laboratório" />
      <DataTable
        data={USERS}
        searchKeys={["name", "email", "role", "status"]}
        newLabel="Novo usuário"
        columns={[
          { key: "id", header: "ID", render: (r) => <span className="font-mono text-xs">{r.id}</span> },
          { key: "name", header: "Nome", render: (r) => <span className="font-medium">{r.name}</span> },
          { key: "email", header: "E-mail", render: (r) => <span className="text-xs">{r.email}</span> },
          { key: "role", header: "Perfil" },
          { key: "lab", header: "Laboratório" },
          { key: "status", header: "Status", render: (r) => <StatusBadge>{r.status}</StatusBadge> },
        ]}
      />
    </>
  );
}
