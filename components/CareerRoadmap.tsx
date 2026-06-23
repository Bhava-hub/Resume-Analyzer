'use client';

import { useState, useEffect } from 'react';
import type {
  CareerRoadmap,
  CareerRoadmapStatus,
  ReferenceLink,
  ReferenceLinkType,
  YouTubeVideo,
} from '@/types/analysis';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n > 0 ? String(n) : '';
}

const LINK_TYPE_META: Record<ReferenceLinkType, { label: string; cls: string }> = {
  course: { label: 'Course', cls: 'bg-primary-fixed text-on-primary-fixed-variant' },
  docs: { label: 'Docs', cls: 'bg-secondary-fixed text-on-secondary-fixed' },
  community: { label: 'Community', cls: 'bg-primary-fixed/60 text-primary' },
  github: { label: 'GitHub', cls: 'bg-surface-container-high text-on-surface-variant' },
  article: { label: 'Article', cls: 'bg-tertiary-fixed text-on-tertiary-fixed-variant' },
  reddit: { label: 'Reddit', cls: 'bg-error-container/60 text-on-error-container' },
  youtube: { label: 'YouTube', cls: 'bg-error-container text-error' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Roadmap step labels
// ─────────────────────────────────────────────────────────────────────────────

const STEP_META: Record<number, { phase: string; estimate: string }> = {
  1: { phase: 'Phase 01', estimate: '2–3 Weeks' },
  2: { phase: 'Phase 02', estimate: '3–4 Weeks' },
  3: { phase: 'Phase 03', estimate: '2 Weeks' },
  4: { phase: 'Phase 04', estimate: '1 Week' },
  5: { phase: 'Phase 05', estimate: 'Ongoing' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Career Entrance Plan (vertical roadmap)
// ─────────────────────────────────────────────────────────────────────────────

function EntrancePlan({ roadmap }: { roadmap: CareerRoadmap }) {
  return (
    <div className="relative space-y-10">
      {/* Vertical dashed line */}
      <div className="hidden md:block absolute left-[27px] top-8 bottom-8 w-[2px] roadmap-line opacity-30" />

      {roadmap.entrancePlan.map((step, i) => {
        const meta = STEP_META[step.step] ?? { phase: `Phase ${step.step}`, estimate: '' };

        return (
          <div key={step.step} className="relative flex flex-col md:flex-row gap-6 md:gap-12 group animate-fade-in-up" style={{ animationDelay: `${i * 80}ms` }}>
            {/* Step bubble — all outline style */}
            <div className="flex-shrink-0 z-10">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-xl shadow-sm transition-transform group-hover:scale-110 duration-300 bg-surface-container-low border-2 border-primary text-primary"
              >
                {step.step}
              </div>
            </div>

            {/* Card */}
            <div className="flex-grow bg-surface-container rounded-xl p-6 md:p-8 border border-outline-variant/20 hover:shadow-xl transition-shadow duration-300">
              {/* Card top row */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-5 gap-3">
                <div>
                  <span className="text-tertiary font-bold tracking-widest uppercase text-xs">{meta.phase}</span>
                  <h3
                    className="text-xl font-bold text-on-surface mt-1"
                    style={{ fontFamily: 'Literata, serif' }}
                  >
                    {step.action}
                  </h3>
                </div>

              </div>

              {/* Detail */}
              <p className="text-on-surface-variant mb-5 leading-relaxed">{step.detail}</p>

              {/* Reddit evidence */}
              {step.redditEvidence && (
                <div className="mb-4 bg-error-container/20 border border-error-container/40 rounded-lg p-4 flex items-start gap-3">
                  <span className="material-symbols-outlined text-base text-error mt-0.5 shrink-0">forum</span>
                  <blockquote className="text-sm text-on-surface-variant italic leading-relaxed">
                    &ldquo;{step.redditEvidence}&rdquo;
                    {step.redditUrl && (
                      <a
                        href={step.redditUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 not-italic text-xs font-semibold text-error hover:underline underline-offset-2"
                      >
                        Read on Reddit ↗
                      </a>
                    )}
                  </blockquote>
                </div>
              )}

              {/* Resources */}
              {step.resources && step.resources.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                    Key Resources
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {step.resources.map((res, idx) => {
                      const hasUrl = Boolean(res.url && res.url.trim());
                      const inner = (
                        <>
                          {res.type === 'github' && (
                            <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 16 16" fill="currentColor">
                              <path fillRule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                            </svg>
                          )}
                          {res.type === 'course' && <span className="material-symbols-outlined text-base">school</span>}
                          {res.type === 'docs' && <span className="material-symbols-outlined text-base">description</span>}
                          {res.type === 'article' && <span className="material-symbols-outlined text-base">article</span>}
                          {res.type === 'other' && <span className="material-symbols-outlined text-base">open_in_new</span>}
                          <span>{res.label}</span>
                          {hasUrl && <span className="material-symbols-outlined text-xs opacity-70">open_in_new</span>}
                        </>
                      );
                      return hasUrl ? (
                        <a
                          key={idx}
                          href={res.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 bg-secondary-container hover:bg-secondary-fixed-dim transition-colors rounded-lg text-on-secondary-container font-semibold"
                        >
                          {inner}
                        </a>
                      ) : (
                        <div
                          key={idx}
                          className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 bg-surface-container-high rounded-lg text-on-surface-variant font-semibold cursor-default"
                        >
                          {inner}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Bottom motivational note */}
      <div className="mt-8 p-8 bg-primary/5 rounded-2xl border border-primary/10 text-center">
        <div className="w-14 h-14 bg-primary-container rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-on-primary-container text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>eco</span>
        </div>
        <h3
          className="text-xl font-bold text-primary mb-2"
          style={{ fontFamily: 'Literata, serif' }}
        >
          Steady growth is sustainable growth.
        </h3>
        <p className="text-on-surface-variant max-w-md mx-auto text-sm">
          This roadmap is designed for depth. Don&apos;t rush the foundational steps — they are the roots that hold your career upright.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Key Advice
// ─────────────────────────────────────────────────────────────────────────────

function KeyAdvice({ roadmap }: { roadmap: CareerRoadmap }) {
  return (
    <div className="space-y-4">
      {roadmap.advice.map((item, i) => (
        <div
          key={i}
          className="bg-surface-container rounded-xl p-6 border border-outline-variant/20 hover:shadow-xl transition-shadow duration-300 animate-fade-in-up"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div className="flex items-start gap-4">
            <div className="w-9 h-9 rounded-full bg-primary-fixed flex items-center justify-center shrink-0 mt-0.5">
              <span className="material-symbols-outlined text-base text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-on-surface" style={{ fontFamily: 'Literata, serif' }}>{item.tip}</p>
              <p className="mt-1 text-sm text-on-surface-variant leading-relaxed">{item.reason}</p>
              {item.redditEvidence && (
                <blockquote className="mt-3 border-l-2 border-error-container pl-3 text-xs text-on-surface-variant italic">
                  &ldquo;{item.redditEvidence}&rdquo;
                  {item.redditUrl && (
                    <a href={item.redditUrl} target="_blank" rel="noopener noreferrer"
                      className="ml-2 not-italic text-xs font-semibold text-error hover:underline underline-offset-2">
                      Reddit ↗
                    </a>
                  )}
                </blockquote>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Real Stories (Reddit)
// ─────────────────────────────────────────────────────────────────────────────

function StoryCard({ link }: { link: ReferenceLink }) {
  const isJourney = link.category === 'entry-story' || link.description?.toLowerCase().includes('career journey');
  const isBoth = link.category === 'both';
  const sub = link.subreddit || 'reddit';
  const displaySub = sub.startsWith('r/') ? sub : `r/${sub}`;
  const quote = link.backgroundContext || (link.description?.startsWith('Real ') ? undefined : link.description);

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col gap-3 rounded-xl border border-outline-variant/20 bg-surface-container p-5 shadow-sm transition-all hover:border-tertiary/40 hover:shadow-xl hover:-translate-y-0.5 duration-300"
    >
      <div className="flex items-start gap-3">
        {/* Reddit alien SVG — avoids the Material Symbols 'REDDIT' text ligature */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FF4500]/10">
          <svg viewBox="0 0 20 20" fill="none" className="h-6 w-6" aria-hidden="true">
            <circle cx="10" cy="10" r="10" fill="#FF4500" />
            <path fill="#fff" d="M16.67 10a1.46 1.46 0 0 0-2.47-1 7.12 7.12 0 0 0-3.85-1.23l.65-3.07 2.13.45a1 1 0 1 0 .14-.71l-2.38-.5a.22.22 0 0 0-.26.17l-.73 3.43a7.14 7.14 0 0 0-3.89 1.22 1.46 1.46 0 1 0-1.61 2.39 2.87 2.87 0 0 0 0 .44c0 2.24 2.61 4.06 5.83 4.06s5.83-1.82 5.83-4.06a2.87 2.87 0 0 0 0-.44 1.46 1.46 0 0 0 .57-1.15Zm-9.3 1.07a1 1 0 1 1 1 1 1 1 0 0 1-1-1Zm5.56 2.64a3.44 3.44 0 0 1-2.93.62 3.44 3.44 0 0 1-2.93-.62.22.22 0 0 1 .31-.31 3 3 0 0 0 2.62.5 3 3 0 0 0 2.62-.5.22.22 0 0 1 .31.31Zm-.2-1.64a1 1 0 1 1 1-1 1 1 0 0 1-1 1Z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="rounded-full bg-tertiary-fixed px-2.5 py-0.5 text-xs font-bold text-on-tertiary-fixed-variant">{displaySub}</span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${isBoth ? 'bg-primary-fixed text-on-primary-fixed-variant' :
                isJourney ? 'bg-secondary-fixed text-on-secondary-fixed' :
                  'bg-primary-fixed/40 text-primary'
              }`}>
              {isBoth ? '🧭 Journey & Advice 💡' : isJourney ? '🧭 Career Journey' : '💡 Advice'}
            </span>
            {link.upVotes !== undefined && link.upVotes > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] font-bold text-tertiary">
                <span className="material-symbols-outlined text-xs">arrow_upward</span>
                {link.upVotes >= 1000 ? `${(link.upVotes / 1000).toFixed(1)}k` : link.upVotes}
              </span>
            )}
          </div>
          <p className="mt-1.5 text-sm font-bold text-on-surface leading-snug group-hover:text-primary transition-colors line-clamp-2" style={{ fontFamily: 'Literata, serif' }}>
            {link.title}
          </p>
        </div>
      </div>

      {quote && (
        <blockquote className="border-l-2 border-tertiary pl-3 text-xs text-on-surface-variant italic leading-relaxed bg-surface-container-low/60 p-2.5 rounded-r-lg">
          <strong>Context:</strong> &ldquo;{quote}&rdquo;
        </blockquote>
      )}

      {link.keyActions && link.keyActions.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-tertiary mb-1.5">Key Actions Taken:</p>
          <ul className="space-y-1">
            {link.keyActions.map((action, idx) => (
              <li key={idx} className="flex items-start gap-1.5 text-xs text-on-surface-variant">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-tertiary-container shrink-0" />
                {action}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center gap-1.5 text-xs font-semibold text-tertiary group-hover:text-on-tertiary-container transition-colors mt-auto">
        <span>Read on Reddit</span>
        <span className="material-symbols-outlined text-xs">open_in_new</span>
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
      className="group flex items-center gap-3 rounded-xl border border-outline-variant/20 bg-surface-container px-4 py-3 shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
    >
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold shrink-0 ${meta.cls}`}>{meta.label}</span>
      <p className="min-w-0 flex-1 truncate text-sm font-semibold text-on-surface group-hover:text-primary transition-colors">{link.title}</p>
      <span className="material-symbols-outlined text-base text-on-surface-variant group-hover:text-primary transition-colors">open_in_new</span>
    </a>
  );
}

function RealLifeStories({ roadmap }: { roadmap: CareerRoadmap }) {
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
      <div className="overflow-hidden rounded-xl border border-outline-variant/20 bg-surface-container-low shadow-sm">
        <div className="flex items-center gap-3 bg-tertiary text-on-tertiary px-5 py-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/20">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>auto_stories</span>
          </span>
          <div>
            <h3 className="text-sm font-bold" style={{ fontFamily: 'Literata, serif' }}>Real People, Real Paths</h3>
            <p className="text-xs opacity-80">
              {redditLinks.length > 0
                ? `${redditLinks.length} Reddit stories from people who made this career transition`
                : 'No Reddit stories were found for this role'}
            </p>
          </div>
        </div>
        <div className="p-5">
          {redditLinks.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {redditLinks.map((link, i) => <StoryCard key={i} link={link} />)}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-on-surface-variant">
              <span className="material-symbols-outlined text-4xl text-outline">search</span>
              <p className="text-sm">No Reddit stories found for this role.</p>
              <p className="text-xs">Try a broader job title for richer results.</p>
            </div>
          )}
        </div>
      </div>

      {otherLinks.length > 0 && (
        <div>
          <p className="mb-2.5 text-xs font-bold uppercase tracking-widest text-on-surface-variant">Additional Resources</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {otherLinks.map((link, i) => <ResourceLink key={i} link={link} />)}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// YouTube Resources
// ─────────────────────────────────────────────────────────────────────────────

function YouTubeVideoCard({ video }: { video: YouTubeVideo }) {
  return (
    <a
      href={video.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col overflow-hidden rounded-xl border border-outline-variant/20 bg-surface-container shadow-sm transition-all hover:border-error/30 hover:shadow-md"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-surface-container-high">
        {video.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={video.thumbnailUrl} alt={video.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl">▶️</div>
        )}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-error/90 shadow-lg">
            <svg className="h-5 w-5 text-white ml-0.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <p className="text-sm font-semibold text-on-surface leading-snug line-clamp-2 group-hover:text-error transition-colors" style={{ fontFamily: 'Literata, serif' }}>
          {video.title}
        </p>
        <p className="text-xs text-on-surface-variant">{video.channelTitle}</p>
        {video.viewCount > 0 && (
          <p className="text-xs text-on-surface-variant flex items-center gap-1">
            <span className="material-symbols-outlined text-xs">visibility</span>
            {formatCount(video.viewCount)} views
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
      <div className="rounded-xl border border-outline-variant/20 bg-surface-container p-8 text-center shadow-sm">
        <span className="material-symbols-outlined text-4xl text-outline mb-3 block">videocam_off</span>
        <p className="text-sm font-semibold text-on-surface">No YouTube videos available</p>
        <p className="mt-1 text-xs text-on-surface-variant">
          Usually caused by the YouTube API daily quota being exhausted. Try again later.
        </p>
      </div>
    );
  }

  const byTopic = videos.reduce<Record<string, YouTubeVideo[]>>((acc, v) => {
    (acc[v.topic] ??= []).push(v);
    return acc;
  }, {});

  return (
    <div className="overflow-hidden rounded-xl border border-outline-variant/20 bg-surface-container-low shadow-sm">
      <div className="flex items-center gap-3 bg-error text-on-error px-5 py-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/20">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>videocam</span>
        </span>
        <div>
          <h3 className="text-sm font-bold" style={{ fontFamily: 'Literata, serif' }}>YouTube Learning Resources</h3>
          <p className="text-xs opacity-80">{videos.length} video{videos.length !== 1 ? 's' : ''} matched to your skill gaps</p>
        </div>
      </div>
      <div className="divide-y divide-outline-variant/20">
        {Object.entries(byTopic).map(([topic, topicVideos]) => (
          <div key={topic} className="px-5 py-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-error">bolt</span>
              <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                Helps you learn: <span className="text-error normal-case capitalize">{topic}</span>
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {topicVideos.map((video) => <YouTubeVideoCard key={video.videoId} video={video} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Loading state (animated cycling messages)
// ─────────────────────────────────────────────────────────────────────────────

const LOADING_MESSAGES = [
  { icon: '🧭', text: 'Building a roadmap for you…' },
  { icon: '📖', text: 'Finding real Reddit stories…' },
  { icon: '🎬', text: 'Looking up videos for your aid…' },
];

function LoadingState() {
  const [msgIdx, setMsgIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setMsgIdx((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 8000);
    return () => clearInterval(id);
  }, []);

  const msg = LOADING_MESSAGES[msgIdx];

  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <svg className="h-8 w-8 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <div key={msgIdx} style={{ animation: 'fadeInUp 0.5s ease' }}>
            <p className="text-3xl mb-1">{msg.icon}</p>
            <p className="text-sm font-bold text-primary" style={{ fontFamily: 'Literata, serif' }}>{msg.text}</p>
          </div>
          <p className="text-xs text-on-surface-variant max-w-xs">
            This takes ~30–45 seconds. Hang tight while we personalise everything for you.
          </p>
        </div>
      </div>
      {[1, 2].map((i) => (
        <div key={i} className="animate-pulse rounded-xl border border-outline-variant/20 bg-surface-container shadow-sm">
          <div className="h-14 rounded-t-xl bg-surface-container-high" />
          <div className="space-y-3 p-5">
            {[1, 2, 3].map((j) => (
              <div key={j} className="flex gap-3">
                <div className="h-6 w-6 shrink-0 rounded-full bg-surface-container-high" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 w-3/4 rounded bg-surface-container-high" />
                  <div className="h-3 w-full rounded bg-surface-container-highest/40" />
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
// Tab bar
// ─────────────────────────────────────────────────────────────────────────────

type Tab = 'plan' | 'advice' | 'links' | 'videos';

interface TabBtnProps {
  id: string;
  active: boolean;
  onClick: () => void;
  iconName: string;
  label: string;
  count: number;
  activeCls: string;
}

function TabBtn({ id, active, onClick, iconName, label, count, activeCls }: TabBtnProps) {
  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      className={[
        'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-all',
        active ? activeCls : 'text-on-surface-variant hover:bg-surface-container-high',
      ].join(' ')}
    >
      <span className="material-symbols-outlined text-base" style={active ? { fontVariationSettings: "'FILL' 1" } : {}}>{iconName}</span>
      <span className="hidden sm:inline">{label}</span>
      <span className={[
        'rounded-full px-1.5 py-0.5 text-xs font-bold',
        active ? 'bg-white/30 text-inherit' : 'bg-surface-container-high text-on-surface-variant',
      ].join(' ')}>
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

export default function CareerRoadmapComponent({ roadmap, status, error }: Props) {
  const [tab, setTab] = useState<Tab>('plan');

  if (status === 'idle') return null;

  return (
    <section className="mt-12" aria-label="Career Roadmap">
      {/* Section header */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary-fixed mb-4">
          <span className="material-symbols-outlined text-primary text-2xl">map</span>
        </div>
        <h2
          className="text-3xl md:text-4xl font-bold text-on-surface mb-2"
          style={{ fontFamily: 'Literata, serif' }}
        >
          {roadmap ? `Your personalized roadmap.` : 'Building your roadmap…'}
        </h2>

      </div>

      {/* Loading */}
      {status === 'loading' && <LoadingState />}

      {/* Error */}
      {status === 'error' && error && (
        <div className="flex items-start gap-3 rounded-xl border border-error-container bg-error-container/40 p-5">
          <span className="material-symbols-outlined text-error mt-0.5">warning</span>
          <div>
            <p className="text-sm font-semibold text-error">Failed to generate roadmap</p>
            <p className="mt-0.5 text-sm text-on-surface-variant">{error}</p>
          </div>
        </div>
      )}

      {/* Success */}
      {status === 'success' && roadmap && (
        <>
          {/* Tab bar */}
          <div className="mb-6 flex flex-wrap gap-2 rounded-xl border border-outline-variant/30 bg-surface-container-low p-1.5 shadow-sm">
            <TabBtn
              id="roadmap-tab-plan" active={tab === 'plan'} onClick={() => setTab('plan')}
              iconName="map" label="Career Plan" count={roadmap.entrancePlan.length}
              activeCls="bg-primary text-on-primary shadow-sm"
            />
            <TabBtn
              id="roadmap-tab-advice" active={tab === 'advice'} onClick={() => setTab('advice')}
              iconName="lightbulb" label="Key Advice" count={roadmap.advice.length}
              activeCls="bg-tertiary text-on-tertiary shadow-sm"
            />
            <TabBtn
              id="roadmap-tab-stories" active={tab === 'links'} onClick={() => setTab('links')}
              iconName="auto_stories" label="Real Stories" count={roadmap.referenceLinks.filter(l => l.isReddit).length}
              activeCls="bg-secondary text-on-secondary shadow-sm"
            />
            <TabBtn
              id="roadmap-tab-videos" active={tab === 'videos'} onClick={() => setTab('videos')}
              iconName="videocam" label="Videos" count={roadmap.youtubeVideos?.length ?? 0}
              activeCls="bg-error text-on-error shadow-sm"
            />
          </div>

          {/* Tab panels */}
          {tab === 'plan' && <EntrancePlan roadmap={roadmap} />}
          {tab === 'advice' && <KeyAdvice roadmap={roadmap} />}
          {tab === 'links' && <RealLifeStories roadmap={roadmap} />}
          {tab === 'videos' && <YouTubeResources roadmap={roadmap} />}

          {/* Footer */}
          <p className="mt-6 text-xs text-on-surface-variant text-center">
            Pipeline: Tavily (Reddit + resources) · YouTube Data API v3 · HuggingFace (semantic ranking) · Groq/Llama 3
          </p>
        </>
      )}
    </section>
  );
}
