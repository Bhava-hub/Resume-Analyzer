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
import { createHash } from 'crypto';   // Node.js built-in — no install needed
import { db } from '@/lib/db';
import { sessions, resumes, jobs, analyses } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';
export const maxDuration = 60; // Vercel: extend timeout to 60s (Hobby plan max)

function errorResponse(message: string, code: AnalysisError['code'], status = 400) {
  return NextResponse.json({ error: { message, code } }, { status });
}

const PROMPT_TEMPLATE = (resumeText: string, jobDescription: string) => `
You are a brutally honest hiring manager with 10 years of experience who has reviewed thousands of resumes. You have just received this resume for this specific role and you are deciding in 30 seconds whether to reject it.

You MUST respond with ONLY valid JSON — no markdown, no code fences, no explanation outside the JSON.

CRITICAL RULES — violating any of these makes your response useless:
- NEVER restate the job description back to the user. They already read it.
- NEVER say generic things like "the job requires X" or "the JD mentions Y". That adds zero value.
- EVERY point must reference something SPECIFIC from the resume by name — a project, a tool they listed, a job title, a course they took.
- Compare what the candidate HAS against what the role NEEDS and explain the exact gap between those two things.
- For actionPlan, never say "add keyword X to section Y". Instead give a specific action: a course name, a project to build, a tool to learn, with a realistic timeline.
- If the resume has no relevant experience at all for a skill, say that directly and harshly.
- Minimum 3 items per array, maximum 5.

The JSON must follow this exact schema:
{
  "missingSkills": [
    { 
      "point": "skill name", 
      "explanation": "Reference what the candidate has, then explain exactly why it falls short for this role. Example: candidate lists Python but this role needs MATLAB for signal processing — these are not interchangeable and the candidate cannot bluff through a technical interview with Python alone." 
    }
  ],
  "experienceGaps": [
    { 
      "point": "gap title", 
      "explanation": "Name the specific experience the candidate is missing, reference their closest related experience from the resume, and explain precisely why that falls short. Be harsh but fair." 
    }
  ],
  "keywordMismatches": [
    { 
      "point": "exact keyword from JD", 
      "explanation": "State exactly where this keyword appears in the JD, confirm it is absent from the resume, and explain what that signals to an ATS and to a human reviewer." 
    }
  ],
  "actionPlan": [
    { 
      "point": "specific action title", 
      "explanation": "Give one concrete action: name a specific course on Coursera or edX, a specific type of project to build with estimated time, or a specific tool to learn. Then explain exactly how to reflect this on the resume — which section, what the bullet point should demonstrate, not just say." 
    }
  ]
}

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

  // ── Save to database (non-blocking: a DB failure won't break the response) ──
  let sessionId: string | null = null;
  let analysisId: string | null = null;

  try {
    // 1. Create a session row.
    const [session] = await db.insert(sessions).values({}).returning();
    sessionId = session.sessionId;

    // 2. Hash the resume text to detect duplicates.
    //    SHA-256 is fast, deterministic, and collision-resistant enough for this.
    //    Same resume content will always produce the same 64-char hex string.
    const contentHash = createHash('sha256').update(cleanResume).digest('hex');

    // 3. Try to insert the resume. If the same hash already exists (UNIQUE constraint),
    //    the insert is silently skipped via onConflictDoNothing().
    await db
      .insert(resumes)
      .values({
        sessionId,
        filename: file.name,
        rawText: cleanResume,
        contentHash,
      })
      .onConflictDoNothing();  // skip if contentHash already exists

    // 4. Look up the resume by hash — works whether we just inserted it or it already existed.
    const [resume] = await db
      .select()
      .from(resumes)
      .where(eq(resumes.contentHash, contentHash))
      .limit(1);

    // 5. Save the job description.
    const [job] = await db
      .insert(jobs)
      .values({ jobDescription: cleanJd })
      .returning();

    // 6. Save the analysis result as JSONB, linked to session + resume + job.
    const [analysis] = await db
      .insert(analyses)
      .values({
        sessionId,
        resumeId: resume.resumeId,
        jobId: job.jobId,
        details: analysisResult,
      })
      .returning();

    analysisId = analysis.analysisId;
    console.log(`[db] Saved analysis ${analysisId} (resume hash: ${contentHash.slice(0, 8)}…)`);
  } catch (dbErr) {
    // DB errors are logged but don't fail the request — the user still gets their result.
    console.error('[db] Failed to save analysis:', dbErr);
  }

  return NextResponse.json({
    data: analysisResult,
    // Return these IDs so the frontend can pass them to /api/career-roadmap
    sessionId,
    analysisId,
  });
}
