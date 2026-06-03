'use client';

import { useEffect, useRef, useState } from 'react';
import ResumeForm from '@/components/ResumeForm';
import AnalysisResults from '@/components/AnalysisResults';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import EmptyState from '@/components/EmptyState';
import CareerRoadmap from '@/components/CareerRoadmap';
import { useAnalysis } from '@/hooks/useAnalysis';
import { useCareerRoadmap } from '@/hooks/useCareerRoadmap';

export default function HomePage() {
  const {
    resumeFile,
    jobDescription,
    status,
    result,
    error,
    fileError,
    jdError,
    setResumeFile,
    setJobDescription,
    analyze,
    reset,
  } = useAnalysis();

  const [jobTitle, setJobTitleState] = useState('');
  const [jobTitleError, setJobTitleError] = useState<string | null>(null);

  function setJobTitle(title: string) {
    setJobTitleState(title);
    setJobTitleError(null);
  }

  // Career roadmap — auto-triggered after analysis succeeds
  const {
    roadmap,
    status: roadmapStatus,
    error: roadmapError,
    generate: generateRoadmap,
    reset: resetRoadmap,
  } = useCareerRoadmap();

  // Deduplicate: only fire roadmap once per analysis result
  const lastGeneratedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (status !== 'success' || !result || !jobTitle.trim()) return;

    const key = `${jobTitle.trim()}::${result.missingSkills.items.length}::${result.actionPlan.items.length}`;
    if (lastGeneratedKeyRef.current === key) return;
    lastGeneratedKeyRef.current = key;

    generateRoadmap(jobTitle.trim(), jobDescription, result);
  }, [status, result, jobTitle, jobDescription, generateRoadmap]);

  function handleReset() {
    reset();
    resetRoadmap();
    setJobTitleState('');
    setJobTitleError(null);
    lastGeneratedKeyRef.current = null;
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* ── Header ─────────────────────────────────────── */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 leading-tight">Resume Analyzer</p>
                <p className="text-xs text-gray-500 leading-tight">AI-powered hiring feedback + career roadmap</p>
              </div>
            </div>

            {(status === 'success' || roadmapStatus !== 'idle') && (
              <button
                onClick={handleReset}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Start over
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {/* ── Hero ───────────────────────────────────────── */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            Get brutally honest resume feedback
          </h1>
          <p className="mt-2 text-sm text-gray-500 sm:text-base">
            Upload your resume, paste a job description, and enter your target job title.
            Our AI analyzes your gaps <em>and</em> builds a personalized career roadmap backed by real Reddit stories.
          </p>
        </div>

        {/* ── Form ───────────────────────────────────────── */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <ResumeForm
            resumeFile={resumeFile}
            jobDescription={jobDescription}
            jobTitle={jobTitle}
            fileError={fileError}
            jdError={jdError}
            jobTitleError={jobTitleError}
            isLoading={status === 'loading'}
            onFileChange={setResumeFile}
            onJdChange={setJobDescription}
            onJobTitleChange={setJobTitle}
            onSubmit={analyze}
          />
        </div>

        {/* ── Analysis output ─────────────────────────────── */}
        <div className="mt-8">
          {status === 'loading' && <LoadingSkeleton />}

          {status === 'error' && error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-5">
              <div className="flex items-start gap-3">
                <svg className="mt-0.5 h-5 w-5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-red-800">Analysis failed</p>
                  <p className="mt-0.5 text-sm text-red-600">{error.message}</p>
                </div>
              </div>
            </div>
          )}

          {status === 'success' && result && (
            <>
              <AnalysisResults result={result} />
              {/* Nudge if no job title was provided */}
              {!jobTitle.trim() && (
                <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-100 bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
                  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  <span>
                    Add a <strong>Job Title</strong> above and re-analyze to generate your personalised career roadmap.
                  </span>
                </div>
              )}
            </>
          )}

          {status === 'idle' && <EmptyState />}
        </div>

        {/* ── Career Roadmap (auto-generated) ─────────────── */}
        <CareerRoadmap
          roadmap={roadmap}
          status={roadmapStatus}
          error={roadmapError}
        />
      </div>
    </main>
  );
}
