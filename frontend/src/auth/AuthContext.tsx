import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, setToken, getToken } from "../api/client";

export type AuthUser = {
  id: number;
  role: "student" | "teacher" | "school" | "enterprise";
  full_name: string;
  email: string;
  avatar_url?: string | null;
  profile_id?: number | null;
  detail?: { class_name?: string; grade?: number; subject?: string } | null;
};

type LoginResponse = { token: string; user: AuthUser };

type AuthContextValue = {
  user: AuthUser | null;
  initializing: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function roleHome(role?: AuthUser["role"]): string {
  switch (role) {
    case "teacher":
      return "/teacher";
    case "school":
      return "/school";
    case "enterprise":
      return "/enterprise";
    default:
      return "/student";
  }
}

export function roleLabel(role?: AuthUser["role"]): string {
  switch (role) {
    case "teacher":
      return "Giáo viên";
    case "school":
      return "Nhà trường";
    case "enterprise":
      return "Doanh nghiệp";
    default:
      return "Học sinh";
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setInitializing(false);
      return;
    }
    api<LoginResponse>("/auth/me")
      .then((res) => setUser(res.user))
      .catch(() => {
        setToken(null);
        setUser(null);
      })
      .finally(() => setInitializing(false));
  }, []);

  async function login(email: string, password: string): Promise<AuthUser> {
    const res = await postJson<LoginResponse>("/auth/login", { email, password });
    setToken(res.token);
    setUser(res.user);
    return res.user;
  }

  async function logout(): Promise<void> {
    const token = getToken();
    if (token) {
      try {
        await api("/auth/logout", { method: "POST" });
      } catch {
        /* bỏ qua lỗi mạng khi logout */
      }
    }
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, initializing, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// gọi với Content-Type JSON + dùng token từ api() (Authorization được api() gắn)
async function postJson<T>(path: string, body: unknown): Promise<T> {
  return api<T>(path, { method: "POST", body: JSON.stringify(body) });
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth phải dùng trong <AuthProvider>");
  return ctx;
}