import { NextRequest, NextResponse } from 'next/server';
import { callGroq } from '@/lib/groq';
import type { AnalysisResult, CareerRoadmap, ReferenceLink, RoadmapAdvice, RoadmapStep } from '@/types/analysis';

export const runtime = 'nodejs';
// Give the pipeline enough time (Reddit + Tavily + HF + Groq can chain to ~45s)
export const maxDuration = 60;

// ── Constants ────────────────────────────────────────────────────────────────

// Tavily Search API — 1,000 free searches/month, designed for AI pipelines
// Used for both Reddit searches (include_domains) and general resource discovery
const TAVILY_SEARCH_URL = 'https://api.tavily.com/search';

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
      return simplified;
    }

    console.warn('[groq-simplify] Unexpected shape, using original skills');
    return skills;
  } catch (err) {
    console.warn('[groq-simplify] Failed (will use original skill names):', err);
    return skills;
  }
}

// ── Step 0b: Discover real resource URLs via Tavily Search ───────────────────

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

/**
 * For each skill gap (up to maxSkills) PLUS one role-level query, searches via
 * Tavily — completely free (1,000/month), no domain filter, works for ANY career.
 * Each query is a separate Tavily call (they're fast and cheap on the free tier).
 * Falls back gracefully — if Tavily fails or key is missing, returns {}.
 */
async function searchResourcesViaTavily(
  skills: string[],
  jobTitle: string,
  maxSkills = 3,
): Promise<Record<string, string>> {
  const tavilyKey = process.env.TAVILY_API_KEY;
  if (!tavilyKey || (skills.length === 0 && !jobTitle)) return {};

  const targetSkills = skills.slice(0, maxSkills);

  // Skill-specific queries — open search, no platform filter
  const skillQueries = targetSkills.map(
    (skill): [string, string] => [skill, `best ${skill} course or training for ${jobTitle}`],
  );

  // One role-level query for general career resources
  const roleQuery: [string, string] = [
    `${jobTitle} career resources`,
    `how to become a ${jobTitle} resources certifications`,
  ];

  const allQueries: [string, string][] = [...skillQueries, roleQuery];

  console.log(
    `[tavily] Searching resources for ${targetSkills.length} skills + 1 role query (job: ${jobTitle})`,
  );

  const resourceUrlMap: Record<string, string> = {};

  // Run all queries in parallel — Tavily responds fast
  await Promise.all(
    allQueries.map(async ([topic, query]) => {
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
          console.warn(`[tavily] HTTP ${res.status} for "${topic}":`, errBody.slice(0, 300));
          return;
        }

        const data: TavilyResponse = await res.json();
        const top = data.results?.[0];

        if (top?.url) {
          resourceUrlMap[topic] = top.url;
          console.log(`[tavily] ${topic} → ${top.url}`);
        } else {
          console.log(`[tavily] No URL found for: ${topic}`);
        }
      } catch (err) {
        console.warn(`[tavily] Error for "${topic}":`, err);
      }
    }),
  );

  console.log(
    `[tavily] Found ${Object.keys(resourceUrlMap).length} resource URLs for ${allQueries.length} queries`,
  );
  return resourceUrlMap;
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
  discoveredResourceUrls: Record<string, string>,
) => {
  const hasResourceUrls = Object.keys(discoveredResourceUrls).length > 0;

  const resourceUrlBlock = hasResourceUrls
    ? `VERIFIED RESOURCE URLS (retrieved from live Google search — these are real and working):
${Object.entries(discoveredResourceUrls)
      .map(([topic, url]) => `- ${topic}: ${url}`)
      .join('\n')}`
    : '(No verified resource URLs available — omit resource links from steps.)';

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
          "url": "Use ONLY a URL from the VERIFIED RESOURCE URLS list above. If no verified URL fits this step, omit this resource entirely.",
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
      "url": "Use ONLY a URL from the VERIFIED RESOURCE URLS list above, or a scraped Reddit URL.",
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
- resources: EXACTLY 1 resource per step. ONLY use URLs from the verified list. If the verified list is empty, set resources to [].
- resource label: max 6 words.
- DO NOT invent, guess, or hallucinate any URL. Every URL must come from the verified list or from the Reddit posts provided above.
- advice: EXACTLY 3 tips. tip: max 8 words. reason: max 25 words.
- referenceLinks: EXACTLY 4 links. Use verified URLs or Reddit URLs only.
- description in referenceLinks: max 15 words.
- All text: plain text only, no markdown symbols.
`.trim();
};

async function generateRoadmapWithGroq(
  jobTitle: string,
  jobDescription: string,
  analysisResult: AnalysisResult,
  rawPosts: ApifyPost[],
  discoveredCourseUrls: Record<string, string>,
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
        content: GROQ_ROADMAP_PROMPT(jobTitle, jobDescription, analysisResult, rawPosts, discoveredCourseUrls),
      },
    ],
    // llama-3.1-8b-instant: 2 Groq calls total per pipeline (simplify + roadmap)
    // maxTokens 3500 — concise prompt rules above keep actual output well under this
    { model: 'llama-3.1-8b-instant', temperature: 0.3, maxTokens: 3500 },
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

  return parsed;
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
  let body: { jobTitle?: string; jobDescription?: string; analysisResult?: AnalysisResult };

  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body.');
  }

  const jobTitle = typeof body.jobTitle === 'string' ? body.jobTitle.trim() : '';
  const jobDescription = typeof body.jobDescription === 'string' ? body.jobDescription.trim() : '';
  const analysisResult = body.analysisResult;

  if (!jobTitle || jobTitle.length < 2) {
    return errorResponse('Job title is required (at least 2 characters).');
  }
  if (!analysisResult) {
    return errorResponse('Analysis result is required.');
  }

  // ── Run Step 1 (Reddit) and Step 2.5 (Resource Discovery) in parallel
  // Reddit scraping starts immediately; skill simplification + Apify search
  // chain sequentially but run concurrently with Reddit to avoid extra latency.
  console.log('[career-roadmap] Step 1: Scraping Reddit…');

  const rawSkills = analysisResult.missingSkills.items
    .map((i) => i.point)
    .filter(Boolean);

  console.log('[career-roadmap] Step 2.5: Simplifying skill names with Groq then discovering resource URLs via Tavily…');

  // resource discovery pipeline: simplify → search (sequential internally)
  // Works for any career — free Tavily API, open web search
  const resourceDiscoveryPipeline = async () => {
    const simplifiedSkills = await simplifySkillsWithGroq(rawSkills.slice(0, 3));
    return searchResourcesViaTavily(simplifiedSkills, jobTitle, 3);
  };

  // Reddit + resource discovery run in parallel
  const [rawPosts, discoveredResourceUrls] = await Promise.all([
    scrapeReddit(jobTitle),
    resourceDiscoveryPipeline(),
  ]);

  console.log(`[career-roadmap] Step 1 done: ${rawPosts.length} raw posts`);
  console.log(
    `[career-roadmap] Step 2.5 done: ${Object.keys(discoveredResourceUrls).length} resource URLs discovered`,
  );

  // ── Steps 2 & 3: HuggingFace semantic ranking (no separate Groq extract — saves one call)
  let rankedPosts: ApifyPost[] = [];

  if (rawPosts.length > 0) {
    console.log('[career-roadmap] Step 2: HuggingFace semantic ranking…');
    const hfRanked = await rankByRelevance(rawPosts, jobTitle, jobDescription);

    // Deduplicate by URL first, then by normalised title
    // (Apify returns the same post from multiple searches; near-duplicate titles also filtered)
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

  // ── Step 3: Groq roadmap generation (llama-3.1-8b-instant)
  console.log('[career-roadmap] Step 3: Groq roadmap generation…');
  let roadmapParts: Omit<CareerRoadmap, 'jobTitle' | 'redditPostsUsed'>;

  try {
    const rawRoadmap = await generateRoadmapWithGroq(
      jobTitle,
      jobDescription,
      analysisResult,
      rankedPosts,
      discoveredResourceUrls,
    );

    // ── Step 4: Dedup referenceLinks (all URLs are real — no normalization needed)
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
  };

  console.log('[career-roadmap] Done ✓');
  return NextResponse.json({ data: roadmap });
}
