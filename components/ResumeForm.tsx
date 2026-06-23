'use client';

import { useRef, useState, DragEvent, FormEvent } from 'react';
import { JD_MAX, PDF_MAX_BYTES } from '@/utils/validate';

interface Props {
  resumeFile: File | null;
  jobDescription: string;
  jobTitle: string;
  fileError: string | null;
  jdError: string | null;
  jobTitleError: string | null;
  isLoading: boolean;
  onFileChange: (file: File | null) => void;
  onJdChange: (jd: string) => void;
  onJobTitleChange: (title: string) => void;
  onSubmit: () => void;
  /** If true, renders ONLY the file drop zone (for the left bento column). */
  uploadOnly?: boolean;
  /** If true, renders ONLY the job title + JD + CTA (for the right bento column). */
  detailsOnly?: boolean;
}

function formatBytes(bytes: number) {
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ResumeForm({
  resumeFile,
  jobDescription,
  jobTitle,
  fileError,
  jdError,
  jobTitleError,
  isLoading,
  onFileChange,
  onJdChange,
  onJobTitleChange,
  onSubmit,
  uploadOnly = false,
  detailsOnly = false,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    onFileChange(file);
    e.target.value = '';
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0] ?? null;
    onFileChange(file);
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  function handleFormSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onSubmit();
  }

  const jdLength = jobDescription.length;
  const jdNearLimit = jdLength > JD_MAX * 0.85;

  /* ── Upload-only mode (left bento column) ─────────────────────────────── */
  if (uploadOnly) {
    return (
      <div className="flex-1">
        {/* Hidden input */}
        <input
          ref={fileInputRef}
          id="resume-file-input"
          type="file"
          accept=".pdf,application/pdf"
          className="sr-only"
          tabIndex={-1}
          onChange={handleFileSelect}
        />

        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          aria-label="Resume upload drop zone"
          className={[
            'group relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300',
            isDragging
              ? 'border-primary bg-primary-fixed/20'
              : fileError
              ? 'border-error bg-error-container/30'
              : resumeFile
              ? 'border-primary bg-primary-fixed/30'
              : 'border-outline-variant bg-surface hover:bg-surface-container',
          ].join(' ')}
          onClick={() => fileInputRef.current?.click()}
        >
          {resumeFile ? (
            <div className="flex flex-col items-center justify-center px-4 text-center">
              <span
                className="material-symbols-outlined text-5xl text-primary mb-3"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                check_circle
              </span>
              <p className="text-sm font-bold text-primary mb-1">File Selected</p>
              <p className="text-xs text-on-surface-variant truncate max-w-[200px]">{resumeFile.name}</p>
              <p className="text-xs text-on-surface-variant">{formatBytes(resumeFile.size)}</p>
              <button
                type="button"
                onClick={(ev) => { ev.stopPropagation(); fileInputRef.current?.click(); }}
                className="mt-3 text-xs font-semibold text-primary hover:underline underline-offset-2"
                suppressHydrationWarning
              >
                Change file
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center px-4 text-center">
              <span className="material-symbols-outlined text-5xl text-primary mb-3 group-hover:scale-110 transition-transform">
                upload_file
              </span>
              <p className="mb-1 text-sm font-bold text-on-surface">Click to upload or drag and drop</p>
              <p className="text-xs text-on-surface-variant">PDF only · max 5 MB</p>
            </div>
          )}
        </div>

        {fileError && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-error">
            <span className="material-symbols-outlined text-base">error</span>
            {fileError}
          </p>
        )}
        {resumeFile && resumeFile.size > PDF_MAX_BYTES * 0.8 && (
          <p className="mt-1 text-xs text-tertiary">Large file — extraction may be slower.</p>
        )}
      </div>
    );
  }

  /* ── Details-only mode (right bento column) ───────────────────────────── */
  if (detailsOnly) {
    return (
      <form onSubmit={handleFormSubmit} noValidate className="flex flex-col gap-6 h-full">

        {/* Job Title card */}
        <div className="bg-surface-container-low p-6 rounded-xl shadow-[0_4px_20px_rgba(46,50,48,0.06)] border border-outline-variant/30">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-tertiary-fixed flex items-center justify-center text-tertiary">
              <span className="material-symbols-outlined">badge</span>
            </div>
            <h2 className="text-xl font-bold" style={{ fontFamily: 'Literata, serif' }}>Target Job Title</h2>
          </div>
          <input
            id="job-title"
            type="text"
            value={jobTitle}
            onChange={(e) => onJobTitleChange(e.target.value)}
            maxLength={100}
            placeholder="e.g. Senior Product Designer"
            className={[
              'w-full bg-surface border rounded-lg px-4 py-3 text-sm outline-none transition-all placeholder:text-on-surface-variant/50',
              'focus:ring-2 focus:ring-primary focus:border-primary',
              jobTitleError
                ? 'border-error bg-error-container/20'
                : 'border-outline-variant hover:border-outline focus:border-primary',
            ].join(' ')}
            suppressHydrationWarning
          />
          {jobTitleError && (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-error">
              <span className="material-symbols-outlined text-base">error</span>
              {jobTitleError}
            </p>
          )}
        </div>

        {/* Job Description card */}
        <div className="bg-surface-container-low p-6 rounded-xl shadow-[0_4px_20px_rgba(46,50,48,0.06)] border border-outline-variant/30 flex-grow flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-secondary-fixed flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined">article</span>
            </div>
            <h2 className="text-xl font-bold" style={{ fontFamily: 'Literata, serif' }}>Job Description</h2>
            <span
              className={[
                'ml-auto text-xs tabular-nums',
                jdNearLimit ? 'text-error font-semibold' : 'text-on-surface-variant',
              ].join(' ')}
            >
              {jdLength.toLocaleString()}/{JD_MAX.toLocaleString()}
            </span>
          </div>
          <textarea
            id="job-description"
            value={jobDescription}
            onChange={(e) => onJdChange(e.target.value)}
            maxLength={JD_MAX}
            rows={7}
            placeholder="Paste the job requirements here..."
            className={[
              'flex-1 w-full bg-surface border rounded-lg px-4 py-3 text-sm leading-relaxed resize-none outline-none transition-all placeholder:text-on-surface-variant/50',
              'focus:ring-2 focus:ring-primary focus:border-primary',
              jdError
                ? 'border-error bg-error-container/20'
                : 'border-outline-variant hover:border-outline focus:border-primary',
            ].join(' ')}
          />
          {jdError && (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-error">
              <span className="material-symbols-outlined text-base">error</span>
              {jdError}
            </p>
          )}
        </div>

        {/* CTA */}
        <button
          type="submit"
          disabled={isLoading}
          className={[
            'group relative w-full py-5 rounded-lg font-bold text-lg shadow-lg overflow-hidden flex items-center justify-center gap-3 transition-all',
            isLoading
              ? 'bg-primary/60 text-on-primary cursor-not-allowed'
              : 'bg-primary text-on-primary hover:shadow-xl hover:-translate-y-0.5 active:translate-y-px active:scale-[0.99]',
          ].join(' ')}
          suppressHydrationWarning
        >
          {/* Shimmer */}
          {!isLoading && (
            <div className="absolute inset-0 bg-white/10 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
          )}
          {isLoading ? (
            <>
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
              Strategizing…
            </>
          ) : (
            <>
              <span className="material-symbols-outlined">analytics</span>
              Analyze Resume
            </>
          )}
        </button>
      </form>
    );
  }

  /* ── Fallback: full form (no split mode) ──────────────────────────────── */
  return (
    <form onSubmit={handleFormSubmit} noValidate className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upload */}
        <ResumeForm
          resumeFile={resumeFile} jobDescription={jobDescription} jobTitle={jobTitle}
          fileError={fileError} jdError={jdError} jobTitleError={jobTitleError}
          isLoading={isLoading} onFileChange={onFileChange} onJdChange={onJdChange}
          onJobTitleChange={onJobTitleChange} onSubmit={onSubmit} uploadOnly
        />
        {/* Details */}
        <ResumeForm
          resumeFile={resumeFile} jobDescription={jobDescription} jobTitle={jobTitle}
          fileError={fileError} jdError={jdError} jobTitleError={jobTitleError}
          isLoading={isLoading} onFileChange={onFileChange} onJdChange={onJdChange}
          onJobTitleChange={onJobTitleChange} onSubmit={onSubmit} detailsOnly
        />
      </div>
    </form>
  );
}
