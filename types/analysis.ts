export interface AnalysisItem {
  point: string;
  explanation?: string;
}

export interface AnalysisSection {
  title: string;
  items: AnalysisItem[];
}

export interface AnalysisResult {
  missingSkills: AnalysisSection;
  experienceGaps: AnalysisSection;
  keywordMismatches: AnalysisSection;
  actionPlan: AnalysisSection;
}

export interface AnalysisError {
  message: string;
  code:
    | 'VALIDATION_ERROR'
    | 'API_ERROR'
    | 'PARSE_ERROR'
    | 'RATE_LIMIT'
    | 'PDF_ERROR'
    | 'UNKNOWN';
}

export type AnalysisStatus = 'idle' | 'loading' | 'success' | 'error';

// ── Reddit Stories (kept for reference, replaced by CareerRoadmap) ────────────

export interface RedditStory {
  title: string;
  summary: string;
  url: string;
  upVotes: number;
  communityName: string;
  category: 'how-they-got-in' | 'advice';
  /** ISO-8601 date string when the post was created (from Apify) */
  postedAt?: string;
}

export interface RedditStoriesResult {
  jobTitle: string;
  stories: RedditStory[];
}

export type RedditStatus = 'idle' | 'loading' | 'success' | 'error';

// ── Career Roadmap ────────────────────────────────────────────────────────────

export interface StepResource {
  label: string;
  url: string;
  type: 'course' | 'docs' | 'github' | 'article' | 'other' | 'youtube';
}

export interface RoadmapStep {
  step: number;
  action: string;            // Short headline: "Build a portfolio project with Pandas"
  detail: string;            // Longer explanation of exactly what to do
  redditEvidence?: string;   // Quote or paraphrase from a Reddit post
  redditUrl?: string;        // Link to that post
  resources?: StepResource[];
}

export interface RoadmapAdvice {
  tip: string;               // Short advice headline
  reason: string;            // Why this matters for their specific gaps
  redditEvidence?: string;   // Quote from Reddit
  redditUrl?: string;
}

export type ReferenceLinkType = 'course' | 'docs' | 'community' | 'github' | 'article' | 'reddit' | 'youtube';

export interface ReferenceLink {
  title: string;
  url: string;
  type: ReferenceLinkType;
  description: string;       // 1-sentence why this is relevant
  isReddit: boolean;
  // Optional rich Reddit fields for detailed story display
  subreddit?: string;
  category?: 'entry-story' | 'advice' | 'both';
  keyActions?: string[];
  backgroundContext?: string;
  upVotes?: number;
}

// ── YouTube Videos ───────────────────────────────────────────────────────────

export interface YouTubeVideo {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  url: string;              // https://www.youtube.com/watch?v={videoId}
  viewCount: number;
  publishedAt: string;      // ISO-8601
  /** The skill/topic this video was searched for — used as section heading */
  topic: string;
}

export interface CareerRoadmap {
  jobTitle: string;
  entrancePlan: RoadmapStep[];
  advice: RoadmapAdvice[];
  referenceLinks: ReferenceLink[];
  youtubeVideos: YouTubeVideo[];   // Role-specific YouTube tutorials, sorted by recency + views
  redditPostsUsed: number;         // how many Reddit posts informed this roadmap
}

export type CareerRoadmapStatus = 'idle' | 'loading' | 'success' | 'error';
