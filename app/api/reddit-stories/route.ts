import { NextRequest, NextResponse } from 'next/server';
import { callGroq } from '@/lib/groq';
import type { RedditStory } from '@/types/analysis';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Tavily Search API — searches via Google/Bing indices, bypasses Reddit's IP blocks
const TAVILY_SEARCH_URL = 'https://api.tavily.com/search';

// ── Types ─────────────────────────────────────────────────────────────────────

interface TavilyResult {
  url: string;
  title: string;
  content?: string;
  score?: number;
}

interface TavilyResponse {
  results?: TavilyResult[];
}

// Internal shape passed to the Groq prompt
interface Post {
  title: string;
  body: string;
  url: string;
  upVotes: number;
  communityName: string;
  postedAt: string;
}

// ── Fetch Reddit posts via Tavily ─────────────────────────────────────────────

/**
 * Searches Reddit via Tavily with include_domains: ["reddit.com"].
 *
 * Why Tavily instead of Reddit's own API?
 * Reddit's public JSON API (search.json) blocks server/cloud IPs with 403s and
 * returns empty results from datacenter addresses (Vercel, local dev servers, etc.).
 * Tavily searches Google/Bing indices for Reddit content, bypassing this restriction.
 */
async function fetchRedditPosts(jobTitle: string): Promise<Post[]> {
  const tavilyKey = process.env.TAVILY_API_KEY;
  if (!tavilyKey) {
    console.warn('[reddit-stories] TAVILY_API_KEY not set — skipping Reddit fetch');
    return [];
  }

  const queries = [
    `how I became a ${jobTitle} reddit`,
    `how I landed a ${jobTitle} job reddit`,
    `${jobTitle} career advice reddit`,
  ];

  const allPosts: Post[] = [];
  const seenUrls = new Set<string>();

  await Promise.all(
    queries.map(async (query) => {
      try {
        const res = await fetch(TAVILY_SEARCH_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tavilyKey}`,
          },
          body: JSON.stringify({
            query,
            search_depth: 'basic',
            max_results: 5,
            include_domains: ['reddit.com'],
            include_answer: false,
          }),
        });

        if (!res.ok) {
          console.warn(`[reddit-stories] Tavily HTTP ${res.status} for: "${query}"`);
          return;
        }

        const data: TavilyResponse = await res.json();
        const results = data.results ?? [];

        for (const result of results) {
          if (!result.url || seenUrls.has(result.url)) continue;
          // Only actual post URLs (skip subreddit index / user profile pages)
          if (!result.url.includes('/comments/')) continue;
          if (!result.title) continue;

          seenUrls.add(result.url);

          // Extract subreddit from URL: reddit.com/r/cscareerquestions/comments/...
          const subredditMatch = result.url.match(/reddit\.com\/r\/([^/]+)/);
          const communityName = subredditMatch ? `r/${subredditMatch[1]}` : '';

          allPosts.push({
            title: result.title,
            body: result.content ?? '',
            url: result.url,
            upVotes: 0,     // Tavily doesn't expose Reddit vote counts
            communityName,
            postedAt: '',   // Tavily doesn't expose post dates
          });
        }
      } catch (err) {
        console.warn(`[reddit-stories] Error for query "${query}":`, err);
      }
    }),
  );

  console.log(`[reddit-stories] Fetched ${allPosts.length} posts via Tavily`);
  return allPosts;
}

// ── Groq classify prompt ──────────────────────────────────────────────────────

const CLASSIFY_PROMPT = (jobTitle: string, posts: Post[]) => `
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
    "postedAt": "ISO-8601 date string or empty string"
  }
]

Return an empty array [] if no posts are relevant.

---POSTS---
${JSON.stringify(
  posts.map((p) => ({
    title: p.title,
    body: p.body.slice(0, 800),
    url: p.url,
    upVotes: p.upVotes,
    communityName: p.communityName,
    postedAt: p.postedAt,
  })),
  null,
  2,
)}
`.trim();

// ── Scoring ───────────────────────────────────────────────────────────────────

/**
 * Scoring for the sort:
 * - Posts ≤ 2 years old  → score = upVotes
 * - Posts > 2.5 years old → score = upVotes × age-decay factor
 * - 2–2.5 years          → linear interpolation
 *
 * age-decay = 1 / log2(ageYears + 1)
 */
function storyScore(story: RedditStory): number {
  const votes = story.upVotes ?? 0;
  if (!story.postedAt) return votes;

  const ageMs = Date.now() - new Date(story.postedAt).getTime();
  if (isNaN(ageMs) || ageMs < 0) return votes;

  const ageYears = ageMs / (1000 * 60 * 60 * 24 * 365.25);
  if (ageYears <= 2) return votes;

  const decay = 1 / Math.log2(ageYears + 1);
  if (ageYears >= 2.5) return votes * decay;

  const blend = (ageYears - 2) / 0.5;
  return votes * (1 - blend * (1 - decay));
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: { message } }, { status });
}

// ── Handler ───────────────────────────────────────────────────────────────────

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

  // ── Step 1: Fetch Reddit posts via Tavily ───────────────────────────────────
  let redditPosts: Post[] = [];
  try {
    redditPosts = await fetchRedditPosts(jobTitle);
  } catch (err) {
    console.error('[reddit-stories fetch error]', err);
    return errorResponse('Network error reaching search service.', 502);
  }

  if (redditPosts.length === 0) {
    return NextResponse.json({ data: { jobTitle, stories: [] } });
  }

  // ── Step 2: Classify & summarize with Groq ──────────────────────────────────
  let stories: RedditStory[] = [];
  try {
    let raw = await callGroq(
      [
        {
          role: 'system',
          content: 'You are a career content analyst. You always respond with valid JSON arrays only. No markdown, no code fences, no explanation.',
        },
        { role: 'user', content: CLASSIFY_PROMPT(jobTitle, redditPosts) },
      ],
      { model: 'openai/gpt-oss-120b', temperature: 0.2, maxTokens: 2048 },
    );

    raw = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```\s*$/, '')
      .trim();

    const parsed = JSON.parse(raw) as RedditStory[];
    if (!Array.isArray(parsed)) throw new Error('Expected array');

    // Sort: how-they-got-in first, then advice;
    // within each group: score-descending (upvotes + age penalty)
    stories = parsed.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category === 'how-they-got-in' ? -1 : 1;
      }
      return storyScore(b) - storyScore(a);
    });
  } catch (err) {
    console.error('[Groq classify error]', err);
    return errorResponse('Failed to process Reddit stories. Please try again.', 500);
  }

  return NextResponse.json({ data: { jobTitle, stories } });
}
