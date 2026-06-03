'use client';

import { useState } from 'react';
import type { RedditStory, RedditStoriesResult, RedditStatus } from '@/types/analysis';

// ── Icons ────────────────────────────────────────────────────────────────────

function IconPath() {
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

function IconReddit() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path d="M10 0C4.478 0 0 4.478 0 10s4.478 10 10 10 10-4.478 10-10S15.522 0 10 0zm5.93 10.003c.034.24.052.484.052.733 0 3.75-4.368 6.789-9.757 6.789-5.39 0-9.758-3.04-9.758-6.789 0-.25.018-.494.052-.733a1.5 1.5 0 10-1.697-2.377 1.5 1.5 0 001.697 2.377zM6.5 9a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm7 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm-3.5 4.75c-1.655 0-3.077-.636-3.896-1.597a.5.5 0 01.77-.638c.624.752 1.745 1.235 3.126 1.235s2.502-.483 3.126-1.235a.5.5 0 01.77.638c-.819.961-2.24 1.597-3.896 1.597z" />
    </svg>
  );
}

function IconArrow() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
    </svg>
  );
}

function IconUpvote() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
    </svg>
  );
}

// ── Story Card ────────────────────────────────────────────────────────────────

function StoryCard({ story }: { story: RedditStory }) {
  const isEntry = story.category === 'how-they-got-in';
  return (
    <a
      href={story.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-indigo-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-gray-800 leading-snug group-hover:text-indigo-700 transition-colors line-clamp-2">
          {story.title}
        </p>
        <span className="mt-0.5 shrink-0 text-gray-400 group-hover:text-indigo-400 transition-colors">
          <IconArrow />
        </span>
      </div>

      <p className="mt-2 text-sm text-gray-600 leading-relaxed line-clamp-3">
        {story.summary}
      </p>

      <div className="mt-3 flex items-center gap-3">
        {/* Subreddit badge */}
        <span className="flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-600">
          <IconReddit />
          {story.communityName.replace(/^r\//, 'r/')}
        </span>

        {/* Upvotes */}
        <span className="flex items-center gap-0.5 text-xs text-gray-400">
          <IconUpvote />
          {story.upVotes >= 1000
            ? `${(story.upVotes / 1000).toFixed(1)}k`
            : story.upVotes}
        </span>

        {/* Category pill */}
        <span
          className={[
            'ml-auto rounded-full px-2 py-0.5 text-xs font-medium',
            isEntry
              ? 'bg-indigo-50 text-indigo-600'
              : 'bg-emerald-50 text-emerald-600',
          ].join(' ')}
        >
          {isEntry ? 'Their journey' : 'Advice'}
        </span>
      </div>
    </a>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function StorySkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="h-4 w-3/4 rounded bg-gray-200" />
      <div className="mt-3 space-y-1.5">
        <div className="h-3 w-full rounded bg-gray-100" />
        <div className="h-3 w-5/6 rounded bg-gray-100" />
      </div>
      <div className="mt-3 flex gap-2">
        <div className="h-5 w-24 rounded-full bg-gray-100" />
        <div className="h-5 w-12 rounded-full bg-gray-100" />
      </div>
    </div>
  );
}

// ── Tab Bar ───────────────────────────────────────────────────────────────────

type Tab = 'how-they-got-in' | 'advice';

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
}

function TabButton({ active, onClick, icon, label, count }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all',
        active
          ? 'bg-indigo-600 text-white shadow-sm'
          : 'text-gray-600 hover:bg-gray-100',
      ].join(' ')}
    >
      {icon}
      {label}
      <span
        className={[
          'rounded-full px-1.5 py-0.5 text-xs font-bold',
          active ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-600',
        ].join(' ')}
      >
        {count}
      </span>
    </button>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

interface Props {
  result: RedditStoriesResult | null;
  status: RedditStatus;
  error: string | null;
}

export default function RedditStories({ result, status, error }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('how-they-got-in');

  if (status === 'idle') return null;

  const entryStories = result?.stories.filter((s) => s.category === 'how-they-got-in') ?? [];
  const adviceStories = result?.stories.filter((s) => s.category === 'advice') ?? [];
  const displayed = activeTab === 'how-they-got-in' ? entryStories : adviceStories;

  return (
    <div className="mt-8 rounded-2xl border border-gray-200 bg-gray-50 p-6 shadow-sm sm:p-8">
      {/* Header */}
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100">
          <IconReddit />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            People Like You on Reddit
          </h2>
          <p className="mt-0.5 text-sm text-gray-500">
            {result
              ? `Real stories from people who became ${result.jobTitle}s — scraped & summarised by AI`
              : 'Scraping Reddit for real career stories…'}
          </p>
        </div>
      </div>

      {/* Loading */}
      {status === 'loading' && (
        <div className="space-y-3">
          <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
            <svg className="h-4 w-4 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Scraping Reddit &amp; summarising stories… this takes ~20s
          </div>
          <StorySkeleton />
          <StorySkeleton />
          <StorySkeleton />
        </div>
      )}

      {/* Error */}
      {status === 'error' && error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <svg className="mt-0.5 h-5 w-5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-red-800">Failed to load stories</p>
            <p className="mt-0.5 text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}

      {/* Success */}
      {status === 'success' && result && (
        <>
          {result.stories.length === 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              No relevant career stories found for <strong>{result.jobTitle}</strong> on Reddit right now. Try a more specific job title.
            </div>
          ) : (
            <>
              {/* Tabs */}
              <div className="mb-5 flex gap-2">
                <TabButton
                  active={activeTab === 'how-they-got-in'}
                  onClick={() => setActiveTab('how-they-got-in')}
                  icon={<IconPath />}
                  label="How They Got In"
                  count={entryStories.length}
                />
                <TabButton
                  active={activeTab === 'advice'}
                  onClick={() => setActiveTab('advice')}
                  icon={<IconBulb />}
                  label="Their Advice"
                  count={adviceStories.length}
                />
              </div>

              {/* Stories grid */}
              {displayed.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No posts in this category for <strong>{result.jobTitle}</strong>. Switch to the other tab.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {displayed.map((story, i) => (
                    <StoryCard key={`${story.url}-${i}`} story={story} />
                  ))}
                </div>
              )}

              {/* Footer */}
              <p className="mt-4 text-xs text-gray-400">
                Sourced from public Reddit posts via Apify · Summaries generated by Gemini AI
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
}
