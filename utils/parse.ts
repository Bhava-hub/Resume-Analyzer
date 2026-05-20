import type { AnalysisItem, AnalysisResult, AnalysisSection } from '@/types/analysis';

const SECTION_PATTERNS: Record<keyof AnalysisResult, RegExp> = {
  missingSkills: /1\)\s*Missing Skills?\s*[-:]?\s*/i,
  experienceGaps: /2\)\s*Experience\s*Gaps?\s*[-:]?\s*/i,
  keywordMismatches: /3\)\s*Keyword\s*Mismatches?\s*[-:]?\s*/i,
  actionPlan: /4\)\s*Action\s*Plan\s*[-:]?\s*/i,
};

const SECTION_ORDER: (keyof AnalysisResult)[] = [
  'missingSkills',
  'experienceGaps',
  'keywordMismatches',
  'actionPlan',
];

const SECTION_TITLES: Record<keyof AnalysisResult, string> = {
  missingSkills: 'Missing Skills',
  experienceGaps: 'Experience Gaps',
  keywordMismatches: 'Keyword Mismatches',
  actionPlan: 'Action Plan',
};

function parseItems(raw: string): AnalysisItem[] {
  const lines = raw
    .split('\n')
    .map((l) => l.replace(/^[-*•·]\s*/, '').trim())
    .filter(Boolean);

  const items: AnalysisItem[] = [];

  for (const line of lines) {
    // Lines with a colon split into point + explanation
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0 && colonIdx < line.length - 1) {
      items.push({
        point: line.slice(0, colonIdx).trim(),
        explanation: line.slice(colonIdx + 1).trim(),
      });
    } else {
      items.push({ point: line });
    }
  }

  return items;
}

function buildSection(title: string, raw: string): AnalysisSection {
  return { title, items: parseItems(raw) };
}

export function parseAnalysisResponse(raw: string): AnalysisResult {
  // Find start index of each section
  const indices: Partial<Record<keyof AnalysisResult, number>> = {};

  for (const key of SECTION_ORDER) {
    const match = SECTION_PATTERNS[key].exec(raw);
    if (match) indices[key] = match.index + match[0].length;
  }

  // Extract text between consecutive section starts
  const sections: Partial<AnalysisResult> = {};

  for (let i = 0; i < SECTION_ORDER.length; i++) {
    const key = SECTION_ORDER[i];
    const start = indices[key];
    if (start === undefined) {
      sections[key] = buildSection(SECTION_TITLES[key], '');
      continue;
    }

    // Find the next known section start to determine end boundary
    let end = raw.length;
    for (let j = i + 1; j < SECTION_ORDER.length; j++) {
      const nextKey = SECTION_ORDER[j];
      const nextMatch = SECTION_PATTERNS[nextKey].exec(raw);
      if (nextMatch && nextMatch.index > start) {
        end = nextMatch.index;
        break;
      }
    }

    sections[key] = buildSection(SECTION_TITLES[key], raw.slice(start, end).trim());
  }

  return {
    missingSkills: sections.missingSkills!,
    experienceGaps: sections.experienceGaps!,
    keywordMismatches: sections.keywordMismatches!,
    actionPlan: sections.actionPlan!,
  };
}
