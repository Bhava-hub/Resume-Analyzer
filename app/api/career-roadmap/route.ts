import { NextRequest, NextResponse } from 'next/server';
import { callGroq } from '@/lib/groq';
import { db } from '@/lib/db';
import { analyses, jobs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getCached, setCached } from '@/lib/cache';
import type { AnalysisResult, CareerRoadmap, ReferenceLink, RoadmapAdvice, RoadmapStep, YouTubeVideo } from '@/types/analysis';

export const runtime = 'nodejs';
// Give the pipeline enough time (Reddit + Tavily + HF + Groq can chain to ~45s)
export const maxDuration = 60;

// ── Constants ────────────────────────────────────────────────────────────────

// Tavily Search API — 1,000 free searches/month, designed for AI pipelines
// Used for both Reddit searches (include_domains) and general resource discovery
const TAVILY_SEARCH_URL = 'https://api.tavily.com/search';

// YouTube Data API v3
const YOUTUBE_SEARCH_URL = 'https://www.googleapis.com/youtube/v3/search';
const YOUTUBE_VIDEOS_URL = 'https://www.googleapis.com/youtube/v3/videos';

const HF_SIMILARITY_URL =
  'https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2';

// ── Types ────────────────────────────────────────────────────────────────────

interface ApifyPost {
  dataType?: string;
  title?: string;
  body?: string;
  url?: string;
  upVotes?: number;
  communityName?: string;
}

interface ProcessedPost {
  title: string;
  body: string;
  url: string;
  upVotes: number;
  communityName: string;
  category: 'entry-story' | 'advice' | 'both';
  keyActions: string[];
  backgroundContext: string;
  relevanceScore: number;
}

// ── Step 0a: Simplify complex skill names via Groq ─────────────────────────

/**
 * Converts verbose resume-analysis skill gaps into simple, searchable
 * topic names using Groq (fast, free). Works for ANY career field —
 * tech, healthcare, archaeology, design, law, etc.
 * Falls back to the original skill names if Groq fails.
 *
 * e.g. "transformer-based NLP fine-tuning with LoRA" → "NLP"
 *      "Kubernetes pod orchestration with Helm charts" → "Kubernetes"
 *      "systematic field excavation techniques" → "field excavation"
 *      "advanced perioperative nursing care" → "perioperative nursing"
 */
async function simplifySkillsWithGroq(skills: string[]): Promise<string[]> {
  if (skills.length === 0) return [];

  // Cache key: the sorted skill names joined — order shouldn't matter
  const cacheKey = skills.slice().sort().join('|');
  const cached = await getCached<string[]>('groq-simplify', cacheKey);
  if (cached) return cached;

  const prompt = `You are a skill normalization engine for a web search system.

Your job is to shorten verbose skill gap descriptions into concise, searchable terms
that will return real results when typed into a search engine like Google.

Rules:
- Output ONLY a valid JSON array of strings, one per input skill, in the same order.
- Max 3 words per output term.
- The output must work for ANY career field: tech, healthcare, law, design, archaeology, finance, education, etc.
- If the skill is already concise (1-3 words), return it unchanged.
- If the skill is verbose, extract the core noun phrase that a person would actually search for.
- Do NOT map non-tech skills to tech terms. "Patient assessment" should NOT become "Data Analysis".
- Never output vague words alone like "Management", "Analysis", "Skills", "Development" — always pair with the domain.
- Only output nouns or noun phrases, never verbs or adjectives alone.

Examples:
"transformer-based NLP fine-tuning with LoRA" → "NLP fine-tuning"
"Kubernetes pod orchestration with Helm charts" → "Kubernetes"
"systematic archaeological field excavation techniques" → "field excavation"
"advanced perioperative nursing patient care" → "perioperative nursing"
"financial statement analysis and forecasting" → "financial forecasting"
"corporate litigation and contract drafting" → "contract drafting"
"user experience wireframing and prototyping" → "UX prototyping"
"Large-Scale Data Analysis" → "data analysis"

Skills to simplify:
${JSON.stringify(skills)}`;

  try {
    const raw = await callGroq(
      [
        {
          role: 'system',
          content: 'You are a skill normalization engine. You respond with only valid JSON arrays of strings. No markdown, no explanation.',
        },
        { role: 'user', content: prompt },
      ],
      { temperature: 0.0, maxTokens: 128 },
    );

    const stripped = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```\s*$/, '')
      .trim();

    const parsed = JSON.parse(stripped) as unknown[];

    if (
      Array.isArray(parsed) &&
      parsed.length === skills.length &&
      parsed.every((s) => typeof s === 'string')
    ) {
      const simplified = parsed as string[];
      skills.forEach((orig, i) => {
        if (orig !== simplified[i]) {
          console.log(`[groq-simplify] "${orig}" → "${simplified[i]}"`);
        }
      });
      // Cache for 24h — same skill names always simplify the same way
      await setCached('groq-simplify', cacheKey, simplified, 86400);
      return simplified;
    }

    console.warn('[groq-simplify] Unexpected shape, using original skills');
    return skills;
  } catch (err) {
    console.warn('[groq-simplify] Failed (will use original skill names):', err);
    return skills;
  }
}

// ── Step 0b: Discover step-pinned resource URLs via Tavily Search ─────────────

interface TavilyResult {
  url: string;
  title: string;
  content?: string;
  score?: number;
}

interface TavilyResponse {
  results?: TavilyResult[];
  answer?: string;
}

/** Each roadmap step gets its own targeted Tavily query → up to 2 verified URLs. */
type StepKey = 'step1' | 'step2' | 'step3' | 'step4' | 'step5';
type StepResourceMap = Record<StepKey, string[]>;

/**
 * Runs 5 step-specific Tavily searches (one per roadmap step) and returns
 * up to 2 verified URLs per step — all in one parallel batch.
 *
 * Step mapping:
 *   step1 → Foundational Skills  (learn the skill from scratch)
 *   step2 → Tools & Practice     (hands-on exercises)
 *   step3 → Portfolio Project    (project ideas / GitHub examples)
 *   step4 → Resume Polish        (ATS keywords / resume tips)
 *   step5 → Interview Prep       (interview questions / guides)
 *
 * Fetching 2 URLs per step costs ZERO extra API calls — we just take
 * results[0] and results[1] from the same max_results: 3 request.
 * Total: 5 Tavily calls per pipeline run (was 4 before).
 */
async function searchStepResourcesViaTavily(
  simplifiedSkills: string[],
  jobTitle: string,
): Promise<StepResourceMap> {
  const tavilyKey = process.env.TAVILY_API_KEY;
  const empty: StepResourceMap = { step1: [], step2: [], step3: [], step4: [], step5: [] };
  if (!tavilyKey) {
    console.warn('[tavily-steps] TAVILY_API_KEY not set — skipping resource search');
    return empty;
  }

  // Cache key: jobTitle + top 2 skills (these drive all 5 step queries)
  const skill1 = simplifiedSkills[0] ?? jobTitle;
  const skill2 = simplifiedSkills[1] ?? skill1;
  const cacheKey = `${jobTitle.toLowerCase()}::${skill1}::${skill2}`;

  const cached = await getCached<StepResourceMap>('tavily', cacheKey);
  if (cached) return cached;

  const stepQueries: [StepKey, string][] = [
    ['step1', `${skill1} fundamentals beginner course tutorial`],
    ['step2', `${skill2} hands-on practice exercises tutorial`],
    ['step3', `${jobTitle} portfolio project ideas examples github`],
    ['step4', `${jobTitle} resume tips ATS keywords optimization`],
    ['step5', `${jobTitle} interview questions preparation guide`],
  ];

  console.log(`[tavily-steps] Searching step-pinned resources for: ${jobTitle}`);

  const result: StepResourceMap = { step1: [], step2: [], step3: [], step4: [], step5: [] };

  await Promise.all(
    stepQueries.map(async ([stepKey, query]) => {
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
            max_results: 3,
            include_answer: false,
          }),
        });

        if (!res.ok) {
          const errBody = await res.text();
          console.warn(`[tavily-steps] HTTP ${res.status} for "${stepKey}":`, errBody.slice(0, 200));
          return;
        }

        const data: TavilyResponse = await res.json();
        const urls = (data.results ?? [])
          .map((r) => r.url)
          .filter(Boolean)
          .slice(0, 2);

        result[stepKey] = urls;
        console.log(`[tavily-steps] ${stepKey} ("${query.slice(0, 50)}…") → ${urls.length} URLs`);
      } catch (err) {
        console.warn(`[tavily-steps] Error for "${stepKey}":`, err);
      }
    }),
  );

  const totalUrls = Object.values(result).reduce((s, urls) => s + urls.length, 0);
  console.log(`[tavily-steps] Done — ${totalUrls} URLs across 5 steps`);

  // Cache for 24h — step resource URLs are stable for the same job title + skills
  if (totalUrls > 0) {
    await setCached('tavily', cacheKey, result, 86400);
  }

  return result;

}

// ── Step 0c: Fetch YouTube tutorials via YouTube Data API v3 ──────────────────

interface YouTubeSearchItem {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    channelTitle?: string;
    publishedAt?: string;
    thumbnails?: { medium?: { url?: string }; high?: { url?: string } };
  };
}

interface YouTubeVideoItem {
  id?: string;
  statistics?: { viewCount?: string; likeCount?: string };
}

/**
 * For each skill (up to maxSkills) and the job title itself, searches YouTube
 * via the official Data API v3 (free: 10,000 units/day, a search = 100 units).
 * Videos are sorted by relevance, then re-ranked by likeCount descending
 * (recency filter: only videos from the last 3 years).
 * Falls back to [] if YOUTUBE_API_KEY is not configured.
 */
async function searchYouTubeVideos(
  skills: string[],
  jobTitle: string,
  maxSkills = 3,
): Promise<YouTubeVideo[]> {
  const ytKey = process.env.YOUTUBE_API_KEY;
  if (!ytKey) {
    console.warn('[youtube] YOUTUBE_API_KEY not set — skipping YouTube search');
    return [];
  }

  const targetSkills = skills.slice(0, maxSkills);

  // Cache key: jobTitle + the top skills used as topics
  // Videos for the same role+skills will always be the same — cache for 7 days
  const cacheKey = `${jobTitle.toLowerCase()}::${targetSkills.join(',')}`;
  const cached = await getCached<YouTubeVideo[]>('youtube', cacheKey);
  if (cached) return cached;

  const topicQueries: [string, string, boolean][] = [
    ...targetSkills.map((skill): [string, string, boolean] => [
      skill,
      `${skill} tutorial beginner guide`,
      false,
    ]),
    [jobTitle, `how to become a ${jobTitle} career guide`, true],
  ];

  const publishedAfter = new Date(
    Date.now() - 5 * 365.25 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const allVideos: YouTubeVideo[] = [];
  const seenVideoIds = new Set<string>();

  await Promise.all(
    topicQueries.map(async ([topic, query, isRoleTopic]) => {
      try {
        const searchParams = new URLSearchParams({
          part: 'snippet',
          q: query,
          type: 'video',
          maxResults: '8',
          order: 'relevance',
          publishedAfter,
          key: ytKey,
        });

        const searchRes = await fetch(`${YOUTUBE_SEARCH_URL}?${searchParams}`);
        if (!searchRes.ok) {
          console.warn(`[youtube] Search HTTP ${searchRes.status} for "${topic}"`);
          return;
        }

        const searchData = await searchRes.json() as { items?: YouTubeSearchItem[] };
        const items = searchData.items ?? [];
        const videoIds = items
          .map((item) => item.id?.videoId)
          .filter((id): id is string => !!id);

        if (videoIds.length === 0) return;

        const statsParams = new URLSearchParams({
          part: 'statistics',
          id: videoIds.join(','),
          key: ytKey,
        });

        const statsRes = await fetch(`${YOUTUBE_VIDEOS_URL}?${statsParams}`);
        const statsData = statsRes.ok
          ? (await statsRes.json() as { items?: YouTubeVideoItem[] })
          : { items: [] };

        const statsMap = new Map<string, number>();
        for (const stat of statsData.items ?? []) {
          if (stat.id) {
            statsMap.set(stat.id, parseInt(stat.statistics?.viewCount ?? '0', 10));
          }
        }

        const topicKeywords = topic
          .toLowerCase()
          .split(/[\s\-_]+/)
          .filter((kw) => kw.length >= 2);

        const topicVideos: YouTubeVideo[] = items
          .filter((item) => {
            const vid = item.id?.videoId;
            return vid && !seenVideoIds.has(vid);
          })
          .map((item) => {
            const vid = item.id!.videoId!;
            const snippet = item.snippet ?? {};
            return {
              videoId: vid,
              title: snippet.title ?? '',
              channelTitle: snippet.channelTitle ?? '',
              thumbnailUrl:
                snippet.thumbnails?.high?.url ??
                snippet.thumbnails?.medium?.url ??
                '',
              url: `https://www.youtube.com/watch?v=${vid}`,
              viewCount: statsMap.get(vid) ?? 0,
              publishedAt: snippet.publishedAt ?? '',
              topic,
            };
          })
          .filter((video) => {
            if (isRoleTopic) return true;
            const haystack = `${video.title} ${video.channelTitle}`.toLowerCase();
            return topicKeywords.some((kw) => {
              return kw.length <= 4
                ? haystack.includes(kw)
                : haystack.includes(kw.slice(0, 6));
            });
          })
          .sort((a, b) => b.viewCount - a.viewCount)
          .slice(0, 3);

        for (const video of topicVideos) {
          seenVideoIds.add(video.videoId);
          allVideos.push(video);
        }

        console.log(`[youtube] "${topic}" → ${topicVideos.length} videos`);
      } catch (err) {
        console.warn(`[youtube] Error for "${topic}":`, err);
      }
    }),
  );

  console.log(`[youtube] Total: ${allVideos.length} videos across ${topicQueries.length} topics`);

  // Cache the full result set for 7 days — YouTube rankings are stable
  if (allVideos.length > 0) {
    await setCached('youtube', cacheKey, allVideos, 604800);
  }

  return allVideos;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Strip HTML entities (e.g. &#32; → space) and tags from Apify-returned text */
function stripHtml(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&nbsp;/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Step 1: Scrape Reddit via native JSON API (free, no key needed) ──────────

/**
 * Searches Reddit via Tavily (include_domains: reddit.com).
 * This avoids Reddit's IP blocks on server/cloud environments — Tavily searches
 * via Google/Bing indices and returns real Reddit post URLs + content snippets.
 * Falls back to [] if TAVILY_API_KEY is not set.
 */
async function scrapeReddit(jobTitle: string): Promise<ApifyPost[]> {
  const tavilyKey = process.env.TAVILY_API_KEY;
  if (!tavilyKey) {
    console.warn('[reddit] TAVILY_API_KEY not set — skipping Reddit search');
    return [];
  }

  const queries = [
    `${jobTitle} career advice reddit`,
    `how I became a ${jobTitle} reddit`,
    `${jobTitle} resume tips reddit`,
  ];

  const allPosts: ApifyPost[] = [];
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
          console.warn(`[reddit-tavily] HTTP ${res.status} for query: "${query}"`);
          return;
        }

        const data: TavilyResponse = await res.json();
        const results = data.results ?? [];

        for (const result of results) {
          if (!result.url || seenUrls.has(result.url)) continue;
          // Only accept actual Reddit post URLs (not subreddit/user pages)
          if (!result.url.includes('/comments/')) continue;
          seenUrls.add(result.url);

          // Extract subreddit from URL: reddit.com/r/cscareerquestions/comments/...
          const subredditMatch = result.url.match(/reddit\.com\/r\/([^/]+)/);
          const communityName = subredditMatch ? `r/${subredditMatch[1]}` : '';

          allPosts.push({
            dataType: 'post',
            title: result.title ?? '',
            body: result.content ?? '',
            url: result.url,
            upVotes: 0,          // not available from Tavily
            communityName,
          });
        }
      } catch (err) {
        console.warn(`[reddit-tavily] Error for query "${query}":`, err);
      }
    }),
  );

  console.log(`[reddit-tavily] Fetched ${allPosts.length} Reddit posts via Tavily`);
  return allPosts;
}

// ── Step 2: HuggingFace semantic similarity — rank posts by relevance ────────

async function rankByRelevance(
  posts: ApifyPost[],
  jobTitle: string,
  jobDescription: string,
): Promise<ApifyPost[]> {
  const hfKey = process.env.HUGGINGFACE_API_KEY;
  if (!hfKey || posts.length === 0) return posts.slice(0, 10);

  // Anchor sentence: what we're looking for
  const sourceSentence = `career path, steps, advice for becoming a ${jobTitle}. ${jobDescription.slice(0, 300)}`;

  // Each sentence is the post title + first 200 chars of body
  const sentences = posts.map(
    (p) => `${p.title ?? ''} ${(p.body ?? '').slice(0, 200)}`.trim(),
  );

  try {
    const res = await fetch(HF_SIMILARITY_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${hfKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: { source_sentence: sourceSentence, sentences },
      }),
    });

    if (!res.ok) {
      // HF cold-start or error — fall back to first 10
      return posts.slice(0, 10);
    }

    const scores: number[] = await res.json();

    // Zip posts with their scores, sort descending, keep top 10
    const ranked = posts
      .map((post, i) => ({ post, score: scores[i] ?? 0 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(({ post }) => post);

    return ranked;
  } catch {
    return posts.slice(0, 10);
  }
}

// ── Step 3: Groq — classify + extract structured insights ───────────────────

const GROQ_EXTRACT_PROMPT = (jobTitle: string, posts: ApifyPost[]) => `
You are a career analyst. Analyze these Reddit posts about becoming a "${jobTitle}".

For each post, extract structured insights. You MUST respond with ONLY a valid JSON array.

Schema per item:
{
  "url": "exact post url",
  "category": "entry-story" | "advice" | "both" | "irrelevant",
  "keyActions": ["specific action they took or recommended"],
  "backgroundContext": "brief context about this person's situation or the advice giver"
}

Rules:
- "entry-story": someone describing their personal journey into the role
- "advice": tips/recommendations for entering the field
- "both": personal story that also gives concrete advice
- "irrelevant": does not relate to career entry or advice for this role
- keyActions should be concrete and specific (not "learn programming" but "built 3 Python projects on GitHub")
- If irrelevant, set keyActions to [] and backgroundContext to ""
- Return [] if no posts qualify

Posts:
${JSON.stringify(
  posts.map((p) => ({
    url: p.url ?? '',
    title: p.title ?? '',
    body: (p.body ?? '').slice(0, 600),
  })),
  null,
  2,
)}
`.trim();

async function extractInsightsWithGroq(
  jobTitle: string,
  posts: ApifyPost[],
): Promise<ProcessedPost[]> {
  if (posts.length === 0) return [];

  try {
    const raw = await callGroq(
      [
        {
          role: 'system',
          content:
            'You are a career analyst. You always respond with valid JSON arrays only. No markdown, no explanation.',
        },
        { role: 'user', content: GROQ_EXTRACT_PROMPT(jobTitle, posts) },
      ],
      { temperature: 0.2, maxTokens: 3000 },
    );

    const stripped = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```\s*$/, '')
      .trim();

    const parsed = JSON.parse(stripped) as Array<{
      url: string;
      category: string;
      keyActions: string[];
      backgroundContext: string;
    }>;

    if (!Array.isArray(parsed)) return [];

    // Merge back with original post data, filter out irrelevant ones
    const result: ProcessedPost[] = [];
    for (const item of parsed) {
      if (item.category === 'irrelevant') continue;
      const original = posts.find((p) => p.url === item.url);
      if (!original) continue;

      result.push({
        title: original.title ?? '',
        body: (original.body ?? '').slice(0, 400),
        url: original.url ?? '',
        upVotes: original.upVotes ?? 0,
        communityName: original.communityName ?? '',
        category: item.category as ProcessedPost['category'],
        keyActions: item.keyActions ?? [],
        backgroundContext: item.backgroundContext ?? '',
        relevanceScore: 0,
      });
    }

    return result;
  } catch (err) {
    console.error('[Groq extract error]', err);
    return [];
  }
}

// ── Step 4: Groq — generate the final roadmap ────────────────────────────────────

const GROQ_ROADMAP_PROMPT = (
  jobTitle: string,
  jobDescription: string,
  analysisResult: AnalysisResult,
  rawPosts: ApifyPost[],
  stepResources: StepResourceMap,
) => {
  // Format step-pinned URLs — each step number maps to its own curated URL(s)
  const stepLabels: Record<StepKey, string> = {
    step1: 'Step 1 (Foundational Skills)',
    step2: 'Step 2 (Tools & Practice)',
    step3: 'Step 3 (Portfolio Project)',
    step4: 'Step 4 (Resume Polish)',
    step5: 'Step 5 (Interview Prep)',
  };

  const hasAnyUrls = Object.values(stepResources).some((urls) => urls.length > 0);

  // Flat list of all verified URLs (for referenceLinks)
  const allVerifiedUrls = Object.values(stepResources).flat();

  const resourceUrlBlock = hasAnyUrls
    ? `STEP-PINNED RESOURCE URLS (verified from live web search — these are real and working):
Each step's resource MUST come only from its own pinned URL(s). Do NOT swap URLs between steps.
${(Object.keys(stepResources) as StepKey[]).map((key) => {
      const urls = stepResources[key];
      return urls.length > 0
        ? `- ${stepLabels[key]}: ${urls.join(' | ')}`
        : `- ${stepLabels[key]}: (none — set resources to [])`;
    }).join('\n')}`
    : '(No verified resource URLs available — set resources to [] for all steps.)';

  return `
You are a senior career coach. Create a personalized career entry roadmap.

You MUST respond with ONLY valid JSON — no markdown, no code fences.

The person has these specific gaps (from resume analysis):
- Missing skills: ${analysisResult.missingSkills.items.map((i) => i.point).join(', ')}
- Experience gaps: ${analysisResult.experienceGaps.items.map((i) => i.point).join(', ')}
- Keyword mismatches: ${analysisResult.keywordMismatches.items.map((i) => i.point).join(', ')}

Target role: ${jobTitle}

Job description summary (first 500 chars):
${jobDescription.slice(0, 500)}

${resourceUrlBlock}

Raw Reddit posts (top relevant results — use for evidence and reference links):
${rawPosts.length > 0
      ? rawPosts
        .slice(0, 4)
        .map(
          (p) => `- ${p.url}\n  Title: ${(p.title ?? '').slice(0, 100)}\n  Summary: ${(p.body ?? '').slice(0, 150)}`,
        )
        .join('\n')
      : '(No Reddit data available — generate roadmap based on analysis only)'
    }

Generate this exact JSON structure:
{
  "entrancePlan": [
    {
      "step": 1,
      "action": "Short headline (max 10 words)",
      "detail": "Specific instructions tailored to their exact gaps (2-3 sentences)",
      "redditEvidence": "Quote or paraphrase from a real Reddit post above (or null if none fits)",
      "redditUrl": "URL of the Reddit post used (or null)",
      "resources": [
        {
          "label": "Descriptive name of the resource (max 6 words)",
          "url": "Use ONLY the URL pinned to THIS step number from STEP-PINNED RESOURCE URLS. Step 1 uses Step 1 URL, Step 2 uses Step 2 URL, etc. If no URL is pinned to this step, omit the resource.",
          "type": "course | docs | github | article | other"
        }
      ]
    }
  ],
  "advice": [
    {
      "tip": "Short advice headline (max 10 words)",
      "reason": "Why this matters specifically for their gaps (1-2 sentences)",
      "redditEvidence": "Quote from Reddit (or null)",
      "redditUrl": "Reddit URL (or null)"
    }
  ],
  "referenceLinks": [
    {
      "title": "Resource name",
      "url": "Use ONLY a URL from: ${allVerifiedUrls.join(' | ') || '(none)'} — or a Reddit URL from the posts above.",
      "type": "course | docs | community | github | article | reddit",
      "description": "1 sentence: why this is relevant to their specific missing skills",
      "isReddit": false
    }
  ]
}

Rules (STRICT — keep output concise to avoid truncation):
- entrancePlan: EXACTLY 5 steps in order: (1) Foundational Skills, (2) Tools & Practice, (3) Portfolio Project, (4) Resume Polish, (5) Interview Prep.
- action: max 8 words.
- detail: max 2 sentences, max 30 words each.
- redditEvidence: max 20 words or null.
- resources: EXACTLY 1 resource per step. Use ONLY the URL pinned to that step number. NEVER use a Step 2 URL for Step 1, etc. If a step has no pinned URL, set resources to [].
- resource label: max 6 words.
- DO NOT invent, guess, or hallucinate any URL. Every URL must come from the step-pinned list or Reddit posts above.
- advice: EXACTLY 3 tips. tip: max 8 words. reason: max 25 words.
- referenceLinks: EXACTLY 4 links. Use any verified URL from the step-pinned list or Reddit URLs only.
- description in referenceLinks: max 15 words.
- All text: plain text only, no markdown symbols.
`.trim();
};

async function generateRoadmapWithGroq(
  jobTitle: string,
  jobDescription: string,
  analysisResult: AnalysisResult,
  rawPosts: ApifyPost[],
  stepResources: StepResourceMap,
): Promise<Omit<CareerRoadmap, 'jobTitle' | 'redditPostsUsed'>> {
  const raw = await callGroq(
    [
      {
        role: 'system',
        content:
          'You are a senior career coach. You always respond with valid JSON only. No markdown, no code fences, no explanation.',
      },
      {
        role: 'user',
        content: GROQ_ROADMAP_PROMPT(jobTitle, jobDescription, analysisResult, rawPosts, stepResources),
      },
    ],

    // simplify call uses ~400 tokens; roadmap output rarely exceeds 1500 tokens.
    // Keeping maxTokens at 2000 leaves headroom and avoids 429s on rapid requests.
    { model: 'openai/gpt-oss-120b', temperature: 0.3, maxTokens: 2000 },
  );

  const stripped = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/, '')
    .trim();

  const parsed = JSON.parse(stripped) as {
    entrancePlan: RoadmapStep[];
    advice: RoadmapAdvice[];
    referenceLinks: ReferenceLink[];
  };

  if (!Array.isArray(parsed.entrancePlan)) throw new Error('Invalid entrancePlan');
  if (!Array.isArray(parsed.advice)) throw new Error('Invalid advice');
  if (!Array.isArray(parsed.referenceLinks)) throw new Error('Invalid referenceLinks');

  // Sort entrancePlan steps strictly by step number to ensure correct order
  parsed.entrancePlan.sort((a, b) => a.step - b.step);

  // Add top Reddit posts to referenceLinks (HTML entities decoded, deduped by URL)
  for (const post of rawPosts.slice(0, 5)) {
    if (!post.url) continue;
    const alreadyAdded = parsed.referenceLinks.some((l) => l.url === post.url);
    if (!alreadyAdded) {
      parsed.referenceLinks.push({
        title: stripHtml(post.title ?? ''),
        url: post.url,
        type: 'reddit',
        description: stripHtml((post.body ?? '').slice(0, 150)) || 'Reddit discussion',
        isReddit: true,
        subreddit: post.communityName ?? '',
        upVotes: post.upVotes ?? 0,
      });
    }
  }

  return { ...parsed, youtubeVideos: [] };
}

// ── Dedup referenceLinks by URL ──────────────────────────────────────────────

/**
 * Removes duplicate referenceLinks by URL.
 * All URLs in the roadmap come from Apify Google Search (real) or Reddit scrape (real),
 * so no whitelist, normalization, or hallucination-guard is needed.
 */
function deduplicateReferenceLinks(
  roadmap: Omit<CareerRoadmap, 'jobTitle' | 'redditPostsUsed'>,
): Omit<CareerRoadmap, 'jobTitle' | 'redditPostsUsed'> {
  const seenUrls = new Set<string>();
  const dedupedRefs = roadmap.referenceLinks.filter((l) => {
    if (!l.url || seenUrls.has(l.url)) return false;
    seenUrls.add(l.url);
    return true;
  });

  console.log(
    `[career-roadmap] referenceLinks after dedup: ${dedupedRefs.length}/${roadmap.referenceLinks.length}`,
  );

  return { ...roadmap, referenceLinks: dedupedRefs };
}

// ── Main handler ─────────────────────────────────────────────────────────────

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function POST(request: NextRequest) {
  // The frontend now sends only jobTitle + analysisId (not the full analysis object).
  // We look up the rest from the DB — safer and avoids sending large JSON twice.
  let body: { jobTitle?: string; analysisId?: string };

  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body.');
  }

  const jobTitle = typeof body.jobTitle === 'string' ? body.jobTitle.trim() : '';
  const analysisId = typeof body.analysisId === 'string' ? body.analysisId.trim() : '';

  if (!jobTitle || jobTitle.length < 2) {
    return errorResponse('Job title is required (at least 2 characters).');
  }
  if (!analysisId) {
    return errorResponse('analysisId is required.');
  }

  // ── Look up the analysis and its linked job from the DB ──────────────────
  // We JOIN analyses → jobs using the job_id foreign key.
  // Drizzle doesn't have a `.join()` on insert, but for SELECT we chain `.where()`.
  // Here we do two separate queries for clarity — a single JOIN would also work.
  let analysisResult: AnalysisResult;
  let jobDescription: string;

  try {
    // Fetch the analysis row by its primary key
    const analysisRow = await db
      .select()
      .from(analyses)
      .where(eq(analyses.analysisId, analysisId))
      .limit(1);

    if (analysisRow.length === 0) {
      return errorResponse('Analysis not found. Please run the resume analysis first.', 404);
    }

    // analyses.details is stored as JSONB — cast it to the expected type
    analysisResult = analysisRow[0].details as AnalysisResult;

    // Fetch the linked job to get its description
    const jobRow = await db
      .select()
      .from(jobs)
      .where(eq(jobs.jobId, analysisRow[0].jobId!))
      .limit(1);

    jobDescription = jobRow[0]?.jobDescription ?? '';
  } catch (dbErr) {
    console.error('[career-roadmap] DB lookup failed:', dbErr);
    return errorResponse('Failed to retrieve analysis from database.', 500);
  }

  // ── Run Step 1 (Reddit) and Step 2.5 (Resource Discovery) in parallel
  console.log('[career-roadmap] Step 1: Scraping Reddit…');

  const rawSkills = analysisResult.missingSkills.items
    .map((i) => i.point)
    .filter(Boolean);

  console.log('[career-roadmap] Step 2.5: Simplifying skills with Groq then discovering step-pinned resources via Tavily…');

  const simplifiedSkills = await simplifySkillsWithGroq(rawSkills.slice(0, 3));

  const resourceDiscoveryPipeline = () =>
    searchStepResourcesViaTavily(simplifiedSkills, jobTitle);

  const youtubePipeline = () =>
    searchYouTubeVideos(simplifiedSkills, jobTitle, 3);

  const [rawPosts, stepResources, youtubeVideos] = await Promise.all([
    scrapeReddit(jobTitle),
    resourceDiscoveryPipeline(),
    youtubePipeline(),
  ]);

  console.log(`[career-roadmap] Step 1 done: ${rawPosts.length} raw posts`);
  console.log(
    `[career-roadmap] Step 2.5 done: ${Object.values(stepResources).flat().length} step-pinned URLs, ${youtubeVideos.length} YouTube videos`,
  );

  let rankedPosts: ApifyPost[] = [];

  if (rawPosts.length > 0) {
    console.log('[career-roadmap] Step 2: HuggingFace semantic ranking…');
    const hfRanked = await rankByRelevance(rawPosts, jobTitle, jobDescription);

    const seenUrls = new Set<string>();
    const seenTitles = new Set<string>();
    rankedPosts = hfRanked.filter((p) => {
      if (!p.url) return false;
      const normTitle = (p.title ?? '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40);
      if (seenUrls.has(p.url) || seenTitles.has(normTitle)) return false;
      seenUrls.add(p.url);
      if (normTitle) seenTitles.add(normTitle);
      return true;
    });

    console.log(`[career-roadmap] Step 2 done: ${rankedPosts.length} unique posts (from ${hfRanked.length})`);
  }

  console.log('[career-roadmap] Step 3: Groq roadmap generation…');
  let roadmapParts: Omit<CareerRoadmap, 'jobTitle' | 'redditPostsUsed'>;

  try {
    const rawRoadmap = await generateRoadmapWithGroq(
      jobTitle,
      jobDescription,
      analysisResult,
      rankedPosts,
      stepResources,
    );

    console.log('[career-roadmap] Step 4: Deduplicating reference links…');
    roadmapParts = deduplicateReferenceLinks(rawRoadmap);
    console.log('[career-roadmap] Step 4 done ✓');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[career-roadmap] Groq error:', msg);
    const isRateLimit = msg.includes('429') || msg.includes('rate_limit');
    return errorResponse(
      isRateLimit
        ? 'AI rate limit reached. Please wait a moment and try again.'
        : 'Failed to generate career roadmap. Please try again.',
      isRateLimit ? 429 : 500,
    );
  }

  const roadmap: CareerRoadmap = {
    jobTitle,
    redditPostsUsed: rankedPosts.length,
    ...roadmapParts,
    youtubeVideos,
  };

  // ── Save the roadmap back into the same analyses row ─────────────────────
  // We UPDATE analyses SET roadmap_details = roadmap WHERE analysis_id = analysisId.
  // This keeps a 1:1 link: one analysis row always has at most one roadmap.
  try {
    await db
      .update(analyses)
      .set({ roadmapDetails: roadmap })
      .where(eq(analyses.analysisId, analysisId));

    console.log(`[db] Saved roadmap for analysis ${analysisId}`);
  } catch (dbErr) {
    // Non-blocking: roadmap is still returned even if DB save fails
    console.error('[db] Failed to save roadmap:', dbErr);
  }

  console.log('[career-roadmap] Done ✓');
  return NextResponse.json({ data: roadmap });
}
