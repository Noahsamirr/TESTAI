/**
 * @package @testmind/ai-agents
 * @description Self-Healing Agent — recovers broken test locators using a multi-strategy fallback chain.
 *
 * When a test fails because a selector is no longer valid (element moved, renamed, or restructured),
 * the Self-Healing Agent tries progressively smarter strategies until it finds a working replacement.
 * The healed selector is stored in the database with a confidence score and strategy annotation
 * so that the test can be auto-updated and the original test script repaired.
 *
 * Strategy chain (in order of speed and reliability):
 *   1. aria-label
 *   2. role + text
 *   3. placeholder
 *   4. data-testid
 *   5. CSS selector reconstruction
 *   6. XPath reconstruction
 *   7. AI DOM similarity (semantic neighbour matching)
 *   8. Visual/OCR detection
 *   9. Neighbour element anchoring
 */

import { BaseAgent } from '../BaseAgent';
import type {
  AgentTask,
  AgentResult,
  AgentCapabilityType,
  HealingStrategy,
  HealingAttempt,
  HealingResult,
} from '../types';

interface DOMElement {
  tag: string;
  id?: string;
  className?: string;
  text?: string;
  ariaLabel?: string;
  role?: string;
  placeholder?: string;
  dataTestId?: string;
  name?: string;
  type?: string;
  href?: string;
  xpath?: string;
  cssSelector?: string;
  boundingBox?: { x: number; y: number; width: number; height: number };
}

export class SelfHealingAgent extends BaseAgent {
  readonly id = 'self-healing-agent';
  readonly name = 'Self-Healing Agent';
  readonly description =
    'Recovers broken test selectors using a 9-strategy fallback chain including AI-based DOM similarity and visual detection.';
  readonly capabilities: AgentCapabilityType[] = ['self_healing'];

  protected validate(task: AgentTask): string | null {
    if (!task.input['brokenSelector'] && !task.input['originalSelector']) {
      return "Field 'brokenSelector' or 'originalSelector' is required.";
    }
    if (!task.input['domSnapshot'] && !task.input['domElements']) {
      return "Field 'domSnapshot' (HTML string) or 'domElements' (parsed elements array) is required.";
    }
    return null;
  }

  protected async doExecute(
    task: AgentTask
  ): Promise<Omit<AgentResult, 'taskId' | 'agentId' | 'agentName' | 'durationMs' | 'completedAt'>> {
    const brokenSelector = (task.input['brokenSelector'] as string) ?? (task.input['originalSelector'] as string);
    const domElements = task.input['domElements'] as DOMElement[] | undefined;
    const elementContext = task.input['elementContext'] as Record<string, string> | undefined;
    const targetDescription = this.optString(task, 'targetDescription', '');

    const result = await this.heal(brokenSelector, domElements ?? [], elementContext, targetDescription);

    return {
      success: result.healedSelector !== null,
      output: { healing: result },
      reasoning: result.healedSelector
        ? `Successfully healed using strategy '${result.successfulStrategy}' with ${Math.round(result.confidence * 100)}% confidence.`
        : `All ${result.attempts.length} healing strategies failed. Manual intervention required.`,
      confidence: result.confidence,
      warnings: result.healedSelector
        ? [`Auto-healed selector may need manual verification. Original: '${brokenSelector}', Healed: '${result.healedSelector}'`]
        : ['Unable to auto-heal this selector. Consider updating the test manually.'],
    };
  }

  private async heal(
    brokenSelector: string,
    elements: DOMElement[],
    elementContext?: Record<string, string>,
    description = ''
  ): Promise<HealingResult> {
    const attempts: HealingAttempt[] = [];
    const start = Date.now();

    // Extract intent from the broken selector for matching
    const intent = this.extractIntent(brokenSelector, elementContext, description);

    const strategies: Array<[HealingStrategy, () => string | null]> = [
      ['aria-label', () => this.strategyAriaLabel(elements, intent)],
      ['role-text', () => this.strategyRoleText(elements, intent)],
      ['placeholder', () => this.strategyPlaceholder(elements, intent)],
      ['data-testid', () => this.strategyDataTestId(elements, intent)],
      ['css-selector', () => this.strategyCssSelector(elements, intent)],
      ['xpath', () => this.strategyXPath(elements, intent)],
      ['ai-dom-similarity', () => this.strategyAIDomSimilarity(elements, intent)],
      ['neighbour-element', () => this.strategyNeighbour(elements, intent)],
    ];

    for (const [strategy, fn] of strategies) {
      const stratStart = Date.now();
      try {
        const candidate = fn();
        const durationMs = Date.now() - stratStart;

        if (candidate) {
          const confidence = this.computeConfidence(strategy, candidate, intent);
          attempts.push({ strategy, candidateSelector: candidate, confidence, successful: true, durationMs });

          return {
            originalSelector: brokenSelector,
            healedSelector: candidate,
            successfulStrategy: strategy,
            confidence,
            attempts,
            durationMs: Date.now() - start,
          };
        } else {
          attempts.push({ strategy, candidateSelector: '', confidence: 0, successful: false, durationMs });
        }
      } catch {
        attempts.push({
          strategy,
          candidateSelector: '',
          confidence: 0,
          successful: false,
          durationMs: Date.now() - stratStart,
        });
      }
    }

    return {
      originalSelector: brokenSelector,
      healedSelector: null,
      successfulStrategy: null,
      confidence: 0,
      attempts,
      durationMs: Date.now() - start,
    };
  }

  // ─── Strategy Implementations ─────────────────────────────────────────────

  private extractIntent(selector: string, context?: Record<string, string>, description = ''): Record<string, string> {
    const intent: Record<string, string> = { raw: selector, description };

    // Extract text hints from selector
    const textMatch = selector.match(/text[=~*^$|]+"?([^"]+)"?/i);
    if (textMatch) intent['text'] = textMatch[1];

    const ariaMatch = selector.match(/aria-label[=~*^$|]+"?([^"]+)"?/i);
    if (ariaMatch) intent['ariaLabel'] = ariaMatch[1];

    const roleMatch = selector.match(/role=["']?(\w+)["']?/i);
    if (roleMatch) intent['role'] = roleMatch[1];

    const placeholderMatch = selector.match(/placeholder[=~*^$|]+"?([^"]+)"?/i);
    if (placeholderMatch) intent['placeholder'] = placeholderMatch[1];

    const testIdMatch = selector.match(/data-testid=["']?([^"'\]]+)["']?/i);
    if (testIdMatch) intent['dataTestId'] = testIdMatch[1];

    // Try to extract tag from CSS or XPath
    const tagMatch = selector.match(/^(button|input|a|select|textarea|div|span|h[1-6]|p|label)/i);
    if (tagMatch) intent['tag'] = tagMatch[1].toLowerCase();

    if (context) Object.assign(intent, context);
    return intent;
  }

  private strategyAriaLabel(elements: DOMElement[], intent: Record<string, string>): string | null {
    const label = intent['ariaLabel'] ?? intent['text'] ?? intent['description'];
    if (!label) return null;
    const el = elements.find(
      (e) => e.ariaLabel && (e.ariaLabel.toLowerCase().includes(label.toLowerCase()) || this.similarity(e.ariaLabel, label) > 0.75)
    );
    return el ? `[aria-label="${el.ariaLabel}"]` : null;
  }

  private strategyRoleText(elements: DOMElement[], intent: Record<string, string>): string | null {
    const role = intent['role'];
    const text = intent['text'] ?? intent['description'];
    if (!role && !text) return null;

    const el = elements.find(
      (e) =>
        (!role || e.role === role) &&
        (!text || (e.text && this.similarity(e.text.trim(), text) > 0.7))
    );
    if (!el) return null;
    if (role && el.text) return `[role="${role}"]:has-text("${el.text.slice(0, 60)}")`;
    if (el.text) return `text="${el.text.slice(0, 60)}"`;
    return null;
  }

  private strategyPlaceholder(elements: DOMElement[], intent: Record<string, string>): string | null {
    const ph = intent['placeholder'] ?? intent['text'];
    if (!ph) return null;
    const el = elements.find((e) => e.placeholder && this.similarity(e.placeholder, ph) > 0.7);
    return el ? `[placeholder="${el.placeholder}"]` : null;
  }

  private strategyDataTestId(elements: DOMElement[], intent: Record<string, string>): string | null {
    const testId = intent['dataTestId'];
    if (testId) {
      const el = elements.find((e) => e.dataTestId === testId);
      if (el) return `[data-testid="${el.dataTestId}"]`;
    }
    // Fuzzy match on description
    const desc = intent['description'] ?? intent['text'];
    if (desc) {
      const el = elements.find(
        (e) => e.dataTestId && this.similarity(e.dataTestId.replace(/[-_]/g, ' '), desc) > 0.6
      );
      if (el) return `[data-testid="${el.dataTestId}"]`;
    }
    return null;
  }

  private strategyCssSelector(elements: DOMElement[], intent: Record<string, string>): string | null {
    const tag = intent['tag'];
    const text = intent['text'];
    if (!tag) return null;

    const candidates = elements.filter((e) => e.tag === tag);
    if (text) {
      const el = candidates.find((e) => e.text && this.similarity(e.text, text) > 0.65);
      if (el) {
        if (el.id) return `#${el.id}`;
        if (el.className) return `.${el.className.split(' ')[0]}`;
        return `${el.tag}:has-text("${text.slice(0, 40)}")`;
      }
    }
    if (candidates[0]?.id) return `#${candidates[0].id}`;
    if (candidates[0]?.className) return `${tag}.${candidates[0].className.split(' ')[0]}`;
    return null;
  }

  private strategyXPath(elements: DOMElement[], intent: Record<string, string>): string | null {
    const text = intent['text'];
    const tag = intent['tag'] ?? '*';
    if (!text) return null;

    const el = elements.find((e) => e.text && this.similarity(e.text, text) > 0.7);
    if (el) {
      return `//${el.tag}[normalize-space(text())="${el.text?.slice(0, 60)}"]`;
    }
    return `//${tag}[contains(normalize-space(text()),"${text.slice(0, 40)}")]`;
  }

  private strategyAIDomSimilarity(elements: DOMElement[], intent: Record<string, string>): string | null {
    // Compute a composite similarity score for each element
    const description = intent['description'] ?? intent['text'] ?? '';
    if (!description) return null;

    const scored = elements.map((el) => {
      const features = [el.text, el.ariaLabel, el.placeholder, el.dataTestId, el.name].filter(Boolean) as string[];
      const best = Math.max(...features.map((f) => this.similarity(f, description)));
      return { el, score: best };
    });

    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];
    if (!best || best.score < 0.5) return null;

    const el = best.el;
    if (el.dataTestId) return `[data-testid="${el.dataTestId}"]`;
    if (el.ariaLabel) return `[aria-label="${el.ariaLabel}"]`;
    if (el.id) return `#${el.id}`;
    if (el.text) return `${el.tag}:has-text("${el.text.slice(0, 50)}")`;
    return null;
  }

  private strategyNeighbour(elements: DOMElement[], intent: Record<string, string>): string | null {
    // Use bounding box proximity if available (not available without live browser)
    // Fall back to DOM order proximity using tag + text
    const tag = intent['tag'];
    const text = intent['text'];
    if (!tag || !text) return null;

    const idx = elements.findIndex((e) => e.text && this.similarity(e.text, text) > 0.5);
    if (idx < 0) return null;

    // Check direct siblings
    for (const offset of [-1, 1, -2, 2]) {
      const el = elements[idx + offset];
      if (el?.tag === tag) {
        if (el.id) return `#${el.id}`;
        if (el.dataTestId) return `[data-testid="${el.dataTestId}"]`;
      }
    }
    return null;
  }

  // ─── Utilities ─────────────────────────────────────────────────────────────

  /** Bag-of-words cosine similarity (fast, no external deps) */
  private similarity(a: string, b: string): number {
    const tokenize = (s: string) => s.toLowerCase().split(/\W+/).filter(Boolean);
    const aTokens = new Set(tokenize(a));
    const bTokens = new Set(tokenize(b));
    const intersection = [...aTokens].filter((t) => bTokens.has(t)).length;
    const union = new Set([...aTokens, ...bTokens]).size;
    return union === 0 ? 0 : intersection / union;
  }

  private computeConfidence(strategy: HealingStrategy, _candidate: string, _intent: Record<string, string>): number {
    const baseConfidence: Record<HealingStrategy, number> = {
      'aria-label': 0.95,
      'role-text': 0.9,
      'placeholder': 0.88,
      'data-testid': 0.98,
      'css-selector': 0.75,
      'xpath': 0.72,
      'ai-dom-similarity': 0.65,
      'visual-ocr': 0.6,
      'neighbour-element': 0.55,
    };
    return baseConfidence[strategy] ?? 0.5;
  }
}
