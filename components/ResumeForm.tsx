'use client';

import { useRef, useState, DragEvent } from 'react';
import { JD_MAX, PDF_MAX_BYTES } from '@/utils/validate';

interface Props {
  resumeFile: File | null;
  jobDescription: string;
  fileError: string | null;
  jdError: string | null;
  isLoading: boolean;
  onFileChange: (file: File | null) => void;
  onJdChange: (jd: string) => void;
  onSubmit: () => void;
}

function formatBytes(bytes: number) {
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ResumeForm({
  resumeFile,
  jobDescription,
  fileError,
  jdError,
  isLoading,
  onFileChange,
  onJdChange,
  onSubmit,
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

  const jdLength = jobDescription.length;
  const jdNearLimit = jdLength > JD_MAX * 0.85;
  const canSubmit = !isLoading;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* PDF Upload */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-800">
            Resume <span className="text-red-500">*</span>
          </label>

          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !resumeFile && fileInputRef.current?.click()}
            className={[
              'relative flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-colors',
              isDragging
                ? 'border-indigo-400 bg-indigo-50'
                : fileError
                ? 'border-red-300 bg-red-50'
                : resumeFile
                ? 'cursor-default border-emerald-300 bg-emerald-50'
                : 'border-gray-300 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50/40',
            ].join(' ')}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="sr-only"
              onChange={handleFileSelect}
            />

            {resumeFile ? (
              <div className="flex flex-col items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                  <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="max-w-[200px] truncate text-sm font-medium text-gray-800">
                    {resumeFile.name}
                  </p>
                  <p className="text-xs text-gray-500">{formatBytes(resumeFile.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="mt-1 text-xs font-medium text-indigo-600 hover:text-indigo-800"
                >
                  Change file
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-200">
                  <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Drop your PDF here, or{' '}
                    <span className="text-indigo-600">browse</span>
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">PDF only · max 5 MB</p>
                </div>
              </div>
            )}
          </div>

          {fileError && (
            <p className="flex items-center gap-1.5 text-xs text-red-600">
              <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              {fileError}
            </p>
          )}

          {resumeFile && resumeFile.size > PDF_MAX_BYTES * 0.8 && (
            <p className="text-xs text-amber-600">
              Large file — extraction may be slower.
            </p>
          )}
        </div>

        {/* Job Description */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-semibold text-gray-800">
              Job Description <span className="text-red-500">*</span>
            </label>
            <span
              className={[
                'text-xs tabular-nums',
                jdNearLimit ? 'text-red-500 font-medium' : 'text-gray-400',
              ].join(' ')}
            >
              {jdLength.toLocaleString()}/{JD_MAX.toLocaleString()}
            </span>
          </div>

          <textarea
            value={jobDescription}
            onChange={(e) => onJdChange(e.target.value)}
            maxLength={JD_MAX}
            rows={8}
            placeholder="Paste the full job description here…"
            className={[
              'w-full resize-none rounded-xl border px-4 py-3 text-sm leading-relaxed text-gray-800 placeholder-gray-400 shadow-sm outline-none transition-colors',
              'focus:ring-2 focus:ring-indigo-400 focus:ring-offset-0',
              jdError
                ? 'border-red-300 bg-red-50 focus:border-red-400 focus:ring-red-200'
                : 'border-gray-300 bg-white hover:border-gray-400 focus:border-indigo-400',
            ].join(' ')}
          />

          {jdError && (
            <p className="flex items-center gap-1.5 text-xs text-red-600">
              <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              {jdError}
            </p>
          )}
        </div>
      </div>

      {/* Submit */}
      <div className="sticky bottom-4 z-10 sm:static sm:bottom-auto">
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit}
          className={[
            'w-full rounded-xl px-6 py-3.5 text-sm font-semibold shadow-sm transition-all',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
            canSubmit
              ? 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.99]'
              : 'cursor-not-allowed bg-indigo-300 text-white',
          ].join(' ')}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Analyzing…
            </span>
          ) : (
            'Analyze Resume'
          )}
        </button>
      </div>
    </div>
  );
}
