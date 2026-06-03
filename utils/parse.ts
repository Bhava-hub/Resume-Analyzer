import type { AnalysisItem, AnalysisResult, AnalysisSection } from '@/types/analysis';

const SECTION_TITLES: Record<keyof AnalysisResult, string> = {
  missingSkills: 'Missing Skills',
  experienceGaps: 'Experience Gaps',
  keywordMismatches: 'Keyword Mismatches',
  actionPlan: 'Action Plan',
};

/** Strip common markdown artifacts that might leak through despite the prompt. */
function cleanText(text: unknown): string {
  if (typeof text !== 'string') return String(text ?? '');
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1') // **bold**
    .replace(/\*(.*?)\*/g, '$1')     // *italic*
    .replace(/`(.*?)`/g, '$1')       // `code`
    .replace(/^[-*•·]\s+/, '')       // leading bullet
    .trim();
}

function toItems(arr: unknown): AnalysisItem[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const i = item as Record<string, unknown>;
      const point = cleanText(i['point'] ?? i['skill'] ?? i['gap'] ?? i['keyword'] ?? i['action'] ?? '');
      const explanation = i['explanation'] != null ? cleanText(i['explanation']) : undefined;
      return { point, ...(explanation ? { explanation } : {}) };
    })
    .filter((item) => item.point.length > 0);
}

function buildSection(key: keyof AnalysisResult, items: AnalysisItem[]): AnalysisSection {
  return { title: SECTION_TITLES[key], items };
}

export function parseAnalysisResponse(raw: string): AnalysisResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    // If JSON.parse fails, attempt to extract a JSON object from the string
    // (handles cases where Gemini prepends/appends extra text)
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Response does not contain valid JSON');
    }
    parsed = JSON.parse(jsonMatch[0]);
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Parsed JSON is not an object');
  }

  const obj = parsed as Record<string, unknown>;

  return {
    missingSkills: buildSection('missingSkills', toItems(obj['missingSkills'])),
    experienceGaps: buildSection('experienceGaps', toItems(obj['experienceGaps'])),
    keywordMismatches: buildSection('keywordMismatches', toItems(obj['keywordMismatches'])),
    actionPlan: buildSection('actionPlan', toItems(obj['actionPlan'])),
  };
}
