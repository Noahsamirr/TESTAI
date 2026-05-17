import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  fetchMe,
  fetchPlans,
  fetchUsage,
  login as apiLogin,
  register as apiRegister,
  subscribe as apiSubscribe,
} from '../services/api';
import type { AuthResponse, PlanInfo, TokenUsage, User } from '../types/auth';

const TOKEN_KEY = 'testmind_token';

interface AuthContextValue {
  user: User | null;
  usage: TokenUsage | null;
  plans: PlanInfo[];
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  refreshUsage: () => Promise<void>;
  subscribe: (plan: string) => Promise<void>;
  setUsage: (usage: TokenUsage) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function applyAuth(data: AuthResponse) {
  localStorage.setItem(TOKEN_KEY, data.token);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [usage, setUsage] = useState<TokenUsage | null>(null);
  const [plans, setPlans] = useState<PlanInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUsage = useCallback(async () => {
    const u = await fetchUsage();
    setUsage(u);
  }, []);

  const bootstrap = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const [me, planList] = await Promise.all([fetchMe(), fetchPlans()]);
      setUser(me.user);
      setUsage(me.usage);
      setPlans(planList);
    } catch {
      localStorage.removeItem(TOKEN_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiLogin(email, password);
    applyAuth(data);
    setUser(data.user);
    setUsage(data.usage);
    const planList = await fetchPlans();
    setPlans(planList);
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    const data = await apiRegister(email, password, name);
    applyAuth(data);
    setUser(data.user);
    setUsage(data.usage);
    const planList = await fetchPlans();
    setPlans(planList);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setUsage(null);
  }, []);

  const subscribe = useCallback(
    async (plan: string) => {
      const data = await apiSubscribe(plan);
      setUser(data.user);
      setUsage(data.usage);
    },
    []
  );

  const value = useMemo(
    () => ({
      user,
      usage,
      plans,
      isLoading,
      isAuthenticated: !!user,
      login,
      register,
      logout,
      refreshUsage,
      subscribe,
      setUsage,
    }),
    [user, usage, plans, isLoading, login, register, logout, refreshUsage, subscribe]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
