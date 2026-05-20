'use client';

import ResumeForm from '@/components/ResumeForm';
import AnalysisResults from '@/components/AnalysisResults';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import EmptyState from '@/components/EmptyState';
import { useAnalysis } from '@/hooks/useAnalysis';

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

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600">
                <svg
                  className="h-5 w-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 leading-tight">Resume Analyzer</p>
                <p className="text-xs text-gray-500 leading-tight">AI-powered hiring feedback</p>
              </div>
            </div>

            {status === 'success' && (
              <button
                onClick={reset}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Start over
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {/* Hero */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            Get brutally honest resume feedback
          </h1>
          <p className="mt-2 text-sm text-gray-500 sm:text-base">
            Upload your resume and a job description. Our AI hiring manager tells you exactly
            what&apos;s missing and how to fix it — in under 30 seconds.
          </p>
        </div>

        {/* Form card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <ResumeForm
            resumeFile={resumeFile}
            jobDescription={jobDescription}
            fileError={fileError}
            jdError={jdError}
            isLoading={status === 'loading'}
            onFileChange={setResumeFile}
            onJdChange={setJobDescription}
            onSubmit={analyze}
          />
        </div>

        {/* Output area */}
        <div className="mt-8">
          {status === 'loading' && <LoadingSkeleton />}

          {status === 'error' && error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-5">
              <div className="flex items-start gap-3">
                <svg
                  className="mt-0.5 h-5 w-5 shrink-0 text-red-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                  />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-red-800">Analysis failed</p>
                  <p className="mt-0.5 text-sm text-red-600">{error.message}</p>
                </div>
              </div>
            </div>
          )}

          {status === 'success' && result && <AnalysisResults result={result} />}

          {status === 'idle' && <EmptyState />}
        </div>
      </div>
    </main>
  );
}
