import { NextRequest, NextResponse } from 'next/server';
import { PDFParse } from 'pdf-parse';
import { getGeminiModel } from '@/lib/gemini';
import { sanitizeText } from '@/utils/sanitize';
import {
  validateJobDescription,
  validatePdfFile,
  validateResumeText,
  PDF_MAX_BYTES,
  RESUME_TEXT_MAX,
} from '@/utils/validate';
import { parseAnalysisResponse } from '@/utils/parse';
import type { AnalysisError } from '@/types/analysis';

export const runtime = 'nodejs';

function errorResponse(message: string, code: AnalysisError['code'], status = 400) {
  return NextResponse.json({ error: { message, code } }, { status });
}

const PROMPT_TEMPLATE = (resumeText: string, jobDescription: string) => `
You are a brutal but helpful hiring manager with 10 years of experience.

Analyze this resume against this job description.

Return a structured analysis with EXACTLY these four sections:

1) Missing Skills
- list each missing skill
- explain why it matters for this specific role

2) Experience Gaps
- specific experiences the resume lacks that the JD demands

3) Keyword Mismatches
- exact keywords in the JD absent from the resume

4) Action Plan
- for each gap:
  - one concrete actionable fix
  - achievable in under 4 weeks
  - specify EXACT keyword to add
  - specify EXACT section where it should be added

Rules:
- Be brutally specific
- Never say 'add more keywords'
- Never give generic advice
- Always tailor feedback to the JD

---RESUME---
${resumeText}

---JOB DESCRIPTION---
${jobDescription}
`.trim();

export async function POST(request: NextRequest) {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return errorResponse('Invalid request format. Expected multipart/form-data.', 'VALIDATION_ERROR');
  }

  const file = formData.get('file');
  const jobDescription = formData.get('jobDescription');

  if (!(file instanceof File)) {
    return errorResponse('Resume PDF is required.', 'VALIDATION_ERROR');
  }
  if (typeof jobDescription !== 'string') {
    return errorResponse('Job description is required.', 'VALIDATION_ERROR');
  }

  // Server-side file validation
  const fileValidation = validatePdfFile(file);
  if (!fileValidation.valid) {
    return errorResponse(fileValidation.error!, 'VALIDATION_ERROR');
  }

  // Server-side JD validation
  const jdValidation = validateJobDescription(jobDescription);
  if (!jdValidation.valid) {
    return errorResponse(jdValidation.error!, 'VALIDATION_ERROR');
  }

  // Guard against oversized uploads at buffer level too
  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.byteLength > PDF_MAX_BYTES) {
    return errorResponse('PDF must be under 5 MB.', 'VALIDATION_ERROR');
  }

  // Extract text from PDF using pdf-parse v2 class API
  let resumeText: string;
  try {
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText();
    resumeText = result.text.trim();
    await parser.destroy();
  } catch {
    return errorResponse(
      'Failed to read the PDF. The file may be corrupted.',
      'PDF_ERROR',
    );
  }

  // Validate extracted text (catches scanned/image PDFs)
  const textValidation = validateResumeText(resumeText);
  if (!textValidation.valid) {
    return errorResponse(textValidation.error!, 'PDF_ERROR');
  }

  // Sanitize both inputs
  const cleanResume = sanitizeText(resumeText, RESUME_TEXT_MAX);
  const cleanJd = sanitizeText(jobDescription, 4000);

  // Call Gemini
  let rawResponse: string;
  try {
    const result = await getGeminiModel().generateContent(PROMPT_TEMPLATE(cleanResume, cleanJd));
    rawResponse = result.response.text();
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('[Gemini error]', errMsg);
    const isRateLimit = errMsg.toLowerCase().includes('429');
    if (isRateLimit) {
      return errorResponse(
        'Rate limit reached. Please wait a moment and try again.',
        'RATE_LIMIT',
        429,
      );
    }
    return errorResponse(
      'The AI service is temporarily unavailable. Please try again.',
      'API_ERROR',
      502,
    );
  }

  // Parse structured response
  let analysisResult;
  try {
    analysisResult = parseAnalysisResponse(rawResponse);
  } catch {
    return errorResponse(
      'Failed to parse the AI response. Please try again.',
      'PARSE_ERROR',
      500,
    );
  }

  return NextResponse.json({ data: analysisResult });
}
