'use client';

import { useState } from 'react';
import type { AnalysisSection as AnalysisSectionType } from '@/types/analysis';

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
  /** Material Symbol name for the section icon */
  iconName: string;
  /** Tailwind classes for the header accent band */
  headerClass: string;
  /** Tailwind classes for the icon bubble */
  iconBubbleClass: string;
}

function CopyIcon({ copied }: { copied: boolean }) {
  return (
    <span className="material-symbols-outlined text-base">
      {copied ? 'check' : 'content_copy'}
    </span>
  );
}

export default function AnalysisSection({ section, iconName, headerClass, iconBubbleClass }: Props) {
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
    <div className="group rounded-xl border border-outline-variant/20 bg-surface-container overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-300">
      {/* Header */}
      <div className={`flex items-center justify-between px-5 py-4 ${headerClass}`}>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center ${iconBubbleClass}`}>
            <span className="material-symbols-outlined text-base">{iconName}</span>
          </div>
          <h3 className="text-sm font-bold" style={{ fontFamily: 'Literata, serif' }}>{section.title}</h3>
        </div>
        <button
          onClick={handleCopy}
          title={copied ? 'Copied!' : 'Copy to clipboard'}
          className="flex items-center gap-1 rounded-lg bg-white/20 px-2.5 py-1 text-xs font-semibold opacity-0 group-hover:opacity-100 hover:bg-white/30 transition-all"
        >
          <CopyIcon copied={copied} />
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      {/* Items */}
      <ul className="divide-y divide-outline-variant/20 px-5 py-2">
        {section.items.length === 0 ? (
          <li className="py-3 text-sm text-on-surface-variant italic">No items found in this section.</li>
        ) : (
          section.items.map((item, idx) => (
            <li key={idx} className="flex gap-3 py-3">
              <span className="material-symbols-outlined text-base mt-0.5 shrink-0 text-primary">check_circle</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-on-surface">{stripMarkdown(item.point)}</p>
                {item.explanation && (
                  <p className="mt-0.5 text-sm text-on-surface-variant">{stripMarkdown(item.explanation)}</p>
                )}
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
