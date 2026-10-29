
// Groq API helper — uses OpenAI-compatible REST endpoint

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'openai/gpt-oss-120b';

interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GroqResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
    finish_reason?: string | null;
  }>;
  error?: {
    message?: string;
    type?: string;
  };
}

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function callGroq(
  messages: GroqMessage[],
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  } = {},
  retries = 2,
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error('GROQ_API_KEY environment variable is not set.');
  }

  const model = options.model ?? DEFAULT_MODEL;

  console.log('[Groq] Request:', {
    model,
    maxTokens: options.maxTokens ?? 2048,
    messageCount: messages.length,
  });

  const res = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 2048,
    }),
  });

  // Retry rate-limit errors (HTTP 429).
  if (res.status === 429 && retries > 0) {
    const retryAfterHeader = res.headers.get('retry-after');
    const parsedRetryAfter = retryAfterHeader
      ? Number.parseFloat(retryAfterHeader)
      : NaN;

    const waitMs = Number.isFinite(parsedRetryAfter)
      ? Math.ceil(parsedRetryAfter * 1000) + 500
      : 10_000;

    const errText = await res.text();

    console.warn(
      `[Groq] Rate limited. Waiting ${waitMs}ms before retrying. ` +
      `${retries} retries left. ${errText.slice(0, 200)}`,
    );

    await sleep(waitMs);
    return callGroq(messages, options, retries - 1);
  }

  // Read the response body exactly once.
  const responseText = await res.text();

  if (!res.ok) {
    console.error('[Groq] HTTP error:', {
      model,
      status: res.status,
      body: responseText.slice(0, 1000),
    });

    throw new Error(
      `Groq API error ${res.status}: ${responseText.slice(0, 500)}`,
    );
  }

  if (!responseText.trim()) {
    throw new Error(
      `Groq returned an empty HTTP response. Status: ${res.status}`,
    );
  }

  let data: GroqResponse;

  try {
    data = JSON.parse(responseText) as GroqResponse;
  } catch (error) {
    console.error('[Groq] Invalid API response JSON:', {
      status: res.status,
      responseLength: responseText.length,
      responsePreview: responseText.slice(0, 500),
    });

    throw new Error(
      'Groq returned an invalid API response. Check the server logs.',
    );
  }

  if (data.error) {
    throw new Error(
      `Groq API error: ${data.error.message ?? 'Unknown API error'}`,
    );
  }

  const choice = data.choices?.[0];
  const content = choice?.message?.content;

  console.log('[Groq] Response:', {
    model,
    finishReason: choice?.finish_reason ?? 'unknown',
    contentLength: content?.length ?? 0,
  });

  if (typeof content !== 'string' || !content.trim()) {
    throw new Error(
      `Groq returned no message content. Finish reason: ${choice?.finish_reason ?? 'unknown'
      }`,
    );
  }

  if (choice?.finish_reason === 'length') {
    console.warn(
      '[Groq] Output may be truncated because the token limit was reached.',
    );
  }

  return content;
}
