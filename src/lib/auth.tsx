import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { setAuditUser, logAudit } from "@/lib/audit";

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

const cachedUserKey = (userId: string) => `auth:user:${userId}`;

function readCachedUser(userId: string): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(cachedUserKey(userId));
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function writeCachedUser(user: User) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(cachedUserKey(user.id), JSON.stringify(user));
  } catch {
    // cache offline é opcional
  }
}

async function loadProfile(userId: string, fallbackEmail: string): Promise<User> {
  const cached = readCachedUser(userId);
  try {
    const [{ data: profile, error: profileError }, { data: roleRow, error: roleError }] =
      await Promise.all([
        supabase.from("profiles").select("id,email,name").eq("id", userId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
      ]);
    if ((profileError || roleError) && cached) return cached;
    const loaded = {
      id: userId,
      email: profile?.email ?? cached?.email ?? fallbackEmail,
      name: profile?.name || cached?.name || fallbackEmail.split("@")[0],
      role: (roleRow?.role as Role) ?? cached?.role ?? "consulta",
    };
    writeCachedUser(loaded);
    return loaded;
  } catch {
    if (cached) return cached;
    return {
      id: userId,
      email: fallbackEmail,
      name: fallbackEmail.split("@")[0],
      role: "consulta",
    };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const userRef = useRef<User | null>(null);

  useEffect(() => {
    // 1. Listener PRIMEIRO (regra crítica do Supabase)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, sess) => {
      setSession(sess);
      if (sess?.user) {
        // Only set loading on SIGNED_IN to prevent _app.tsx from blanking on TOKEN_REFRESHED
        if (event === "SIGNED_IN") setLoading(true);
        // Adia chamadas ao banco para fora do callback (evita deadlock)
        setTimeout(() => {
          loadProfile(sess.user.id, sess.user.email ?? "").then((u) => {
            setUser(u);
            userRef.current = u;
            setAuditUser(u);
            if (event === "SIGNED_IN") setLoading(false);
            if (event === "SIGNED_IN") {
              logAudit({ module: "auth", action: "login", record_label: u.email });
            }
          });
        }, 0);
      } else {
        const prev = userRef.current;
        if (event === "SIGNED_OUT" && prev) {
          logAudit({ module: "auth", action: "logout", record_label: prev.email });
        }
        userRef.current = null;
        setAuditUser(null);
        setUser(null);
      }
    });

    // 2. Depois recupera sessão existente
    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      if (sess?.user) {
        loadProfile(sess.user.id, sess.user.email ?? "").then((u) => {
          setUser(u);
          userRef.current = u;
          setAuditUser(u);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: password.trim(),
    });
    if (error)
      throw new Error(
        error.message === "Invalid login credentials" ? "Credenciais inválidas" : error.message,
      );
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
