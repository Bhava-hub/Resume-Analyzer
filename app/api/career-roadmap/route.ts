import { NextRequest, NextResponse } from 'next/server';
import { callGroq } from '@/lib/groq';
import type { AnalysisResult, CareerRoadmap, ReferenceLink, RoadmapAdvice, RoadmapStep, StepResource } from '@/types/analysis';

export const runtime = 'nodejs';
// Give the pipeline enough time (HF + Groq + Apify can chain to ~45s)
export const maxDuration = 60;

// ── Constants ────────────────────────────────────────────────────────────────

const APIFY_ENDPOINT =
  'https://api.apify.com/v2/acts/trudax~reddit-scraper-lite/run-sync-get-dataset-items';

const APIFY_GOOGLE_SEARCH_ENDPOINT =
  'https://api.apify.com/v2/acts/apify~google-search-scraper/run-sync-get-dataset-items';

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
 * Converts verbose resume-analysis skill gaps into simple, course-searchable
 * topic names using Groq (fast, free). Falls back to the original skill names
 * if Groq fails so the pipeline never breaks.
 *
 * e.g. "transformer-based NLP fine-tuning with LoRA" → "NLP"
 *      "Kubernetes pod orchestration with Helm charts" → "Kubernetes"
 */
async function simplifySkillsWithGroq(skills: string[]): Promise<string[]> {
  if (skills.length === 0) return [];

  const prompt = `You are a skill normalization engine for a course search system.

Your job is to map resume skill gaps to canonical search terms that return real results on Coursera and Udemy.

Rules:
- Output ONLY a valid JSON array of strings, one per input skill, in the same order.
- Max 2 words per output term. Strictly enforced.
- You MUST pick from the approved list below whenever possible.
- If the skill does not match anything in the approved list, output the single most recognizable root technology or tool name only (e.g. "Spark", "Tableau", "Airflow").
- Never output phrases like "Generation", "Analysis at scale", "Insight", "Management" alone — these are not searchable skills.
- Never output adjectives or verbs. Only nouns or noun phrases.

Approved list:
Python, SQL, Excel, Power BI, Tableau, Statistics, Machine Learning,
Deep Learning, NLP, Computer Vision, Data Analysis, Data Visualization,
Pandas, NumPy, Spark, Hadoop, Airflow, dbt, AWS, Azure, Google Cloud,
Docker, Kubernetes, React, Node.js, TypeScript, PostgreSQL, MongoDB,
Git, Linux, REST APIs, GraphQL, TensorFlow, PyTorch, Scikit-learn,
Business Intelligence, Data Engineering, Data Modeling, ETL, DevOps,
System Design, Algorithms, Cybersecurity, Networking, Agile

Examples:
"Business Insight Generation" → "Business Intelligence"
"Large-Scale Data Analysis" → "Data Analysis"
"Statistical Analysis" → "Statistics"
"transformer-based NLP fine-tuning with LoRA" → "NLP"
"Kubernetes pod orchestration with Helm charts" → "Kubernetes"
"CUDA GPU memory optimization" → "Deep Learning"
"distributed SQL with CockroachDB" → "SQL"

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

// ── Step 0b: Discover real course URLs via Apify Google Search ───────────────

interface GoogleSearchResult {
  url?: string;  // This is the Google search URL itself — NOT a course URL
  searchQuery?: { term?: string; query?: string } | string;
  query?: string;
  keyword?: string;
  // The actual result links live here
  organicResults?: Array<{ url?: string; title?: string; websiteTitle?: string }>;
}

/**
 * For each skill gap (up to maxSkills), runs a Google search via Apify targeting
 * real course pages on Coursera, Udemy, or freeCodeCamp. Returns a map of
 * skill → top result URL. Falls back gracefully — if Apify fails, returns {}.
 */
async function searchCoursesViaApify(
  skills: string[],
  maxSkills = 3,
): Promise<Record<string, string>> {
  const apifyToken = process.env.APIFY_API_TOKEN;
  if (!apifyToken || skills.length === 0) return {};

  const targetSkills = skills.slice(0, maxSkills);

  const queries = targetSkills.map(
    (skill) =>
      `best ${skill} course site:coursera.org OR site:udemy.com OR site:freecodecamp.org`,
  );

  console.log(
    `[apify-search] Searching courses for ${targetSkills.length} skills: ${targetSkills.join(', ')}`,
  );

  try {
    const res = await fetch(
      `${APIFY_GOOGLE_SEARCH_ENDPOINT}?token=${apifyToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queries: queries.join('\n'),
          resultsPerPage: 3,
          maxPagesPerQuery: 1,
          languageCode: 'en',
          countryCode: 'us',
          mobileResults: false,
        }),
      },
    );

    if (!res.ok) {
      const errBody = await res.text();
      console.warn(`[apify-search] HTTP ${res.status} — raw error body:`, errBody.slice(0, 500));
      return {};
    }

    const items: GoogleSearchResult[] = await res.json();
    console.log(
      `[apify-search] Raw response: ${items.length} items total. First 2:`,
      JSON.stringify(items.slice(0, 2), null, 2),
    );
    // Show all field names on the first item so we know which query field Apify used
    console.log('[apify-search] Sample item keys:', Object.keys(items[0] ?? {}));

    const courseUrlMap: Record<string, string> = {};
    const courseDomains = ['coursera.org', 'udemy.com', 'freecodecamp.org'];

    /** Extract the query string Apify attached to a result item, regardless of field name/shape */
    const getItemQuery = (item: GoogleSearchResult): string => {
      if (typeof item.searchQuery === 'string') return item.searchQuery;
      if (typeof item.searchQuery === 'object' && item.searchQuery !== null) {
        return item.searchQuery.term ?? item.searchQuery.query ?? '';
      }
      return item.query ?? item.keyword ?? '';
    };

    for (let i = 0; i < targetSkills.length; i++) {
      const skill = targetSkills[i];
      const query = queries[i];

      // Match by the searchQuery field Apify attaches — not by position
      const skillResults = items.filter(
        (item) => getItemQuery(item) === query,
      );

      console.log(`[apify-search] "${skill}" matched ${skillResults.length} page-level items by searchQuery`);

      // Dig into organicResults — item.url is the Google search URL, not a course URL
      const topResult = skillResults
        .flatMap((item) => item.organicResults ?? [])
        .find((result) => {
          if (!result.url) return false;
          try {
            const host = new URL(result.url).hostname.replace(/^www\./, '');
            return courseDomains.some((d) => host === d || host.endsWith('.' + d));
          } catch {
            return false;
          }
        });

      if (topResult?.url) {
        courseUrlMap[skill] = topResult.url;
        console.log(`[apify-search] ${skill} → ${topResult.url}`);
      } else {
        console.log(`[apify-search] No course URL found for skill: ${skill}`);
      }
    }

    console.log(
      `[apify-search] Found ${Object.keys(courseUrlMap).length} course URLs for ${targetSkills.length} skills`,
    );
    return courseUrlMap;
  } catch (err) {
    console.warn('[apify-search] Course search error (will use fallback):', err);
    return {};
  }
}

// ── Step 1: Scrape Reddit via Apify ─────────────────────────────────────────

async function scrapeReddit(jobTitle: string): Promise<ApifyPost[]> {
  const apifyToken = process.env.APIFY_API_TOKEN;
  if (!apifyToken) return [];

  const searches = [
    `${jobTitle} career advice`,
    `becoming a ${jobTitle}`,
    `${jobTitle} resume tips`,
  ];

  try {
    const res = await fetch(`${APIFY_ENDPOINT}?token=${apifyToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        searches,
        searchPosts: true,
        searchComments: false,
        searchCommunities: false,
        searchUsers: false,
        skipComments: true,
        sort: 'relevance',
        time: 'all',
        includeNSFW: false,
        maxItems: 25,
        maxPostCount: 9,
        scrollTimeout: 25,
        proxy: { useApifyProxy: true },
      }),
    });

    if (!res.ok) {
      console.warn('[reddit] HTTP error:', res.status, await res.text());
      return [];
    }

    const items: ApifyPost[] = await res.json();
    console.log('[reddit] Raw item count:', items.length);
    console.log('[reddit] First item keys:', Object.keys(items[0] ?? {}));
    console.log('[reddit] First item dataType:', items[0]?.dataType);
    return items.filter(
      (item) => item.dataType === 'post' && item.title && item.url,
    );
  } catch (err) {
    console.warn('[reddit] Scraper error:', err);
    return [];
  }
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
  discoveredCourseUrls: Record<string, string>,
) => {
  const hasCourseUrls = Object.keys(discoveredCourseUrls).length > 0;

  const courseUrlBlock = hasCourseUrls
    ? `IMPORTANT — Real verified course URLs found via live web search. You MUST use ONLY these URLs for course resources (do NOT invent or modify them):
${Object.entries(discoveredCourseUrls)
      .map(([skill, url]) => `- ${skill}: ${url}`)
      .join('\n')}`
    : '';

  const resourceRules = hasCourseUrls
    ? `- resources per step: For skills that have a verified URL in the list above, use EXACTLY that URL (copy it character-for-character). For any other resources, use ONLY the exact root-level URLs listed here:
  Courses/learning (fallback only): https://www.coursera.org, https://www.udemy.com, https://www.freecodecamp.org, https://www.edx.org, https://www.linkedin.com/learning, https://www.youtube.com, https://www.khanacademy.org, https://www.codecademy.com, https://frontendmasters.com, https://www.pluralsight.com
  Docs: https://developer.mozilla.org, https://docs.python.org, https://react.dev, https://nextjs.org/docs, https://docs.djangoproject.com, https://flask.palletsprojects.com, https://nodejs.org/en/docs, https://www.typescriptlang.org/docs, https://kubernetes.io/docs, https://docs.aws.amazon.com, https://cloud.google.com/docs, https://docs.microsoft.com
  GitHub/projects: https://github.com/sindresorhus/awesome, https://github.com/jwasham/coding-interview-university, https://github.com/kamranahmedse/developer-roadmap
  Community: https://stackoverflow.com, https://www.reddit.com, https://dev.to, https://hashnode.com`
    : `- resources per step: Include 1–3 resources for EACH step. Use ONLY the exact root-level URLs listed below — do NOT add any paths, slugs, or query strings:
  Courses/learning: https://www.coursera.org, https://www.udemy.com, https://www.freecodecamp.org, https://www.edx.org, https://www.linkedin.com/learning, https://www.youtube.com, https://www.khanacademy.org, https://www.codecademy.com, https://frontendmasters.com, https://www.pluralsight.com
  Docs: https://developer.mozilla.org, https://docs.python.org, https://react.dev, https://nextjs.org/docs, https://docs.djangoproject.com, https://flask.palletsprojects.com, https://nodejs.org/en/docs, https://www.typescriptlang.org/docs, https://kubernetes.io/docs, https://docs.aws.amazon.com, https://cloud.google.com/docs, https://docs.microsoft.com
  GitHub/projects: https://github.com/sindresorhus/awesome, https://github.com/jwasham/coding-interview-university, https://github.com/kamranahmedse/developer-roadmap
  Community: https://stackoverflow.com, https://www.reddit.com, https://dev.to, https://hashnode.com
  Use the URL EXACTLY as shown above. No trailing slashes, no sub-paths. These are the only valid values.`;

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

${courseUrlBlock}

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
          "label": "Coursera - Machine Learning Specialization (or similar real resource name)",
          "url": "https://www.coursera.org/specializations/machine-learning-introduction (or any real working URL)",
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
      "url": "Real, working URL",
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
- resources: EXACTLY 1 resource per step (not 3).
- resource label: max 6 words.
${resourceRules}
- advice: EXACTLY 3 tips. tip: max 8 words. reason: max 25 words.
- referenceLinks: EXACTLY 4 links.
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

  // Add top Reddit posts to referenceLinks
  for (const post of rawPosts.slice(0, 5)) {
    if (!post.url) continue;
    const alreadyAdded = parsed.referenceLinks.some((l) => l.url === post.url);
    if (!alreadyAdded) {
      parsed.referenceLinks.push({
        title: post.title ?? '',
        url: post.url,
        type: 'reddit',
        description: (post.body ?? '').slice(0, 120) || 'Reddit discussion',
        isReddit: true,
        subreddit: post.communityName ?? '',
        upVotes: post.upVotes ?? 0,
      });
    }
  }

  return parsed;
}

// ── URL normalization ────────────────────────────────────────────────────────

/**
 * Canonical map of allowed domains → their guaranteed-real root URL.
 *
 * Empty string '' means: drop this URL entirely (returns null from normalizeUrl).
 * This is used for course platforms — a root homepage like coursera.org is useless;
 * real course URLs only arrive via Apify-verified _verifiedCourseUrls and bypass this.
 * Docs and community sites keep their root URLs since those are genuinely useful.
 */
const DOMAIN_ROOT_MAP: Record<string, string> = {
  // Course platforms — DROP hallucinated paths ('' → null → filtered out)
  // Only Apify-verified URLs in _verifiedCourseUrls will ever show for these domains.
  'www.coursera.org': '',
  'coursera.org': '',
  'www.udemy.com': '',
  'udemy.com': '',
  'www.freecodecamp.org': '',
  'freecodecamp.org': '',
  'www.edx.org': '',
  'edx.org': '',
  'www.linkedin.com': '',
  'linkedin.com': '',
  'www.youtube.com': '',
  'youtube.com': '',
  'www.khanacademy.org': '',
  'khanacademy.org': '',
  'www.codecademy.com': '',
  'codecademy.com': '',
  'frontendmasters.com': '',
  'www.frontendmasters.com': '',
  'www.pluralsight.com': '',
  'pluralsight.com': '',
  // Docs — root URLs are genuinely useful landing pages, keep them
  'developer.mozilla.org': 'https://developer.mozilla.org',
  'docs.python.org': 'https://docs.python.org',
  'react.dev': 'https://react.dev',
  'www.react.dev': 'https://react.dev',
  'nextjs.org': 'https://nextjs.org/docs',
  'www.nextjs.org': 'https://nextjs.org/docs',
  'docs.djangoproject.com': 'https://docs.djangoproject.com',
  'flask.palletsprojects.com': 'https://flask.palletsprojects.com',
  'nodejs.org': 'https://nodejs.org/en/docs',
  'www.typescriptlang.org': 'https://www.typescriptlang.org/docs',
  'typescriptlang.org': 'https://www.typescriptlang.org/docs',
  'kubernetes.io': 'https://kubernetes.io/docs',
  'docs.aws.amazon.com': 'https://docs.aws.amazon.com',
  'cloud.google.com': 'https://cloud.google.com/docs',
  'docs.microsoft.com': 'https://docs.microsoft.com',
  'learn.microsoft.com': 'https://learn.microsoft.com',
  // Community — root URLs are useful browse/search hubs, keep them
  'stackoverflow.com': 'https://stackoverflow.com',
  'www.stackoverflow.com': 'https://stackoverflow.com',
  'dev.to': 'https://dev.to',
  'hashnode.com': 'https://hashnode.com',
  // GitHub: only the three known-good awesome-lists
  'github.com': '', // handled separately below
};

/** GitHub repos we explicitly allow — everything else collapses to github.com root. */
const ALLOWED_GITHUB_REPOS = new Set([
  'https://github.com/sindresorhus/awesome',
  'https://github.com/jwasham/coding-interview-university',
  'https://github.com/kamranahmedse/developer-roadmap',
]);

/**
 * Normalizes a single AI-generated URL:
 * - If it belongs to a known allowed domain → return the canonical root URL.
 * - If it's a GitHub URL → only allow the three whitelisted repos; else → https://github.com
 * - If it's a Reddit URL → return as-is (scraped, therefore real).
 * - Otherwise → return null (will be dropped).
 */
// Set of real URLs discovered by Apify — these bypass root-collapse normalization
let _verifiedCourseUrls: Set<string> = new Set();

function normalizeUrl(url: string, isReddit = false): string | null {
  if (isReddit) return url; // scraped Reddit URLs are real — keep them untouched

  // URLs verified by Apify web search are real — pass them through unchanged
  if (_verifiedCourseUrls.has(url)) return url;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;

  const host = parsed.hostname.toLowerCase();

  // Reddit links passed through a non-isReddit path (e.g. in referenceLinks)
  if (host === 'www.reddit.com' || host === 'reddit.com') return url;

  // GitHub — only whitelist specific repos
  if (host === 'github.com') {
    const withoutTrailing = url.replace(/\/$/, '');
    // Match any of the allowed repos (allow sub-paths within them)
    for (const allowed of ALLOWED_GITHUB_REPOS) {
      if (withoutTrailing.startsWith(allowed)) return allowed;
    }
    return 'https://github.com';
  }

  const root = DOMAIN_ROOT_MAP[host];
  if (root !== undefined) return root || null;

  // Unknown domain — drop it
  return null;
}

/**
 * Walks the entire roadmap and normalizes every AI-generated URL back to a
 * guaranteed-real root. Hallucinated deep paths are collapsed; unknown domains
 * are removed. Reddit URLs (scraped, therefore real) pass through unchanged.
 */
function normalizeRoadmapUrls(
  roadmap: Omit<CareerRoadmap, 'jobTitle' | 'redditPostsUsed'>,
): Omit<CareerRoadmap, 'jobTitle' | 'redditPostsUsed'> {
  const cleanedPlan = roadmap.entrancePlan.map((step) => ({
    ...step,
    redditUrl: step.redditUrl ? normalizeUrl(step.redditUrl, true) ?? undefined : undefined,
    resources: (step.resources ?? [])
      .map((r: StepResource) => {
        const normalized = normalizeUrl(r.url);
        return normalized ? { ...r, url: normalized } : null;
      })
      .filter((r): r is StepResource => r !== null),
  }));

  const cleanedAdvice = roadmap.advice.map((item) => ({
    ...item,
    redditUrl: item.redditUrl ? normalizeUrl(item.redditUrl, true) ?? undefined : undefined,
  }));

  const cleanedRefs = roadmap.referenceLinks
    .map((l) => {
      const normalized = normalizeUrl(l.url, l.isReddit);
      return normalized ? { ...l, url: normalized } : null;
    })
    .filter((l): l is NonNullable<typeof l> => l !== null);

  // Deduplicate referenceLinks by URL (normalization can create duplicates)
  const seenUrls = new Set<string>();
  const dedupedRefs = cleanedRefs.filter((l) => {
    if (seenUrls.has(l.url)) return false;
    seenUrls.add(l.url);
    return true;
  });

  const count = {
    plan: roadmap.entrancePlan.reduce((n, s) => n + (s.resources?.length ?? 0), 0),
    cleaned: cleanedPlan.reduce((n, s) => n + (s.resources?.length ?? 0), 0),
  };
  console.log(
    `[career-roadmap] URL normalization: ${count.cleaned}/${count.plan} resources kept, ` +
    `${dedupedRefs.length}/${roadmap.referenceLinks.length} referenceLinks kept`,
  );

  return {
    ...roadmap,
    entrancePlan: cleanedPlan,
    advice: cleanedAdvice,
    referenceLinks: dedupedRefs,
  };
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

  // ── Run Step 1 (Reddit) and Step 2.5 (Course Discovery) in parallel
  // Reddit scraping starts immediately; skill simplification + Apify search
  // chain sequentially but run concurrently with Reddit to avoid extra latency.
  console.log('[career-roadmap] Step 1: Scraping Reddit…');

  const rawSkills = analysisResult.missingSkills.items
    .map((i) => i.point)
    .filter(Boolean);

  console.log('[career-roadmap] Step 2.5: Simplifying skill names with Groq then discovering course URLs via Apify…');

  // course discovery pipeline: simplify → search (sequential internally)
  const courseDiscoveryPipeline = async () => {
    const simplifiedSkills = await simplifySkillsWithGroq(rawSkills.slice(0, 3));
    return searchCoursesViaApify(simplifiedSkills, 3);
  };

  // Reddit + course discovery run in parallel
  const [rawPosts, discoveredCourseUrls] = await Promise.all([
    scrapeReddit(jobTitle),
    courseDiscoveryPipeline(),
  ]);

  console.log(`[career-roadmap] Step 1 done: ${rawPosts.length} raw posts`);
  console.log(
    `[career-roadmap] Step 2.5 done: ${Object.keys(discoveredCourseUrls).length} course URLs discovered`,
  );

  // Populate the verified URL set so normalizeUrl() passes them through
  _verifiedCourseUrls = new Set(Object.values(discoveredCourseUrls));

  // ── Steps 2 & 3: HuggingFace semantic ranking (no separate Groq extract — saves one call)
  let rankedPosts: ApifyPost[] = [];

  if (rawPosts.length > 0) {
    console.log('[career-roadmap] Step 2: HuggingFace semantic ranking…');
    rankedPosts = await rankByRelevance(rawPosts, jobTitle, jobDescription);
    console.log(`[career-roadmap] Step 2 done: ${rankedPosts.length} relevant posts`);
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
      discoveredCourseUrls,
    );

    // ── Step 4: Normalize URLs — collapse hallucinated paths to real roots
    console.log('[career-roadmap] Step 4: Normalizing resource URLs…');
    roadmapParts = normalizeRoadmapUrls(rawRoadmap);
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
