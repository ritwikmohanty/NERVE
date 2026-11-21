import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { api, getToken, setToken, setUnauthorizedHandler } from "./api";
import type { Catalog, OrgSettings, SessionInfo } from "./types";

interface AuthState {
  session: SessionInfo | null;
  loading: boolean;
  catalog: Catalog | null;
  login: (email: string, password: string) => Promise<SessionInfo>;
  signup: (body: { name: string; email: string; password: string; company?: string }) => Promise<SessionInfo>;
  loginDemo: () => Promise<SessionInfo>;
  logout: () => void;
  updateOrg: (body: { name?: string; settings?: Partial<OrgSettings> }) => Promise<SessionInfo>;
  refreshCatalog: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(() => !!getToken());
  const [catalog, setCatalog] = useState<Catalog | null>(null);

  const logout = useCallback(() => {
    setToken(null);
    setSession(null);
    setCatalog(null);
  }, []);

  const refreshCatalog = useCallback(async () => {
    try {
      setCatalog(await api.catalog());
    } catch {
      /* catalog is optional for rendering */
    }
  }, []);

  // Restore an existing session on load
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setToken(null);
      setSession(null);
    });
    if (!getToken()) return;
    let cancelled = false;
    api
      .me()
      .then((s) => {
        if (!cancelled) setSession(s);
      })
      .catch(() => {
        if (!cancelled) setToken(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      setUnauthorizedHandler(null);
    };
  }, []);

  const catalogKey = session ? `${session.org.id}:${session.org.settings.brands.join(",")}` : "";
  useEffect(() => {
    if (!catalogKey) return;
    let cancelled = false;
    api
      .catalog()
      .then((c) => {
        if (!cancelled) setCatalog(c);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [catalogKey]);

  const accept = useCallback((res: SessionInfo & { token: string }) => {
    setToken(res.token);
    const { token: _token, ...info } = res; // eslint-disable-line @typescript-eslint/no-unused-vars
    setSession(info);
    return info;
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      session,
      loading,
      catalog,
      login: async (email, password) => accept(await api.login(email, password)),
      signup: async (body) => accept(await api.signup(body)),
      loginDemo: async () => accept(await api.demo()),
      logout,
      updateOrg: async (body) => {
        const s = await api.updateOrg(body);
        setSession(s);
        return s;
      },
      refreshCatalog,
    }),
    [session, loading, catalog, accept, logout, refreshCatalog]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

function FullPageSpinner({ label }: { label: string }) {
  return (
    <div className="h-screen flex flex-col items-center justify-center gap-3 bg-background">
      <Loader2 className="size-8 animate-spin" />
      <p className="text-xs font-black uppercase tracking-widest">{label}</p>
    </div>
  );
}

/** Requires a session; sends un-onboarded workspaces to /onboarding first. */
export function ProtectedRoute({ children, allowUnonboarded = false }: { children: ReactNode; allowUnonboarded?: boolean }) {
  const { session, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullPageSpinner label="Restoring your session…" />;
  if (!session) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (!allowUnonboarded && !session.org.settings.onboarded) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}
