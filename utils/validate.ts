export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export const JD_MIN = 100;
export const JD_MAX = 4000;
export const PDF_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
export const RESUME_TEXT_MAX = 12000;

export function validateJobDescription(jd: string): ValidationResult {
  const trimmed = jd.trim();
  if (!trimmed) return { valid: false, error: 'Job description is required.' };
  if (trimmed.length < JD_MIN)
    return {
      valid: false,
      error: `Job description must be at least ${JD_MIN} characters.`,
    };
  if (trimmed.length > JD_MAX)
    return {
      valid: false,
      error: `Job description must be under ${JD_MAX} characters.`,
    };
  return { valid: true };
}

export function validatePdfFile(file: File): ValidationResult {
  if (!file) return { valid: false, error: 'Please upload your resume as a PDF.' };
  if (file.type !== 'application/pdf')
    return { valid: false, error: 'Only PDF files are accepted.' };
  if (file.size > PDF_MAX_BYTES)
    return { valid: false, error: 'PDF must be under 5 MB.' };
  return { valid: true };
}

export function validateResumeText(text: string): ValidationResult {
  if (!text || text.trim().length < 50)
    return {
      valid: false,
      error:
        'Could not extract readable text from this PDF. It may be image-based or scanned. Please use a text-based PDF.',
    };
  return { valid: true };
}
