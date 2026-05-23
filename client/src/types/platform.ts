export interface DashboardStats {
  activeVms: number;
  availableDevices: number;
  passedTests: number;
  failedTests: number;
  totalRuns: number;
}

export interface TestRun {
  id: string;
  name: string;
  status: string;
  browser: string;
  os: string;
  device?: string | null;
  duration: string;
  passed: number;
  failed: number;
  skipped: number;
  framework: string;
  executedAt: string;
  hasLogs: boolean;
  hasVideo: boolean;
  hasScreenshot: boolean;
  screenshotPath?: string | null;
}

export interface DeviceInfo {
  id: string;
  name: string;
  os: string;
  osVersion: string;
  type: string;
  platform: string;
  status: string;
}

export interface LiveSessionResult {
  sessionId: string;
  status: string;
  url: string;
  browser: string;
  os: string;
  resolution: string;
  screenshotPath?: string;
  viewerUrl: string;
  message: string;
}

export interface CiTemplate {
  provider: string;
  projectName: string;
  filename: string;
  content: string;
}
