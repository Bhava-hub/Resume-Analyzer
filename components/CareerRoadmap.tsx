'use client';

import { useState } from 'react';
import type {
  CareerRoadmap,
  CareerRoadmapStatus,
  ReferenceLink,
  ReferenceLinkType,
  YouTubeVideo,
} from '@/types/analysis';

// ─────────────────────────────────────────────────────────────────────────────
// Icons
// ─────────────────────────────────────────────────────────────────────────────

function IconMap() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    </svg>
  );
}

function IconBulb() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  );
}

function IconLink() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  );
}

function IconReddit() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path d="M10 0C4.478 0 0 4.478 0 10s4.478 10 10 10 10-4.478 10-10S15.522 0 10 0zm6 10.003c0 .249-.018.493-.052.733a1.5 1.5 0 11-1.697-2.377 1.5 1.5 0 011.697 2.377c.034-.24.052-.484.052-.733zM6.5 9a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm7 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm-3.5 4.75c-1.655 0-3.077-.636-3.896-1.597a.5.5 0 01.77-.638c.624.752 1.745 1.235 3.126 1.235s2.502-.483 3.126-1.235a.5.5 0 01.77.638c-.819.961-2.24 1.597-3.896 1.597z" />
    </svg>
  );
}

function IconExternal() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
    </svg>
  );
}

function IconYouTube() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const LINK_TYPE_META: Record<ReferenceLinkType, { label: string; color: string }> = {
  course:    { label: 'Course',     color: 'bg-purple-50 text-purple-700' },
  docs:      { label: 'Docs',       color: 'bg-blue-50 text-blue-700' },
  community: { label: 'Community',  color: 'bg-green-50 text-green-700' },
  github:    { label: 'GitHub',     color: 'bg-gray-100 text-gray-700' },
  article:   { label: 'Article',    color: 'bg-amber-50 text-amber-700' },
  reddit:    { label: 'Reddit',     color: 'bg-orange-50 text-orange-700' },
  youtube:   { label: 'YouTube',    color: 'bg-red-50 text-red-700' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function RedditBadge({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 flex items-start gap-1.5 rounded-lg border border-orange-100 bg-orange-50 px-3 py-2 text-xs text-orange-700 hover:bg-orange-100 transition-colors"
    >
      <span className="mt-0.5 shrink-0"><IconReddit /></span>
      <span className="italic leading-relaxed">Real evidence from Reddit → click to read the full post</span>
      <span className="ml-auto shrink-0 mt-0.5"><IconExternal /></span>
    </a>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
  accentClass,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  accentClass: string;
}) {
  return (
    <div className={`flex items-center gap-3 rounded-xl px-5 py-4 ${accentClass}`}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/30">
        {icon}
      </span>
      <div>
        <h3 className="text-sm font-bold">{title}</h3>
        <p className="text-xs opacity-80">{subtitle}</p>
      </div>
    </div>
  );
}

// ── Career Entrance Plan ──────────────────────────────────────────────────────

function EntrancePlan({ roadmap }: { roadmap: CareerRoadmap }) {
  return (
    <div className="overflow-hidden rounded-xl border border-indigo-100 bg-white shadow-sm">
      <SectionHeader
        icon={<IconMap />}
        title="Career Entrance Plan"
        subtitle={`${roadmap.entrancePlan.length} personalised steps based on your gaps${roadmap.redditPostsUsed > 0 ? ` + ${roadmap.redditPostsUsed} Reddit stories` : ''}`}
        accentClass="bg-indigo-600 text-white"
      />
      <ol className="divide-y divide-gray-100 px-5 py-2">
        {roadmap.entrancePlan.map((step) => (
          <li key={step.step} className="flex gap-4 py-4">
            {/* Step number bubble */}
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
              {step.step}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900">{step.action}</p>
              <p className="mt-1 text-sm text-gray-600 leading-relaxed">{step.detail}</p>
              {step.redditEvidence && (
                <blockquote className="mt-2 border-l-2 border-orange-300 pl-3 text-xs text-gray-500 italic">
                  &ldquo;{step.redditEvidence}&rdquo;
                </blockquote>
              )}
              {step.redditUrl && <RedditBadge url={step.redditUrl} />}
              
              {/* Step-specific learning & GitHub resources */}
              {step.resources && step.resources.length > 0 && (
                <div className="mt-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Learning Resources & GitHub Projects</p>
                  <div className="flex flex-wrap gap-2">
                    {step.resources.map((res, idx) => (
                      <a
                        key={idx}
                        href={res.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-100 bg-indigo-50/50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100/70 hover:border-indigo-200 transition-all hover:scale-[1.01]"
                      >
                        {res.type === 'github' && (
                          <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 16 16" fill="currentColor">
                            <path fillRule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                          </svg>
                        )}
                        {res.type === 'course' && <span className="shrink-0 text-sm leading-none">🎓</span>}
                        {res.type === 'docs' && <span className="shrink-0 text-sm leading-none">📄</span>}
                        {res.type === 'article' && <span className="shrink-0 text-sm leading-none">📰</span>}
                        {res.type === 'other' && <span className="shrink-0 text-sm leading-none">🔗</span>}
                        <span>{res.label}</span>
                        <span className="shrink-0 opacity-70"><IconExternal /></span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ── Key Advice ────────────────────────────────────────────────────────────────

function KeyAdvice({ roadmap }: { roadmap: CareerRoadmap }) {
  return (
    <div className="overflow-hidden rounded-xl border border-emerald-100 bg-white shadow-sm">
      <SectionHeader
        icon={<IconBulb />}
        title="Key Advice"
        subtitle="Tailored to your specific skill gaps and experience mismatches"
        accentClass="bg-emerald-600 text-white"
      />
      <ul className="divide-y divide-gray-100 px-5 py-2">
        {roadmap.advice.map((item, i) => (
          <li key={i} className="py-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                ✓
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900">{item.tip}</p>
                <p className="mt-1 text-sm text-gray-600">{item.reason}</p>
                {item.redditEvidence && (
                  <blockquote className="mt-2 border-l-2 border-orange-300 pl-3 text-xs text-gray-500 italic">
                    &ldquo;{item.redditEvidence}&rdquo;
                  </blockquote>
                )}
                {item.redditUrl && <RedditBadge url={item.redditUrl} />}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Real Life Stories ────────────────────────────────────────────────────────

function IconPerson() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function IconUpvote() {
  return (
    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
    </svg>
  );
}

function StoryCard({ link }: { link: ReferenceLink }) {
  const isJourney = link.category === 'entry-story' || link.description?.toLowerCase().includes('career journey');
  const isAdvice = link.category === 'advice' || link.description?.toLowerCase().includes('advice');
  const isBoth = link.category === 'both';

  const sub = link.subreddit || link.description?.match(/from (.+)$/)?.[1] || 'reddit';
  const displaySub = sub.startsWith('r/') ? sub : `r/${sub}`;

  const quote = link.backgroundContext || (link.description?.startsWith('Real ') ? undefined : link.description);

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col gap-3 rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 to-amber-50 p-5 shadow-sm transition-all hover:border-orange-300 hover:shadow-md hover:-translate-y-0.5"
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        {/* Reddit avatar bubble */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white shadow-sm">
          <IconReddit />
        </div>
        <div className="min-w-0 flex-1">
          {/* Community + story type + upvotes */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-bold text-orange-700">
              {displaySub}
            </span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              isBoth
                ? 'bg-indigo-100 text-indigo-700'
                : isJourney
                ? 'bg-purple-100 text-purple-700'
                : 'bg-emerald-100 text-emerald-700'
            }`}>
              {isBoth ? '🧭 Journey & Advice 💡' : isJourney ? '🧭 Career Journey' : '💡 Advice'}
            </span>
            {link.upVotes !== undefined && link.upVotes > 0 && (
              <span className="flex items-center gap-0.5 rounded-full bg-orange-50/50 px-2 py-0.5 text-[10px] font-bold text-orange-600 border border-orange-100/50">
                <IconUpvote />
                {link.upVotes >= 1000 ? `${(link.upVotes / 1000).toFixed(1)}k` : link.upVotes}
              </span>
            )}
          </div>
          {/* Post title */}
          <p className="mt-1.5 text-sm font-bold text-gray-800 leading-snug group-hover:text-orange-700 transition-colors line-clamp-2">
            {link.title}
          </p>
        </div>
      </div>

      {/* Description as a pull-quote */}
      {quote && (
        <blockquote className="border-l-3 border-orange-300 pl-3 text-xs text-gray-600 italic leading-relaxed bg-white/40 p-2.5 rounded-r-lg">
          <strong>Background:</strong> &ldquo;{quote}&rdquo;
        </blockquote>
      )}

      {/* Key Actions List */}
      {link.keyActions && link.keyActions.length > 0 && (
        <div className="mt-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-orange-800 mb-1">Key Actions Taken:</p>
          <ul className="space-y-1">
            {link.keyActions.map((action, idx) => (
              <li key={idx} className="flex items-start gap-1.5 text-xs text-gray-700 leading-normal">
                <span className="mt-1.5 flex h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" />
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* CTA */}
      <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-600 group-hover:text-orange-700 transition-colors mt-auto">
        <span>Read on Reddit</span>
        <IconExternal />
      </div>
    </a>
  );
}

function ResourceLink({ link }: { link: ReferenceLink }) {
  const meta = LINK_TYPE_META[link.type] ?? LINK_TYPE_META.article;
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm transition-all hover:border-indigo-200 hover:shadow-md"
    >
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold shrink-0 ${meta.color}`}>
        {meta.label}
      </span>
      <p className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-700 group-hover:text-indigo-700 transition-colors">
        {link.title}
      </p>
      <span className="shrink-0 text-gray-400 group-hover:text-indigo-400 transition-colors">
        <IconExternal />
      </span>
    </a>
  );
}

function RealLifeStories({ roadmap }: { roadmap: CareerRoadmap }) {
  // Dedup by URL first, then by normalised title (safety net for near-duplicate Apify posts)
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();
  const redditLinks = roadmap.referenceLinks.filter((l) => {
    if (!l.isReddit) return false;
    const normTitle = (l.title ?? '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40);
    if (seenUrls.has(l.url) || (normTitle && seenTitles.has(normTitle))) return false;
    seenUrls.add(l.url);
    if (normTitle) seenTitles.add(normTitle);
    return true;
  });
  const otherLinks = roadmap.referenceLinks.filter((l) => !l.isReddit);

  return (
    <div className="space-y-6">
      {/* Story cards */}
      <div className="overflow-hidden rounded-xl border border-orange-100 bg-white shadow-sm">
        <SectionHeader
          icon={<IconPerson />}
          title="Real People, Real Paths"
          subtitle={redditLinks.length > 0
            ? `${redditLinks.length} Reddit stories from people who made this career transition`
            : 'No Reddit stories were found for this role'}
          accentClass="bg-gradient-to-r from-orange-500 to-amber-500 text-white"
        />
        <div className="p-5">
          {redditLinks.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {redditLinks.map((link, i) => (
                <StoryCard key={i} link={link} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-gray-400">
              <span className="text-3xl">🔍</span>
              <p className="text-sm">No Reddit stories found for this role.</p>
              <p className="text-xs">Try a broader job title for richer results.</p>
            </div>
          )}
        </div>
      </div>

      {/* Non-Reddit resources — compact secondary list */}
      {otherLinks.length > 0 && (
        <div>
          <p className="mb-2.5 text-xs font-bold uppercase tracking-wider text-gray-400">
            Additional Resources
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {otherLinks.map((link, i) => (
              <ResourceLink key={i} link={link} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Loading skeleton
// ─────────────────────────────────────────────────────────────────────────────

function PipelineStep({
  icon,
  label,
  done,
}: {
  icon: string;
  label: string;
  done: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 text-sm ${done ? 'text-emerald-600' : 'text-gray-400'}`}>
      <span>{done ? '✓' : icon}</span>
      <span>{label}</span>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-5">
        <div className="flex items-center gap-3 mb-4">
          <svg className="h-5 w-5 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm font-semibold text-indigo-700">Building your career roadmap…</p>
        </div>
        <div className="space-y-2 text-sm">
          <PipelineStep icon="🔍" label="Scraping Reddit for real career stories…" done={false} />
          <PipelineStep icon="🤖" label="HuggingFace: ranking posts by relevance…" done={false} />
          <PipelineStep icon="⚡" label="Groq: generating personalised roadmap…" done={false} />
        </div>
        <p className="mt-3 text-xs text-indigo-400">This takes ~30–45 seconds. The more Reddit posts found, the richer the roadmap.</p>
      </div>
      {/* Skeleton cards */}
      {[1, 2].map((i) => (
        <div key={i} className="animate-pulse rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="h-14 rounded-t-xl bg-gray-200" />
          <div className="space-y-3 p-5">
            {[1, 2, 3].map((j) => (
              <div key={j} className="flex gap-3">
                <div className="h-6 w-6 shrink-0 rounded-full bg-gray-100" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 w-3/4 rounded bg-gray-100" />
                  <div className="h-3 w-full rounded bg-gray-50" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// YouTube Resources panel
// ─────────────────────────────────────────────────────────────────────────────

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n > 0 ? String(n) : '';
}

function YouTubeVideoCard({ video }: { video: YouTubeVideo }) {
  return (
    <a
      href={video.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:border-red-200 hover:shadow-md"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden bg-gray-100">
        {video.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="text-4xl">▶️</span>
          </div>
        )}
        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600/90 shadow-lg">
            <svg className="h-5 w-5 text-white ml-0.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <p className="text-sm font-semibold text-gray-800 leading-snug line-clamp-2 group-hover:text-red-700 transition-colors">
          {video.title}
        </p>
        <p className="text-xs text-gray-500">{video.channelTitle}</p>
        {video.viewCount > 0 && (
          <p className="text-xs text-gray-400 flex items-center gap-1">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
            </svg>
            {formatCount(video.viewCount)} likes
          </p>
        )}
      </div>
    </a>
  );
}

function YouTubeResources({ roadmap }: { roadmap: CareerRoadmap }) {
  const videos = roadmap.youtubeVideos ?? [];

  if (videos.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div className="mb-3 flex justify-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
            <IconYouTube />
          </span>
        </div>
        <p className="text-sm font-semibold text-gray-700">No YouTube videos found</p>
        <p className="mt-1 text-xs text-gray-400">Add a YOUTUBE_API_KEY to your environment to enable this feature.</p>
      </div>
    );
  }

  // Group videos by topic
  const byTopic = videos.reduce<Record<string, YouTubeVideo[]>>((acc, v) => {
    (acc[v.topic] ??= []).push(v);
    return acc;
  }, {});

  return (
    <div className="overflow-hidden rounded-xl border border-red-100 bg-white shadow-sm">
      <div className="flex items-center gap-3 bg-red-600 px-5 py-4 text-white">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/20">
          <IconYouTube />
        </span>
        <div>
          <h3 className="text-sm font-bold">YouTube Learning Resources</h3>
          <p className="text-xs opacity-80">
            {videos.length} video{videos.length !== 1 ? 's' : ''} matched to your skill gaps — sorted by likes, last 3 years
          </p>
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {Object.entries(byTopic).map(([topic, topicVideos]) => (
          <div key={topic} className="px-5 py-5">
            {/* Topic heading — explains what this section helps with */}
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-1 14v-4H7l5-8v4h4l-5 8z"/>
                </svg>
              </span>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Helps you learn: <span className="text-red-600 normal-case capitalize">{topic}</span>
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {topicVideos.map((video) => (
                <YouTubeVideoCard key={video.videoId} video={video} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab bar
// ─────────────────────────────────────────────────────────────────────────────

type Tab = 'plan' | 'advice' | 'links' | 'videos';

function TabBtn({
  id,
  active,
  onClick,
  icon,
  label,
  count,
  accentActive,
}: {
  id: string;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
  accentActive: string;
}) {
  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      className={[
        'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-all',
        active ? accentActive : 'text-gray-500 hover:bg-gray-100',
      ].join(' ')}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
      <span
        className={[
          'rounded-full px-1.5 py-0.5 text-xs font-bold',
          active ? 'bg-white/30 text-inherit' : 'bg-gray-200 text-gray-600',
        ].join(' ')}
      >
        {count}
      </span>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  roadmap: CareerRoadmap | null;
  status: CareerRoadmapStatus;
  error: string | null;
}

export default function CareerRoadmap({ roadmap, status, error }: Props) {
  const [tab, setTab] = useState<Tab>('plan');

  if (status === 'idle') return null;

  return (
    <section className="mt-10" aria-label="Career Roadmap">
      {/* Section header */}
      <div className="mb-6 flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md">
          <span className="text-lg">🧭</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Your Personalised Career Roadmap
          </h2>
          <p className="mt-0.5 text-sm text-gray-500">
            {roadmap
              ? `Generated from your resume gaps + ${roadmap.redditPostsUsed} real Reddit career stories`
              : 'Powered by Groq · HuggingFace · Reddit (via Apify)'}
          </p>
        </div>
      </div>

      {/* Loading */}
      {status === 'loading' && <LoadingState />}

      {/* Error */}
      {status === 'error' && error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-5">
          <svg className="mt-0.5 h-5 w-5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-red-800">Failed to generate roadmap</p>
            <p className="mt-0.5 text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}

      {/* Success */}
      {status === 'success' && roadmap && (
        <>
          {/* Tabs */}
          <div className="mb-5 flex flex-wrap gap-2 rounded-xl border border-gray-200 bg-gray-50 p-1.5">
            <TabBtn
              id="roadmap-tab-plan"
              active={tab === 'plan'}
              onClick={() => setTab('plan')}
              icon={<IconMap />}
              label="Career Plan"
              count={roadmap.entrancePlan.length}
              accentActive="bg-indigo-600 text-white shadow-sm"
            />
            <TabBtn
              id="roadmap-tab-advice"
              active={tab === 'advice'}
              onClick={() => setTab('advice')}
              icon={<IconBulb />}
              label="Key Advice"
              count={roadmap.advice.length}
              accentActive="bg-emerald-600 text-white shadow-sm"
            />
            <TabBtn
              id="roadmap-tab-stories"
              active={tab === 'links'}
              onClick={() => setTab('links')}
              icon={<IconPerson />}
              label="Real Stories"
              count={roadmap.referenceLinks.filter((l) => l.isReddit).length}
              accentActive="bg-orange-500 text-white shadow-sm"
            />
            <TabBtn
              id="roadmap-tab-videos"
              active={tab === 'videos'}
              onClick={() => setTab('videos')}
              icon={<IconYouTube />}
              label="Videos"
              count={roadmap.youtubeVideos?.length ?? 0}
              accentActive="bg-red-600 text-white shadow-sm"
            />
          </div>

          {/* Reddit evidence note */}
          {roadmap.redditPostsUsed > 0 && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-orange-100 bg-orange-50 px-4 py-2 text-xs text-orange-700">
              <IconReddit />
              <span>
                This roadmap is backed by <strong>{roadmap.redditPostsUsed}</strong> real Reddit career stories.
                Steps and advice with <span className="font-semibold">orange Reddit badges</span> come from real people&apos;s experiences.
              </span>
            </div>
          )}

          {/* Tab panels */}
          {tab === 'plan' && <EntrancePlan roadmap={roadmap} />}
          {tab === 'advice' && <KeyAdvice roadmap={roadmap} />}
          {tab === 'links' && <RealLifeStories roadmap={roadmap} />}
          {tab === 'videos' && <YouTubeResources roadmap={roadmap} />}

          {/* Footer */}
          <p className="mt-4 text-xs text-gray-400">
            Pipeline: Tavily (Reddit + resources) · YouTube Data API v3 · HuggingFace (semantic ranking) · Groq/Llama 3 (roadmap generation)
          </p>
        </>
      )}
    </section>
  );
}
