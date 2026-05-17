import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import claudeAgent from './claudeAgent';
import { TestCase, GeneratedScript } from '../types';

class ScriptGeneratorService {
  async generate(
    testCases: TestCase[],
    framework: string,
    context: string,
    sessionId = 'default'
  ): Promise<GeneratedScript> {
    return claudeAgent.generateScript(sessionId, testCases, framework, context);
  }

  async refineScript(script: GeneratedScript, feedback: string): Promise<GeneratedScript> {
    const prompt = `Improve the following automation script based on user feedback.

Feedback: ${feedback}

Current Script:
\`\`\`typescript
${script.code}
\`\`\`

Return ONLY valid JSON with schema:
{ "code": "string", "framework": "string", "runCommand": "string", "explanation": [{ "section": "string", "description": "string", "lineRange": "string" }], "dependencies": ["string"] }`;

    const text = await claudeAgent.completeUserPrompt(prompt, 16384);
    return claudeAgent.parseScriptFromResponse(text);
  }

  explainScript(script: GeneratedScript): GeneratedScript['explanation'] {
    if (script.explanation?.length) return script.explanation;

    const lines = script.code.split('\n');
    const sections: GeneratedScript['explanation'] = [];
    let currentSection = 'Setup';
    let startLine = 1;

    lines.forEach((line, i) => {
      if (line.includes('describe(') || line.includes('test(')) {
        if (i > startLine) {
          sections.push({
            section: currentSection,
            description: `Lines ${startLine}-${i}: ${currentSection} logic`,
            lineRange: `${startLine}-${i}`,
          });
        }
        currentSection = line.trim().slice(0, 50);
        startLine = i + 1;
      }
    });

    sections.push({
      section: currentSection,
      description: `Lines ${startLine}-${lines.length}: remaining code`,
      lineRange: `${startLine}-${lines.length}`,
    });

    return sections;
  }

  validateScript(script: GeneratedScript, framework: string): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    if (!script.code?.trim()) issues.push('Script code is empty');
    if (!script.runCommand) issues.push('Missing run command');

    if (framework.toLowerCase().includes('playwright')) {
      if (!script.code.includes('test') && !script.code.includes('describe')) {
        issues.push('Playwright script should contain test/describe blocks');
      }
    }

    return { valid: issues.length === 0, issues };
  }

  saveScript(script: GeneratedScript, sessionId: string): string {
    const dir = process.env.SCRIPTS_OUTPUT_DIR || path.join(process.cwd(), 'test-outputs', 'scripts');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const ext = script.framework.toLowerCase().includes('jest') ? '.test.ts' : '.spec.ts';
    const filename = `${sessionId}-${Date.now()}${ext}`;
    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, script.code, 'utf-8');
    return filePath;
  }
}

export default new ScriptGeneratorService();
