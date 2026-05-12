import { useAuth, type Role } from "./auth";

// Mapa de permissões por papel — usado para ocultar menus, ações e botões.
// "all" = acesso total. Caso contrário, a permissão precisa estar listada.
export const PERMISSIONS: Record<Role, string[]> = {
  admin: ["all"],
  gestor: [
    "dashboard", "poc",
    "documents.view", "documents.create", "documents.approve",
    "audits", "risks", "occurrences", "occurrences.create",
    "action-plans", "meetings", "meetings.create", "process-map",
    "equipments", "calibrations", "calibrations.fill",
    "suppliers", "purchases", "competencies",
    "forms", "forms.create", "forms.fill", "forms.approve",
    "reports", "indicators", "projects",
    "customer-service", "customer-service.create",
  ],
  tecnico: [
    "dashboard",
    "documents.view",
    "occurrences", "occurrences.create",
    "equipments",
    "calibrations", "calibrations.fill",
    "forms", "forms.fill",
    "competencies",
    "process-map",
    "customer-service", "customer-service.create",
  ],
  auditor: [
    "dashboard",
    "documents.view",
    "audits",
    "occurrences",
    "risks",
    "process-map",
    "reports", "indicators",
    "audit-log",
  ],
  consulta: ["dashboard", "documents.view", "reports"],
};

export function hasPermission(role: Role | undefined, permission: string): boolean {
  if (!role) return false;
  const perms = PERMISSIONS[role] ?? [];
  return perms.includes("all") || perms.includes(permission);
}

export function usePermission(permission: string): boolean {
  const { user } = useAuth();
  return hasPermission(user?.role, permission);
}

export function useAnyPermission(permissions: string[]): boolean {
  const { user } = useAuth();
  return permissions.some((p) => hasPermission(user?.role, p));
}
