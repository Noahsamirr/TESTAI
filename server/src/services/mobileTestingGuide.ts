import claudeAgent from './claudeAgent';
import { TestCase, GeneratedScript } from '../types';

class MobileTestingGuideService {
  getSetupGuide(platform: 'iOS' | 'Android' | 'both'): string {
    const androidGuide = `## Android Setup Guide

### 1. Install Java JDK 11+
\`\`\`bash
# macOS
brew install openjdk@11
\`\`\`

### 2. Install Android Studio + SDK (API level 30+)
Download from https://developer.android.com/studio

### 3. Set environment variables
\`\`\`bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
\`\`\`

### 4. Install Appium
\`\`\`bash
npm install -g appium
appium driver install uiautomator2
\`\`\`

### 5. Install Appium Inspector
Download from https://github.com/appium/appium-inspector

### 6. Start emulator or connect device
Note: Enable USB debugging on real devices.

### 7. Verify setup
\`\`\`bash
appium doctor --android
\`\`\`

### 8. Install WebdriverIO
\`\`\`bash
npm install @wdio/cli webdriverio
\`\`\`

### Sample Android Capabilities
\`\`\`json
{
  "platformName": "Android",
  "appium:deviceName": "emulator-5554",
  "appium:platformVersion": "13",
  "appium:automationName": "UiAutomator2",
  "appium:app": "/path/to/app.apk"
}
\`\`\``;

    const iosGuide = `## iOS Setup Guide

Note: macOS only — iOS testing requires a Mac.

### 1. Install Xcode + Command Line Tools
\`\`\`bash
xcode-select --install
\`\`\`

### 2. Install XCUITest driver
\`\`\`bash
npm install -g appium
appium driver install xcuitest
\`\`\`

### 3. Simulator setup
Open Xcode → Window → Devices and Simulators → create a simulator.

### 4. Real device setup
Note: Requires Apple Developer account, provisioning profile, and trusted device.

### 5. Verify setup
\`\`\`bash
appium doctor --ios
\`\`\`

### Sample iOS Capabilities
\`\`\`json
{
  "platformName": "iOS",
  "appium:deviceName": "iPhone 15",
  "appium:platformVersion": "17.0",
  "appium:automationName": "XCUITest",
  "appium:bundleId": "com.example.app"
}
\`\`\``;

    if (platform === 'Android') return androidGuide;
    if (platform === 'iOS') return iosGuide;
    return `${androidGuide}\n\n---\n\n${iosGuide}`;
  }

  async generateAppiumScript(
    testCases: TestCase[],
    appConfig: Record<string, string>
  ): Promise<GeneratedScript> {
    const context = `App Config: ${JSON.stringify(appConfig)}`;
    return claudeAgent.generateScript('mobile', testCases, 'Appium WebdriverIO', context);
  }

  getDeviceCapabilities(platform: string, deviceName: string): Record<string, string> {
    if (platform.toLowerCase() === 'ios') {
      return {
        platformName: 'iOS',
        'appium:deviceName': deviceName,
        'appium:automationName': 'XCUITest',
        'appium:platformVersion': '17.0',
      };
    }
    return {
      platformName: 'Android',
      'appium:deviceName': deviceName,
      'appium:automationName': 'UiAutomator2',
      'appium:platformVersion': '13',
    };
  }

  getCommonMobileTestPatterns(): string {
    return `# Common Mobile Test Patterns

1. **Gestures**: swipe, pinch, long-press, double-tap
2. **Network conditions**: offline mode, slow 3G simulation
3. **Orientation**: portrait/landscape transitions
4. **Background/Foreground**: app resume behavior
5. **Push notifications**: permission and display
6. **Deep links**: URL scheme handling
7. **Biometric auth**: Face ID / fingerprint mocks
8. **Keyboard handling**: dismiss, input validation
9. **Permissions**: camera, location, contacts dialogs
10. **App state**: fresh install vs. logged-in state`;
  }

  getInspectorGuide(): string {
    return `# Appium Inspector Guide

1. Start Appium server: \`appium\`
2. Open Appium Inspector
3. Set Remote Host: \`http://127.0.0.1:4723\`
4. Paste your desired capabilities JSON
5. Click **Start Session**
6. Click elements on the screenshot to get locators
7. Preferred locator strategies:
   - iOS: accessibility id (\`~label\`)
   - Android: resource-id (\`id:com.app:id/button\`)
   - Cross-platform: XPath (use sparingly)`;
  }
}

export default new MobileTestingGuideService();
