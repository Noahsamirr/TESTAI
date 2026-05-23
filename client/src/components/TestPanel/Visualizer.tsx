import { useState } from 'react';
import { TestCase, TestReport } from '../../types';
import Mermaid from './Mermaid';
import { HelpCircle } from 'lucide-react';
import { escapeMermaidLabel } from '../../utils/mermaidUtils';

interface Props {
  testCases?: TestCase[];
  report?: TestReport;
}

export default function Visualizer({ testCases = [], report }: Props) {
  const [activeTab, setActiveTab] = useState<'cases' | 'report'>(
    report ? 'report' : 'cases'
  );
  const [selectedCaseId, setSelectedCaseId] = useState<string>('all');

  const generateTestCaseMermaid = (tc: TestCase) => {
    let mermaidText = 'flowchart TD\n';
    
    // Add custom class definitions for aesthetics
    mermaidText += '  classDef step fill:#101a15,stroke:#164e33,stroke-width:1px,color:#d1fae5;\n';
    mermaidText += '  classDef assert fill:#0c111d,stroke:#1e293b,stroke-width:1px,color:#94a3b8;\n';
    mermaidText += '  classDef start fill:#1e1b4b,stroke:#312e81,stroke-width:1px,color:#e0e7ff;\n';
    mermaidText += '  classDef outcome fill:#064e3b,stroke:#059669,stroke-width:1px,color:#34d399;\n\n';

    // Title / Starting Point
    const safeTitle = escapeMermaidLabel(tc.title);
    mermaidText += `  Start[${safeTitle}]:::start\n`;

    let prevNode = 'Start';

    // Preconditions
    const preconditions = tc.preconditions || [];
    if (preconditions.length > 0) {
      const preText = preconditions.map(p => `- ${p}`).join('\\n');
      const safePre = escapeMermaidLabel(`Preconditions:\\n${preText}`);
      mermaidText += `  Pre[${safePre}]:::start\n`;
      mermaidText += `  Start --> Pre\n`;
      prevNode = 'Pre';
    }

    // Steps
    const steps = tc.steps || [];
    steps.forEach((step, idx) => {
      const stepId = `Step${idx}`;
      const assertId = `Assert${idx}`;
      const safeAction = escapeMermaidLabel(`${step.stepNumber}. ${step.action || ''}`);
      const safeExpected = escapeMermaidLabel(`Expected: ${step.expectedResult || ''}`);

      mermaidText += `  ${stepId}[${safeAction}]:::step\n`;
      mermaidText += `  ${assertId}[${safeExpected}]:::assert\n`;

      mermaidText += `  ${prevNode} --> ${stepId}\n`;
      mermaidText += `  ${stepId} --> ${assertId}\n`;
      prevNode = assertId;
    });

    // Final Outcome
    if (tc.expectedOutcome) {
      const safeOutcome = escapeMermaidLabel(`Expected Outcome:\\n${tc.expectedOutcome}`);
      mermaidText += `  Outcome[${safeOutcome}]:::outcome\n`;
      mermaidText += `  ${prevNode} --> Outcome\n`;
    }

    return mermaidText;
  };

  const generateAllCasesMermaid = (cases: TestCase[]) => {
    let mermaidText = 'flowchart LR\n';
    mermaidText += '  classDef case fill:#101a15,stroke:#164e33,stroke-width:1px,color:#d1fae5;\n';
    mermaidText += '  classDef root fill:#1e1b4b,stroke:#312e81,stroke-width:1px,color:#e0e7ff;\n';
    mermaidText += '  classDef high fill:#7f1d1d,stroke:#dc2626,stroke-width:1px,color:#fef2f2;\n';
    mermaidText += '  classDef medium fill:#78350f,stroke:#d97706,stroke-width:1px,color:#fffbeb;\n';
    mermaidText += '  classDef low fill:#1e3a8a,stroke:#3b82f6,stroke-width:1px,color:#eff6ff;\n\n';

    mermaidText += '  Suite["Test Suite Overview"]:::root\n';

    cases.forEach((tc) => {
      const truncatedTitle = tc.title.length > 25 ? tc.title.substring(0, 22) + '...' : tc.title;
      const cleanTitle = escapeMermaidLabel(`${tc.id}: ${truncatedTitle}`);
      const priorityClass = tc.priority === 'High' ? 'high' : tc.priority === 'Medium' ? 'medium' : 'low';
      
      mermaidText += `  ${tc.id}[${cleanTitle}]:::case\n`;
      mermaidText += `  Suite -->|${tc.priority}| ${tc.id}\n`;
    });

    return mermaidText;
  };

  const generateReportMermaid = (rep: TestReport) => {
    let mermaidText = 'flowchart TD\n';
    mermaidText += '  classDef pass fill:#064e3b,stroke:#059669,stroke-width:2px,color:#ecfdf5;\n';
    mermaidText += '  classDef fail fill:#7f1d1d,stroke:#dc2626,stroke-width:2px,color:#fef2f2;\n';
    mermaidText += '  classDef skip fill:#374151,stroke:#4b5563,stroke-width:2px,color:#d1d5db;\n';
    mermaidText += '  classDef suite fill:#1e1b4b,stroke:#312e81,stroke-width:2px,color:#e0e7ff;\n';
    mermaidText += '  classDef decision fill:#78350f,stroke:#d97706,stroke-width:2px,color:#fffbeb;\n';
    mermaidText += '  classDef bug fill:#451a03,stroke:#b45309,stroke-width:1px,color:#fef3c7;\n\n';

    const safeSuite = escapeMermaidLabel(`Suite: ${rep.testSuite}\\nEnv: ${rep.environment}`);
    mermaidText += `  Suite[${safeSuite}]:::suite\n`;
    mermaidText += `  Passed["Passed: ${rep.passed}"]:::pass\n`;
    mermaidText += `  Failed["Failed: ${rep.failed}"]:::fail\n`;
    mermaidText += `  Skipped["Skipped: ${rep.skipped}"]:::skip\n`;

    mermaidText += `  Suite --> Passed\n`;
    mermaidText += `  Suite --> Failed\n`;
    mermaidText += `  Suite --> Skipped\n`;

    // Decision diamond
    mermaidText += `  Decision{"Release Decision"}:::decision\n`;
    mermaidText += `  Passed --> Decision\n`;
    mermaidText += `  Failed --> Decision\n`;

    // Bugs nodes
    if (rep.bugs && rep.bugs.length > 0) {
      rep.bugs.forEach((bug) => {
        const safeBugTitle = bug.title.replace(/"/g, "'");
        mermaidText += `  ${bug.id}["${bug.id}: ${safeBugTitle}\\n(${bug.severity})"]:::bug\n`;
        mermaidText += `  Failed --> ${bug.id}\n`;
      });
    }

    const isPassed = !rep.releaseStatus || rep.releaseStatus.includes('PASSED');
    if (isPassed && rep.failed === 0) {
      mermaidText += `  Decision -->|GO| Release["RELEASE READY\\nSTATUS: GO (PASSED)"]:::pass\n`;
    } else {
      mermaidText += `  Decision -->|NO-GO| Release["RELEASE BLOCKED\\nSTATUS: NO-GO (${rep.releaseStatus || 'FAILED'})"]:::fail\n`;
    }

    return mermaidText;
  };

  const getMermaidCode = () => {
    if (activeTab === 'report' && report) {
      return generateReportMermaid(report);
    }
    
    if (activeTab === 'cases' && testCases.length > 0) {
      if (selectedCaseId === 'all') {
        return generateAllCasesMermaid(testCases);
      }
      const selectedCase = testCases.find(c => c.id === selectedCaseId);
      if (selectedCase) {
        return generateTestCaseMermaid(selectedCase);
      }
    }
    
    return '';
  };

  const mermaidCode = getMermaidCode();

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-accent-green">Visual Flows & Diagrams</h4>
        {report && testCases.length > 0 && (
          <div className="flex gap-1 p-0.5 bg-surface-900 rounded-lg">
            <button
              onClick={() => setActiveTab('cases')}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                activeTab === 'cases'
                  ? 'bg-brand-500/20 text-brand-400 font-medium'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Test Cases
            </button>
            <button
              onClick={() => setActiveTab('report')}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                activeTab === 'report'
                  ? 'bg-brand-500/20 text-brand-400 font-medium'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Report Pipeline
            </button>
          </div>
        )}
      </div>

      {activeTab === 'cases' && testCases.length > 0 && (
        <div className="mb-3">
          <label className="text-xs text-gray-500 block mb-1">Select Case to Visualize:</label>
          <select
            value={selectedCaseId}
            onChange={(e) => setSelectedCaseId(e.target.value)}
            className="w-full bg-surface-900 text-gray-200 text-xs px-2 py-1.5 rounded-lg border border-surface-600 focus:outline-none focus:border-accent-green"
          >
            <option value="all">TestSuite Overview (All cases)</option>
            {testCases.map((tc) => (
              <option key={tc.id} value={tc.id}>
                {tc.id}: {tc.title} ({tc.priority})
              </option>
            ))}
          </select>
        </div>
      )}

      {mermaidCode ? (
        <div className="flex-1 overflow-y-auto pr-1">
          <Mermaid chart={mermaidCode} />
          
          <div className="mt-4 p-3 bg-surface-900/60 border border-surface-600 rounded-xl">
            <h5 className="text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
              <HelpCircle size={12} className="text-accent-green" />
              About this diagram
            </h5>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              {activeTab === 'cases' 
                ? (selectedCaseId === 'all'
                  ? "This flowchart visualizes the overall structure of the test suite and categorizes each test case by its priority level."
                  : "This diagram shows the sequential path of execution steps for the test case, including user actions and their corresponding assertions.")
                : "This release readiness pipeline visualizes the overall pass/fail breakdown of tests, correlates failed tests with their respective bug severity logs, and highlights the final Go/No-Go release status."
              }
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center flex-1 text-center py-12 text-gray-500">
          <p className="text-xs">No visual data available. Generate test cases or run a script to see diagrams here.</p>
        </div>
      )}
    </div>
  );
}
