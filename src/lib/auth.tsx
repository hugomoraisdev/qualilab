import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Role = "admin" | "gestor" | "tecnico" | "auditor" | "consulta";

export interface User {
  email: string;
  name: string;
  role: Role;
}

interface AuthCtx {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

const DEMO_USERS: Record<string, { password: string; user: User }> = {
  "admin@qualilab.com": { password: "demo123", user: { email: "admin@qualilab.com", name: "Carla Administradora", role: "admin" } },
  "gestor@qualilab.com": { password: "demo123", user: { email: "gestor@qualilab.com", name: "Roberto Gestor", role: "gestor" } },
  "tecnico@qualilab.com": { password: "demo123", user: { email: "tecnico@qualilab.com", name: "Mariana Técnica", role: "tecnico" } },
  "auditor@qualilab.com": { password: "demo123", user: { email: "auditor@qualilab.com", name: "Paulo Auditor", role: "auditor" } },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem("qualilab_user");
    if (raw) setUser(JSON.parse(raw));
  }, []);

  const login = async (email: string, password: string) => {
    const entry = DEMO_USERS[email.toLowerCase()];
    if (!entry || entry.password !== password) {
      throw new Error("Credenciais inválidas");
    }
    setUser(entry.user);
    localStorage.setItem("qualilab_user", JSON.stringify(entry.user));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("qualilab_user");
  };

  return <Ctx.Provider value={{ user, login, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
