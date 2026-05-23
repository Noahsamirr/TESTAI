import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { sanitizeMermaid } from '../../utils/mermaidUtils';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  flowchart: {
    useMaxWidth: true,
    htmlLabels: true,
  },
  themeVariables: {
    background: '#0a0f0d', // dark green/slate background matching our theme
    primaryColor: '#1d2e27', // dark teal/green
    primaryTextColor: '#f0fdf4', // light green-white
    primaryBorderColor: '#1b3b2b', // muted green border
    lineColor: '#5eead4', // teal/emerald lines
    secondaryColor: '#0a0f0d',
    tertiaryColor: '#1d2e27',
  }
});

interface Props {
  chart: string;
}

export default function Mermaid({ chart }: Props) {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const renderChart = async () => {
      const elementId = `mermaid-${Math.random().toString(36).slice(2, 11)}`;
      try {
        setError(null);
        if (active) {
          const cleanChart = sanitizeMermaid(chart);
          
          if (!cleanChart) {
            setSvg('');
            return;
          }
          
          const { svg: renderedSvg } = await mermaid.render(elementId, cleanChart);
          if (active) {
            setSvg(renderedSvg);
          }
        }
      } catch (err: any) {
        console.error('Mermaid render error:', err);
        if (active) {
          // Remove elements that mermaid might leave behind on error
          const badEl = document.getElementById(elementId);
          if (badEl) badEl.remove();
          
          setError(err.message || 'Failed to parse Mermaid diagram');
        }
      }
    };

    renderChart();

    return () => {
      active = false;
    };
  }, [chart]);

  if (error) {
    return (
      <div className="bg-accent-red/10 border border-accent-red/20 text-accent-red p-3 rounded-lg text-xs font-mono my-2 overflow-x-auto whitespace-pre-wrap">
        <p className="font-semibold mb-1">Diagram Parse Error:</p>
        <span className="text-gray-400">{error}</span>
      </div>
    );
  }

  return (
    <div className="mermaid-chart flex justify-center bg-surface-900 border border-surface-600 rounded-xl p-4 my-3 overflow-x-auto min-w-[280px]">
      <div 
        className="w-full max-w-full flex justify-center"
        dangerouslySetInnerHTML={{ __html: svg || '<div class="text-xs text-gray-500">Rendering diagram...</div>' }} 
      />
    </div>
  );
}
