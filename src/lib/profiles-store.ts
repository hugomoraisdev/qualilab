// Cache em memória dos profiles públicos — usado para resolver nomes de
// responsáveis nas listagens (Competências, Compras, etc.).
import { createTableStore } from "./table-store";

export interface ProfileRow {
  id: string;
  email: string;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export const profilesStore = createTableStore<ProfileRow>("profiles", "name", true);

export const listProfiles = () => profilesStore.list();
export const getProfile = (id: string) => profilesStore.list().find((p) => p.id === id);
export const profileName = (id: string | null | undefined) =>
  (id && profilesStore.list().find((p) => p.id === id)?.name) || "—";
