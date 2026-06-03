'use client';

import { useState } from 'react';
import type { AnalysisSection as AnalysisSectionType } from '@/types/analysis';

/** Strip common markdown artifacts (bold, italic, inline code, leading bullets). */
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/^[-*•·]\s+/, '')
    .trim();
}

interface Props {
  section: AnalysisSectionType;
  icon: React.ReactNode;
  accentClass: string; // Tailwind color classes for header accent
}

function CheckIcon() {
  return (
    <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function CopyIcon({ copied }: { copied: boolean }) {
  if (copied) {
    return (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
    );
  }
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
    </svg>
  );
}

export default function AnalysisSection({ section, icon, accentClass }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const text = section.items
      .map((item) => (item.explanation ? `${item.point}: ${item.explanation}` : item.point))
      .join('\n');
    await navigator.clipboard.writeText(`${section.title}\n\n${text}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="group rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className={`flex items-center justify-between rounded-t-xl px-5 py-4 ${accentClass}`}>
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
            {icon}
          </span>
          <h3 className="text-sm font-semibold">{section.title}</h3>
        </div>
        <button
          onClick={handleCopy}
          title={copied ? 'Copied!' : 'Copy to clipboard'}
          className="flex items-center gap-1.5 rounded-md bg-white/20 px-2.5 py-1 text-xs font-medium opacity-0 transition-opacity hover:bg-white/30 group-hover:opacity-100"
        >
          <CopyIcon copied={copied} />
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      <ul className="divide-y divide-gray-100 px-5 py-3">
        {section.items.length === 0 ? (
          <li className="py-3 text-sm text-gray-400 italic">No items found in this section.</li>
        ) : (
          section.items.map((item, idx) => (
            <li key={idx} className="flex gap-3 py-3">
              <CheckIcon />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800">{stripMarkdown(item.point)}</p>
                {item.explanation && (
                  <p className="mt-0.5 text-sm text-gray-500">{stripMarkdown(item.explanation)}</p>
                )}
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
