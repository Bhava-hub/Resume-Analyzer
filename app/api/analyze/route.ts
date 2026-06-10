import { NextRequest, NextResponse } from 'next/server';
// NOTE: pdf-parse is dynamically imported to avoid its module-load side-effects
// crashing the serverless function before any request is processed.
import { callGroq } from '@/lib/groq';
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
export const maxDuration = 60; // Vercel: extend timeout to 60s (Hobby plan max)

function errorResponse(message: string, code: AnalysisError['code'], status = 400) {
  return NextResponse.json({ error: { message, code } }, { status });
}

const PROMPT_TEMPLATE = (resumeText: string, jobDescription: string) => `
You are a brutal but helpful hiring manager with 10 years of experience.

Analyze this resume against the job description below.

You MUST respond with ONLY valid JSON — no markdown, no code fences, no explanation outside the JSON.

The JSON must follow this exact schema:
{
  "missingSkills": [
    { "point": "skill name", "explanation": "why it matters for this role" }
  ],
  "experienceGaps": [
    { "point": "gap description", "explanation": "what the JD demands that the resume lacks" }
  ],
  "keywordMismatches": [
    { "point": "exact keyword from JD", "explanation": "context — where it appears in the JD" }
  ],
  "actionPlan": [
    { "point": "concrete action", "explanation": "exact keyword to add and exact resume section to add it in" }
  ]
}

Rules:
- Every array must have at least one item.
- Be brutally specific — tailor every point to this exact JD.
- Never say 'add more keywords' or give generic advice.
- All values must be plain text — no markdown, no bullet symbols, no asterisks.

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

  // Extract text from PDF — dynamic import avoids module-load side-effects in serverless
  let resumeText: string;
  try {
    const pdfParse = (await import('pdf-parse')).default;
    const result = await pdfParse(buffer);
    resumeText = result.text.trim();
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

  // Call Groq
  let rawResponse: string;
  try {
    rawResponse = await callGroq(
      [
        {
          role: 'system',
          content: 'You are a brutal but helpful hiring manager. You always respond with valid JSON only. No markdown, no code fences, no explanation.',
        },
        { role: 'user', content: PROMPT_TEMPLATE(cleanResume, cleanJd) },
      ],
      { model: 'llama-3.3-70b-versatile', temperature: 0.2, maxTokens: 2048 },
    );
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('[Groq error]', errMsg);
    const isRateLimit = errMsg.includes('429') || errMsg.includes('rate_limit');
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

  // Strip markdown code fences if Groq wraps the JSON in ```json ... ```
  const stripped = rawResponse
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/, '')
    .trim();

  // Parse structured response
  let analysisResult;
  try {
    analysisResult = parseAnalysisResponse(stripped);
  } catch {
    return errorResponse(
      'Failed to parse the AI response. Please try again.',
      'PARSE_ERROR',
      500,
    );
  }

  return NextResponse.json({ data: analysisResult });
}
