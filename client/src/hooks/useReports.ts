import { useState, useCallback } from 'react';
import { getReports } from '../services/api';
import { TestReport } from '../types';

export function useReports(sessionId: string) {
  const [reports, setReports] = useState<{ id: string; data: TestReport; htmlPath?: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getReports(sessionId);
      setReports(data);
    } catch {
      setReports([]);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  return { reports, isLoading, fetchReports };
}
