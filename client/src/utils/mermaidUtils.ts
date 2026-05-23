/**
 * Sanitizes Mermaid diagram text to be more resilient to common AI errors.
 */
export function sanitizeMermaid(chart: string): string {
  if (!chart) return '';

  let clean = chart
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .trim();

  // Remove markdown code fences if they accidentally leaked in
  clean = clean.replace(/^```mermaid\s*/i, '');
  clean = clean.replace(/```$/i, '');

  // Ensure the chart doesn't start with the word 'mermaid' itself
  if (clean.toLowerCase().startsWith('mermaid\n')) {
    clean = clean.substring(8).trim();
  }

  // Common typo: "flowchart TD A[..." instead of "flowchart TD\nA[..."
  if (clean.toLowerCase().startsWith('flowchart ') || clean.toLowerCase().startsWith('graph ')) {
    const lines = clean.split('\n');
    if (lines[0].match(/(flowchart|graph)\s+\w+\s+\w+/i)) {
      // Looks like content started on the first line
      const firstLine = lines[0];
      const match = firstLine.match(/^((?:flowchart|graph)\s+\w+)\s+(.*)$/i);
      if (match) {
        clean = match[1] + '\n' + match[2] + (lines.length > 1 ? '\n' + lines.slice(1).join('\n') : '');
      }
    }
  }

  // Handle sequenceDiagram typos
  if (clean.toLowerCase().startsWith('sequencediagram')) {
    // 1. Ensure a newline after sequenceDiagram
    clean = clean.replace(/^sequencediagram\s*/i, 'sequenceDiagram\n');
    
    // 2. Ensure a newline after autonumber
    clean = clean.replace(/\nautonumber\s+([^\n])/i, '\nautonumber\n$1');
    
    // 3. Fix cases where keywords are smashed together like "sequenceDiagramautonumber"
    clean = clean.replace(/^sequenceDiagramautonumber/i, 'sequenceDiagram\nautonumber\n');
  }

  // If no diagram type is specified, prepend 'flowchart TD'
  const validTypes = ['flowchart', 'graph', 'sequencediagram', 'classdiagram', 'statediagram', 'erdiagram', 'journey', 'gantt', 'pie', 'quadrantchart', 'mindmap', 'timeline'];
  const firstWord = clean.split(/[\s\n]/)[0].toLowerCase();
  if (!validTypes.includes(firstWord)) {
    if (clean.includes('-->') || clean.includes('---')) {
      clean = 'flowchart TD\n' + clean;
    }
  }

  return clean;
}

/**
 * Escapes special characters for Mermaid labels.
 * Mermaid 11+ is strict about characters in labels. 
 * Using double quotes "label" is the safest way.
 */
export function escapeMermaidLabel(label: string): string {
  if (!label) return '""';
  
  // 1. Replace double quotes with single quotes to avoid breaking the surrounding " "
  // 2. Remove or replace characters that break Mermaid even inside quotes
  let safe = label
    .replace(/"/g, "'")
    .replace(/[\n\r]/g, ' ') // No real newlines in labels
    .replace(/[[\](){}]/g, (m) => {
      const map: Record<string, string> = {
        '[': '(',
        ']': ')',
        '{': '(',
        '}': ')',
        '(': '(',
        ')': ')'
      };
      return map[m] || m;
    })
    .trim();

  // Return double-quoted string
  return `"${safe}"`;
}
