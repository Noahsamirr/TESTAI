/** Browser/OS/device catalog (Sauce Labs–style capability matrix). */

export interface BrowserCapability {
  id: string;
  browser: string;
  version: string;
  os: string;
  osVersion: string;
  resolution: string;
  platform: 'desktop' | 'mobile';
}

export interface DeviceCapability {
  id: string;
  name: string;
  os: string;
  osVersion: string;
  type: 'Real Device' | 'Simulator' | 'Emulator';
  platform: 'ios' | 'android';
  status: 'available' | 'in_use' | 'maintenance';
}

export const BROWSER_MATRIX: BrowserCapability[] = [
  { id: 'chrome-120-macos', browser: 'Chrome', version: '120', os: 'macOS', osVersion: '14', resolution: '1920x1080', platform: 'desktop' },
  { id: 'chrome-119-macos', browser: 'Chrome', version: '119', os: 'macOS', osVersion: '13', resolution: '1920x1080', platform: 'desktop' },
  { id: 'firefox-121-win', browser: 'Firefox', version: '121', os: 'Windows', osVersion: '11', resolution: '1920x1080', platform: 'desktop' },
  { id: 'firefox-120-win', browser: 'Firefox', version: '120', os: 'Windows', osVersion: '10', resolution: '1366x768', platform: 'desktop' },
  { id: 'safari-17-macos', browser: 'Safari', version: '17', os: 'macOS', osVersion: '14', resolution: '1440x900', platform: 'desktop' },
  { id: 'edge-120-win', browser: 'Edge', version: '120', os: 'Windows', osVersion: '11', resolution: '1920x1080', platform: 'desktop' },
  { id: 'chrome-120-linux', browser: 'Chrome', version: '120', os: 'Linux', osVersion: 'Ubuntu 22.04', resolution: '1920x1080', platform: 'desktop' },
];

export const DEVICE_CATALOG: DeviceCapability[] = [
  { id: 'iphone-15-pro', name: 'iPhone 15 Pro', os: 'iOS', osVersion: '17', type: 'Real Device', platform: 'ios', status: 'available' },
  { id: 'iphone-14', name: 'iPhone 14', os: 'iOS', osVersion: '16', type: 'Real Device', platform: 'ios', status: 'available' },
  { id: 'pixel-8', name: 'Google Pixel 8', os: 'Android', osVersion: '14', type: 'Real Device', platform: 'android', status: 'available' },
  { id: 'galaxy-s24', name: 'Samsung Galaxy S24', os: 'Android', osVersion: '14', type: 'Real Device', platform: 'android', status: 'available' },
  { id: 'ipad-pro-12', name: 'iPad Pro (12.9-inch)', os: 'iPadOS', osVersion: '17', type: 'Real Device', platform: 'ios', status: 'available' },
  { id: 'iphone-13-sim', name: 'iPhone 13', os: 'iOS', osVersion: '15', type: 'Simulator', platform: 'ios', status: 'available' },
  { id: 'pixel-6a-emu', name: 'Pixel 6a', os: 'Android', osVersion: '13', type: 'Emulator', platform: 'android', status: 'available' },
];

export const CI_PROVIDERS = [
  { id: 'github-actions', name: 'GitHub Actions', icon: 'github' },
  { id: 'jenkins', name: 'Jenkins', icon: 'jenkins' },
  { id: 'circleci', name: 'CircleCI', icon: 'circleci' },
  { id: 'gitlab-ci', name: 'GitLab CI', icon: 'gitlab' },
  { id: 'azure-pipelines', name: 'Azure Pipelines', icon: 'azure' },
] as const;
