import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

export type Role = "admin" | "gestor" | "tecnico" | "auditor" | "consulta";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

interface AuthCtx {
  user: User | null;
  session: Session | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

async function loadProfile(userId: string, fallbackEmail: string): Promise<User> {
  const [{ data: profile }, { data: roleRow }] = await Promise.all([
    supabase.from("profiles").select("id,email,name").eq("id", userId).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
  ]);
  return {
    id: userId,
    email: profile?.email ?? fallbackEmail,
    name: profile?.name || fallbackEmail.split("@")[0],
    role: (roleRow?.role as Role) ?? "consulta",
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Listener PRIMEIRO (regra crítica do Supabase)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, sess) => {
      setSession(sess);
      if (sess?.user) {
        // Adia chamadas ao banco para fora do callback (evita deadlock)
        setTimeout(() => {
          loadProfile(sess.user.id, sess.user.email ?? "").then((u) => {
            setUser(u);
            // Log de acesso (login / refresh inicial)
            if (event === "SIGNED_IN") {
              void (supabase as any).from("audit_logs").insert({
                actor_id: u.id, actor_name: u.name, actor_email: u.email,
                module: "auth", action: "login", record_label: u.email,
              });
            }
          });
        }, 0);
      } else {
        if (event === "SIGNED_OUT" && user) {
          void (supabase as any).from("audit_logs").insert({
            actor_id: user.id, actor_name: user.name, actor_email: user.email,
            module: "auth", action: "logout", record_label: user.email,
          });
        }
        setUser(null);
      }
    });

    // 2. Depois recupera sessão existente
    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      if (sess?.user) {
        loadProfile(sess.user.id, sess.user.email ?? "").then((u) => {
          setUser(u);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message === "Invalid login credentials" ? "Credenciais inválidas" : error.message);
  };

  const signup = async (email: string, password: string, name: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl, data: { name } },
    });
    if (error) throw new Error(error.message);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <Ctx.Provider value={{ user, session, loading, login, signup, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
