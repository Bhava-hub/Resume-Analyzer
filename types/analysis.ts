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
