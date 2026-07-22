'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import ResumeForm from '@/components/ResumeForm';
import AnalysisResults from '@/components/AnalysisResults';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import CareerRoadmap from '@/components/CareerRoadmap';
import { useAnalysis } from '@/hooks/useAnalysis';
import { useCareerRoadmap } from '@/hooks/useCareerRoadmap';

export default function HomePage() {
  const {
    resumeFile,
    jobDescription,
    status,
    result,
    analysisId,
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

  const {
    roadmap,
    status: roadmapStatus,
    error: roadmapError,
    generate: generateRoadmap,
    reset: resetRoadmap,
  } = useCareerRoadmap();

  const lastGeneratedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (status !== 'success' || !result || !jobTitle.trim() || !analysisId) return;
    const key = `${jobTitle.trim()}::${result.missingSkills.items.length}::${result.actionPlan.items.length}`;
    if (lastGeneratedKeyRef.current === key) return;
    lastGeneratedKeyRef.current = key;
    // Pass only jobTitle + analysisId — backend fetches the rest from the DB
    generateRoadmap(jobTitle.trim(), analysisId);
  }, [status, result, jobTitle, analysisId, generateRoadmap]);

  function handleReset() {
    reset();
    resetRoadmap();
    setJobTitleState('');
    setJobTitleError(null);
    lastGeneratedKeyRef.current = null;
  }

  const showResults = status === 'success' && result;
  const showForm = !showResults;

  return (
    <div className="bg-mesh min-h-screen flex flex-col text-on-surface">

      {/* ── Fixed Top Nav ──────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 md:px-8 h-16 bg-surface-container-lowest shadow-[0px_4px_12px_rgba(46,50,48,0.06)]">
        <button
          onClick={handleReset}
          className="text-lg font-bold text-primary tracking-tight font-headline hover:opacity-80 transition-opacity"
          style={{ fontFamily: 'Literata, serif' }}
        >
          CareerStrategist
        </button>



        <div className="flex items-center gap-2">
          {showResults && (
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-outline-variant text-on-surface-variant text-sm font-semibold hover:bg-surface-container transition-colors"
            >
              <span className="material-symbols-outlined text-base" style={{ fontSize: 16 }}>arrow_back</span>
              Start over
            </button>
          )}

        </div>
      </header>

      {/* ── Main ───────────────────────────────────────────────────────── */}
      <main className="flex-grow pt-24 pb-16 px-4 md:px-6">

        {/* ══ UPLOAD / FORM PAGE ══════════════════════════════════════════ */}
        {showForm && (
          <div className="max-w-4xl mx-auto animate-fade-in-up">

            {/* Hero */}
            <div className="text-center mb-8">
              <h1
                className="text-4xl md:text-5xl font-bold text-on-surface mb-4 leading-tight"
                style={{ fontFamily: 'Literata, serif' }}
              >
                Your career journey starts with a{' '}
                <em className="text-primary not-italic">conversation.</em>
              </h1>
              <p className="text-lg text-on-surface-variant max-w-2xl mx-auto">
                Most resume tools guess. We don&apos;t. Real gap analysis, a verified roadmap, YouTube videos matched to your exact skill gaps, and actual Reddit stories from people who made your exact career transition — all in one place.
              </p>
            </div>

            {/* Features Highlight Bar */}
            <div className="max-w-3xl mx-auto mb-12 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
              <div className="p-5 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex flex-col items-center shadow-sm">
                <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-primary mb-3">
                  <span className="material-symbols-outlined text-xl">analytics</span>
                </div>
                <h3 className="font-bold text-sm text-on-surface" style={{ fontFamily: 'Literata, serif' }}>Brutal Gap Analysis</h3>
                <p className="text-xs text-on-surface-variant mt-1.5 leading-relaxed max-w-[220px]">
                  Brutally honest feedback comparing what your resume has against job demands.
                </p>
              </div>
              <div className="p-5 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex flex-col items-center shadow-sm">
                <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-primary mb-3">
                  <span className="material-symbols-outlined text-xl">map</span>
                </div>
                <h3 className="font-bold text-sm text-on-surface" style={{ fontFamily: 'Literata, serif' }}>Career Roadmap</h3>
                <p className="text-xs text-on-surface-variant mt-1.5 leading-relaxed max-w-[220px]">
                  A 5-step personalized guide featuring verified study courses and tools.
                </p>
              </div>
              <div className="p-5 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex flex-col items-center shadow-sm">
                <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-primary mb-3">
                  <span className="material-symbols-outlined text-xl">forum</span>
                </div>
                <h3 className="font-bold text-sm text-on-surface" style={{ fontFamily: 'Literata, serif' }}>Reddit Career Stories</h3>
                <p className="text-xs text-on-surface-variant mt-1.5 leading-relaxed max-w-[220px]">
                  Real-world lived experiences and guidance from professionals in similar roles.
                </p>
              </div>
            </div>

            {/* Analysis loading */}
            {status === 'loading' && (
              <div className="mb-6">
                <LoadingSkeleton />
              </div>
            )}

            {/* Error */}
            {status === 'error' && error && (
              <div className="mb-6 flex items-start gap-3 rounded-xl border border-error-container bg-error-container/40 p-5">
                <span className="material-symbols-outlined text-error mt-0.5">warning</span>
                <div>
                  <p className="text-sm font-semibold text-error">Analysis failed</p>
                  <p className="mt-0.5 text-sm text-on-error-container">{error.message}</p>
                </div>
              </div>
            )}

            {/* Bento Form Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">

              {/* Left: Resume Upload */}
              <div className="md:col-span-5 bg-surface-container-low p-8 rounded-xl shadow-[0_4px_20px_rgba(46,50,48,0.06)] border border-outline-variant/30 flex flex-col justify-between">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined">description</span>
                  </div>
                  <h2 className="text-xl font-bold" style={{ fontFamily: 'Literata, serif' }}>Resume</h2>
                </div>
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
                  uploadOnly
                />

              </div>

              {/* Right: Title + JD + CTA */}
              <div className="md:col-span-7 flex flex-col gap-6">
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
                  detailsOnly
                />
              </div>
            </div>

            {/* Decorative bottom row */}
            <div className="mt-16 flex flex-wrap justify-center gap-12 opacity-40 hover:opacity-70 transition-opacity duration-700">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">local_florist</span>
                <span className="font-semibold text-on-surface-variant" style={{ fontFamily: 'Literata, serif' }}>Organic Insights</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">psychology</span>
                <span className="font-semibold text-on-surface-variant" style={{ fontFamily: 'Literata, serif' }}>Strategic Wisdom</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">auto_graph</span>
                <span className="font-semibold text-on-surface-variant" style={{ fontFamily: 'Literata, serif' }}>Grounded Growth</span>
              </div>
            </div>
          </div>
        )}

        {/* ══ RESULTS PAGE ═══════════════════════════════════════════════ */}
        {showResults && (
          <div className="max-w-5xl mx-auto animate-fade-in-up">

            {/* Results header */}
            <div className="mb-10 text-center">
              <h1
                className="text-3xl md:text-4xl font-bold text-on-surface mb-3"
                style={{ fontFamily: 'Literata, serif' }}
              >
                Your analysis is ready.
              </h1>
              <p className="text-on-surface-variant max-w-xl mx-auto">
                Here&apos;s what your resume reveals — and the roadmap to close the gap.
              </p>
            </div>

            {/* Analysis cards */}
            <AnalysisResults result={result} />

            {/* Job title nudge */}
            {!jobTitle.trim() && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-tertiary-fixed bg-tertiary-fixed/30 px-4 py-3 text-sm text-tertiary">
                <span className="material-symbols-outlined text-base">info</span>
                <span>
                  Add a <strong>Job Title</strong> above and re-analyze to generate your personalised career roadmap.
                </span>
              </div>
            )}

            {/* Career Roadmap */}
            <CareerRoadmap
              roadmap={roadmap}
              status={roadmapStatus}
              error={roadmapError}
            />
          </div>
        )}
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="py-8 px-6 text-center border-t border-outline-variant/20 flex flex-col items-center gap-2 justify-center">
        <p className="text-on-surface-variant text-sm">
          A Career Strategist · <Link href="/privacy" className="hover:text-primary transition-colors font-medium">Privacy Policy</Link> · <Link href="/terms" className="hover:text-primary transition-colors font-medium">Terms of Service</Link>
        </p>
        <p className="text-on-surface-variant text-sm">
          (▀̿Ĺ̯▀̿ ̿)
        </p>
      </footer>

      {/* ── Atmosphere blobs ───────────────────────────────────────────── */}
      <div className="fixed top-20 right-[-5%] w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="fixed bottom-10 left-[-5%] w-96 h-96 bg-tertiary/5 rounded-full blur-3xl -z-10 pointer-events-none" />
    </div>
  );
}
