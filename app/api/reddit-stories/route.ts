import { NextRequest, NextResponse } from 'next/server';
import { getGeminiModel } from '@/lib/gemini';
import type { RedditStory } from '@/types/analysis';

export const runtime = 'nodejs';

// Apify run-sync endpoint — blocks until the actor finishes and returns items directly
const APIFY_ENDPOINT =
  'https://api.apify.com/v2/acts/trudax~reddit-scraper-lite/run-sync-get-dataset-items';

// Subreddits most likely to have genuine career-entry stories
const CAREER_SUBREDDITS = [
  'cscareerquestions',
  'careerguidance',
  'learnprogramming',
  'datascience',
  'marketing',
  'financecareers',
  'accounting',
  'premed',
  'lawschool',
  'nursing',
];

function buildApifyInput(jobTitle: string) {
  const searches = [
    `how I became a ${jobTitle}`,
    `how I landed a ${jobTitle} job`,
    `${jobTitle} career advice`,
  ];

  return {
    searches,
    searchPosts: true,
    searchComments: false,
    searchCommunities: false,
    searchUsers: false,
    skipComments: true,
    sort: 'relevance',
    time: 'all',
    includeNSFW: false,
    maxItems: 20,
    maxPostCount: 7,
    scrollTimeout: 30,
    proxy: { useApifyProxy: true },
  };
}

interface ApifyPost {
  dataType?: string;
  title?: string;
  body?: string;
  url?: string;
  upVotes?: number;
  communityName?: string;
  /** ISO-8601 creation date returned by Apify (field name varies by actor version) */
  createdAt?: string;
  publishedAt?: string;
  scrapedAt?: string;
}

/** Resolve the creation date from whichever field Apify populates */
function getPostDate(p: ApifyPost): string {
  return p.createdAt ?? p.publishedAt ?? p.scrapedAt ?? '';
}

const CLASSIFY_PROMPT = (jobTitle: string, posts: ApifyPost[]) => `
You are a career content analyst.

Below are Reddit posts related to people working as or becoming a "${jobTitle}".

Your task:
1. Filter out any posts that are NOT genuinely about someone's personal journey into this role OR practical career advice for this role. Discard off-topic posts.
2. For each remaining post, classify it as EXACTLY one of:
   - "how-they-got-in": Posts where someone describes their personal path, background, steps they took to break into the role
   - "advice": Posts giving tips, lessons learned, things to study or do to enter the field

3. Write a 1–2 sentence plain-text summary of what this post says. Be concrete and specific.

You MUST respond with ONLY a valid JSON array — no markdown, no code fences.

Schema:
[
  {
    "title": "exact post title",
    "summary": "1-2 sentence plain text summary",
    "url": "exact post url",
    "upVotes": number,
    "communityName": "e.g. r/cscareerquestions",
    "category": "how-they-got-in" or "advice",
    "postedAt": "ISO-8601 date string — copy exactly from the post data, or omit if unknown"
  }
]

Return an empty array [] if no posts are relevant.

---POSTS---
${JSON.stringify(
  posts.map((p) => ({
    title: p.title ?? '',
    body: (p.body ?? '').slice(0, 800), // trim long posts
    url: p.url ?? '',
    upVotes: p.upVotes ?? 0,
    communityName: p.communityName ?? '',
    postedAt: getPostDate(p),
  })),
  null,
  2,
)}
`.trim();

/**
 * Scoring for the sort:
 * - Posts ≤ 2 years old  → score = upVotes (recency doesn't penalise)
 * - Posts > 2.5 years old → score = upVotes × age-decay factor (older = lower score)
 * - 2–2.5 years          → linear interpolation of penalty (0 → full)
 *
 * age-decay = 1 / log2(ageYears + 1)  (falls off slowly, stays meaningful)
 */
function storyScore(story: RedditStory): number {
  const votes = story.upVotes ?? 0;

  if (!story.postedAt) return votes; // no date info → pure upvotes

  const ageMs = Date.now() - new Date(story.postedAt).getTime();
  if (isNaN(ageMs) || ageMs < 0) return votes;

  const ageYears = ageMs / (1000 * 60 * 60 * 24 * 365.25);

  if (ageYears <= 2) return votes;                          // recent: no penalty

  const decay = 1 / Math.log2(ageYears + 1);

  if (ageYears >= 2.5) return votes * decay;               // old: full penalty

  // 2 < age < 2.5 → blend from no-penalty to full-penalty
  const blend = (ageYears - 2) / 0.5;                     // 0..1
  return votes * (1 - blend * (1 - decay));
}

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function POST(request: NextRequest) {
  let body: { jobTitle?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body.');
  }

  const jobTitle = typeof body.jobTitle === 'string' ? body.jobTitle.trim() : '';
  if (!jobTitle || jobTitle.length < 2) {
    return errorResponse('Job title must be at least 2 characters.');
  }
  if (jobTitle.length > 100) {
    return errorResponse('Job title must be under 100 characters.');
  }

  const apifyToken = process.env.APIFY_API_TOKEN;
  if (!apifyToken) {
    return errorResponse('Apify API token is not configured.', 500);
  }

  // ── Step 1: Scrape Reddit via Apify ────────────────────────────────────────
  let redditPosts: ApifyPost[] = [];
  try {
    const apifyRes = await fetch(`${APIFY_ENDPOINT}?token=${apifyToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildApifyInput(jobTitle)),
    });

    if (!apifyRes.ok) {
      const errText = await apifyRes.text();
      console.error('[Apify error]', apifyRes.status, errText);
      return errorResponse(
        'Failed to fetch Reddit posts. Please try again.',
        502,
      );
    }

    const rawItems: ApifyPost[] = await apifyRes.json();
    // Only keep posts (not communities/users/comments)
    redditPosts = rawItems.filter(
      (item) => item.dataType === 'post' && item.title && item.url,
    );
  } catch (err) {
    console.error('[Apify fetch error]', err);
    return errorResponse('Network error reaching Reddit scraper.', 502);
  }

  if (redditPosts.length === 0) {
    return NextResponse.json({ data: { jobTitle, stories: [] } });
  }

  // ── Step 2: Classify & summarize with Gemini ────────────────────────────────
  let stories: RedditStory[] = [];
  try {
    const result = await getGeminiModel().generateContent(
      CLASSIFY_PROMPT(jobTitle, redditPosts),
    );
    let raw = result.response.text();

    // Strip markdown code fences if present
    raw = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```\s*$/, '')
      .trim();

    const parsed = JSON.parse(raw) as RedditStory[];
    if (!Array.isArray(parsed)) throw new Error('Expected array');

    // Sort: how-they-got-in first, then advice;
    // within each group: upvotes-first with age penalty for posts > 2.5 yrs old.
    stories = parsed.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category === 'how-they-got-in' ? -1 : 1;
      }
      return storyScore(b) - storyScore(a);
    });
  } catch (err) {
    console.error('[Gemini classify error]', err);
    return errorResponse('Failed to process Reddit stories. Please try again.', 500);
  }

  return NextResponse.json({ data: { jobTitle, stories } });
}
