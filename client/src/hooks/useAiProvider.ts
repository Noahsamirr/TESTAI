import { useEffect, useState } from 'react';
import api from '../services/api';

export function useAiProvider() {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ ai?: { provider: string; model: string } }>('/health')
      .then(({ data }) => {
        if (data.ai) {
          const labels: Record<string, string> = {
            gemini: 'Gemini',
            deepseek: 'DeepSeek',
            puter: 'Puter',
            groq: 'Groq',
            ollama: 'Ollama',
            anthropic: 'Claude',
          };
          const name = labels[data.ai.provider] || data.ai.provider;
          setLabel(`${name} · ${data.ai.model}`);
        }
      })
      .catch(() => setLabel(null));
  }, []);

  return label;
}
