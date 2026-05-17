import axios from 'axios';
import { TestCase, GeneratedScript, TestReport } from '../types';
import type { AuthResponse, PlanInfo, TokenUsage } from '../types/auth';

const TOKEN_KEY = 'testmind_token';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface ChatResponse {
  reply: string;
  testCases?: TestCase[];
  script?: GeneratedScript;
  report?: TestReport;
  phase: string;
  sessionId: string;
  usage?: TokenUsage;
  tokensUsedThisMessage?: number;
}

function extractError(error: unknown): never {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosErr = error as { response?: { data?: { error?: string } } };
    const serverError = axiosErr.response?.data?.error;
    if (serverError) throw new Error(serverError);
  }
  throw error;
}

export async function register(
  email: string,
  password: string,
  name: string
): Promise<AuthResponse> {
  try {
    const { data } = await api.post<AuthResponse>('/auth/register', { email, password, name });
    return data;
  } catch (e) {
    extractError(e);
  }
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  try {
    const { data } = await api.post<AuthResponse>('/auth/login', { email, password });
    return data;
  } catch (e) {
    extractError(e);
  }
}

export async function fetchMe(): Promise<{ user: AuthResponse['user']; usage: TokenUsage }> {
  const { data } = await api.get('/auth/me');
  return data;
}

export async function fetchUsage(): Promise<TokenUsage> {
  const { data } = await api.get<TokenUsage>('/auth/usage');
  return data;
}

export async function fetchPlans(): Promise<PlanInfo[]> {
  const { data } = await api.get<PlanInfo[]>('/auth/plans');
  return data;
}

export async function subscribe(
  plan: string
): Promise<{ user: AuthResponse['user']; usage: TokenUsage; message?: string }> {
  try {
    const { data } = await api.post('/auth/subscribe', { plan });
    return data;
  } catch (e) {
    extractError(e);
  }
}

export async function sendChatMessage(sessionId: string | null, message: string): Promise<ChatResponse> {
  try {
    const { data } = await api.post<ChatResponse>('/chat', { sessionId, message });
    return data;
  } catch (e) {
    extractError(e);
  }
}

export async function getTestCases(sessionId: string): Promise<TestCase[]> {
  const { data } = await api.get<TestCase[]>(`/testcases/${sessionId}`);
  return data;
}

export async function runScript(scriptId: string, framework: string): Promise<{ runnerId: string; status: string }> {
  const { data } = await api.post('/runner/run', { scriptId, framework });
  return data;
}

export async function getReports(sessionId: string) {
  const { data } = await api.get(`/reports/session/${sessionId}`);
  return data;
}

export default api;
