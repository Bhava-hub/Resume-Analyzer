'use client';

import { useState } from 'react';
import type { AnalysisResult, AnalysisError, AnalysisStatus } from '@/types/analysis';
import { validatePdfFile, validateJobDescription } from '@/utils/validate';

interface UseAnalysisState {
  resumeFile: File | null;
  jobDescription: string;
  status: AnalysisStatus;
  result: AnalysisResult | null;
  analysisId: string | null;   // returned by /api/analyze after DB save
  error: AnalysisError | null;
  fileError: string | null;
  jdError: string | null;
}

interface UseAnalysisReturn extends UseAnalysisState {
  setResumeFile: (file: File | null) => void;
  setJobDescription: (jd: string) => void;
  analyze: () => Promise<void>;
  reset: () => void;
}

const INITIAL_STATE: UseAnalysisState = {
  resumeFile: null,
  jobDescription: '',
  status: 'idle',
  result: null,
  analysisId: null,
  error: null,
  fileError: null,
  jdError: null,
};

export function useAnalysis(): UseAnalysisReturn {
  const [state, setState] = useState<UseAnalysisState>(INITIAL_STATE);

  function setResumeFile(file: File | null) {
    setState((s) => ({ ...s, resumeFile: file, fileError: null }));
  }

  function setJobDescription(jd: string) {
    setState((s) => ({ ...s, jobDescription: jd, jdError: null }));
  }

  function reset() {
    setState(INITIAL_STATE);
  }

  async function analyze() {
    // Client-side validation
    const fileVal = validatePdfFile(state.resumeFile as File);
    const jdVal = validateJobDescription(state.jobDescription);

    if (!fileVal.valid || !jdVal.valid) {
      setState((s) => ({
        ...s,
        fileError: fileVal.valid ? null : fileVal.error!,
        jdError: jdVal.valid ? null : jdVal.error!,
      }));
      return;
    }

    setState((s) => ({
      ...s,
      status: 'loading',
      result: null,
      error: null,
      fileError: null,
      jdError: null,
    }));

    const formData = new FormData();
    formData.append('file', state.resumeFile!);
    formData.append('jobDescription', state.jobDescription);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        setState((s) => ({
          ...s,
          status: 'error',
          error: json.error ?? {
            message: 'An unexpected error occurred.',
            code: 'UNKNOWN',
          },
        }));
        return;
      }

      setState((s) => ({
        ...s,
        status: 'success',
        result: json.data,
        // Capture the analysisId returned by the backend after saving to DB.
        // Falls back to null if the DB save failed (app still works, just no roadmap link).
        analysisId: json.analysisId ?? null,
      }));
    } catch {
      setState((s) => ({
        ...s,
        status: 'error',
        error: {
          message: 'Network error. Please check your connection and try again.',
          code: 'UNKNOWN',
        },
      }));
    }
  }

  return {
    ...state,
    setResumeFile,
    setJobDescription,
    analyze,
    reset,
  };
}
