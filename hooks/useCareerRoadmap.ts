'use client';

import { useState, useEffect, useRef } from 'react';
import type {
  CareerRoadmap,
  CareerRoadmapStatus,
} from '@/types/analysis';

interface UseCareerRoadmapReturn {
  roadmap: CareerRoadmap | null;
  status: CareerRoadmapStatus;
  error: string | null;
  generate: (jobTitle: string, analysisId: string) => Promise<void>;
  reset: () => void;
}

export function useCareerRoadmap(): UseCareerRoadmapReturn {
  const [roadmap, setRoadmap] = useState<CareerRoadmap | null>(null);
  const [status, setStatus] = useState<CareerRoadmapStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  // Prevent double-fires in React StrictMode
  const abortRef = useRef<AbortController | null>(null);

  function reset() {
    abortRef.current?.abort();
    setRoadmap(null);
    setStatus('idle');
    setError(null);
  }

  async function generate(jobTitle: string, analysisId: string) {
    // Abort any in-progress request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus('loading');
    setRoadmap(null);
    setError(null);

    try {
      const res = await fetch('/api/career-roadmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Only send the job title and analysisId — the backend fetches the rest from the DB.
        body: JSON.stringify({ jobTitle, analysisId }),
        signal: controller.signal,
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        setStatus('error');
        setError(json.error?.message ?? 'Failed to generate career roadmap.');
        return;
      }

      setRoadmap(json.data as CareerRoadmap);
      setStatus('success');
    } catch (err) {
      if ((err as Error).name === 'AbortError') return; // intentional cancel
      setStatus('error');
      setError('Network error. Please check your connection.');
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  return { roadmap, status, error, generate, reset };
}

