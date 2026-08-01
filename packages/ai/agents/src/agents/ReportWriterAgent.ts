/**
 * @package @testmind/ai-agents
 * @description Report Writer Agent — aggregates test results and analysis from
 * other agents into comprehensive, human-readable executive summaries and release readiness reports.
 */

import { BaseAgent } from '../BaseAgent';
import type { AgentTask, AgentResult, AgentCapabilityType } from '../types';

interface ReportInput {
  reportType: 'executive_summary' | 'release_readiness' | 'bug_triage';
  testResults: TestRunSummary[];
  aiAnalysis?: string[];
  targetAudience?: 'executives' | 'developers' | 'qa';
  projectContext?: string;
}

interface TestRunSummary {
  suiteName: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  durationMs: number;
  environment: string;
}

interface ReportOutput {
  title: string;
  executiveSummary: string;
  riskAssessment: 'Low' | 'Medium' | 'High' | 'Critical';
  keyFindings: string[];
  recommendations: string[];
  markdownReport: string;
  metrics: {
    passRate: number;
    totalTests: number;
    totalFailures: number;
  };
}

export class ReportWriterAgent extends BaseAgent {
  readonly id = 'report-writer-agent';
  readonly name = 'Report Writer Agent';
  readonly description = 'Aggregates test runs and AI analysis into comprehensive release readiness and executive reports.';
  readonly capabilities: AgentCapabilityType[] = ['report_writing', 'release_readiness'];

  protected validate(task: AgentTask): string | null {
    const input = task.input as unknown as ReportInput;
    if (!Array.isArray(input.testResults)) {
      return "Field 'testResults' must be an array of test run summaries.";
    }
    return null;
  }

  protected async doExecute(
    task: AgentTask
  ): Promise<Omit<AgentResult, 'taskId' | 'agentId' | 'agentName' | 'durationMs' | 'completedAt'>> {
    const input = task.input as unknown as ReportInput;
    const { reportType, testResults, aiAnalysis = [], targetAudience = 'qa', projectContext = 'TestMind AI' } = input;

    // Aggregate metrics
    let total = 0, passed = 0, failed = 0, skipped = 0, durationMs = 0;
    for (const run of testResults) {
      total += run.total;
      passed += run.passed;
      failed += run.failed;
      skipped += run.skipped;
      durationMs += run.durationMs;
    }

    const passRate = total === 0 ? 0 : Math.round((passed / total) * 100);
    const riskAssessment = passRate >= 98 ? 'Low' : passRate >= 90 ? 'Medium' : passRate >= 75 ? 'High' : 'Critical';

    // Generate Key Findings
    const keyFindings: string[] = [];
    if (failed > 0) {
      keyFindings.push(`${failed} tests failed across the test suites, impacting ${Math.round((failed/total)*100)}% of the validation targets.`);
    }
    if (passRate < 100) {
      keyFindings.push(`Overall pass rate is ${passRate}%, which is ${passRate < 95 ? 'below' : 'close to'} the target threshold of 95%.`);
    }
    if (aiAnalysis.length > 0) {
      keyFindings.push(`AI Analysis highlights: ${aiAnalysis[0].slice(0, 100)}...`);
    }
    keyFindings.push(`Test execution completed in ${Math.round(durationMs / 1000)} seconds.`);

    // Generate Recommendations
    const recommendations: string[] = [];
    if (riskAssessment === 'Critical' || riskAssessment === 'High') {
      recommendations.push('Do NOT proceed with deployment. Critical failures require immediate triage.');
      recommendations.push('Run Bug Investigation Agent on the failed tests to determine root causes.');
    } else if (riskAssessment === 'Medium') {
      recommendations.push('Deployment can proceed with caution. Review non-critical failures.');
      recommendations.push('Apply Self-Healing Agent to repair brittle UI locators if flakiness is detected.');
    } else {
      recommendations.push('Proceed with deployment. Quality thresholds are met.');
    }

    const title = reportType === 'release_readiness' ? `Release Readiness Report: ${projectContext}` :
                  reportType === 'executive_summary' ? `Executive QA Summary: ${projectContext}` :
                  `Bug Triage Report: ${projectContext}`;

    const executiveSummary = riskAssessment === 'Low'
      ? `The recent test cycle for ${projectContext} was highly successful with a ${passRate}% pass rate. The application meets quality standards for production release.`
      : `The recent test cycle for ${projectContext} completed with a ${passRate}% pass rate. We observed ${failed} failures requiring attention before proceeding. Risk level is assessed as ${riskAssessment}.`;

    // Markdown Report
    const markdownReport = `# ${title}
**Date:** ${new Date().toLocaleDateString()}
**Risk Assessment:** ${riskAssessment}
**Target Audience:** ${targetAudience.charAt(0).toUpperCase() + targetAudience.slice(1)}

## Executive Summary
${executiveSummary}

## Key Metrics
- **Total Tests Executed:** ${total}
- **Pass Rate:** ${passRate}%
- **Passed:** ${passed} | **Failed:** ${failed} | **Skipped:** ${skipped}
- **Total Duration:** ${(durationMs / 1000).toFixed(1)}s

## Key Findings
${keyFindings.map(f => `- ${f}`).join('\n')}

## Recommendations
${recommendations.map(r => `- ${r}`).join('\n')}

${aiAnalysis.length > 0 ? `## AI Technical Analysis\n${aiAnalysis.map(a => `- ${a}`).join('\n')}` : ''}

---
*Generated by TestMind AI Report Writer*
`;

    const output: ReportOutput = {
      title,
      executiveSummary,
      riskAssessment,
      keyFindings,
      recommendations,
      markdownReport,
      metrics: { passRate, totalTests: total, totalFailures: failed }
    };

    return {
      success: true,
      output: { report: output },
      reasoning: `Synthesised data from ${testResults.length} test suites into a ${reportType} report targeting ${targetAudience}.`,
      confidence: 0.95,
    };
  }
}
