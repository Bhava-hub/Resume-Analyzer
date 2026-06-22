// Groq API helper — uses OpenAI-compatible REST endpoint
// Free tier: https://console.groq.com/keys
// Models: llama-3.1-8b-instant (fast, free), mixtral-8x7b-32768

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Default to fast 8B model; caller can override for heavier tasks
const DEFAULT_MODEL = 'llama-3.1-8b-instant';

interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GroqResponse {
  choices: Array<{
    message: { content: string };
    finish_reason: string;
  }>;
}

/** Sleep for `ms` milliseconds. */
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function callGroq(
  messages: GroqMessage[],
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  } = {},
  _retries = 2,   // auto-retry up to 2 times on 429
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY environment variable is not set.');

  const res = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: options.model ?? DEFAULT_MODEL,
      messages,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 2048,
    }),
  });

  // ── Rate limit: wait and retry ────────────────────────────────────────────
  if (res.status === 429 && _retries > 0) {
    // Groq sends `retry-after` in seconds (float); fall back to 10s
    const retryAfterHeader = res.headers.get('retry-after');
    const waitMs = retryAfterHeader
      ? Math.ceil(parseFloat(retryAfterHeader) * 1000) + 500  // +500ms buffer
      : 10_000;

    const errText = await res.text();
    console.warn(
      `[groq] 429 rate limit — waiting ${waitMs}ms then retrying (${_retries} retries left). ${errText.slice(0, 120)}`,
    );
    await sleep(waitMs);
    return callGroq(messages, options, _retries - 1);
  }

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq API error ${res.status}: ${errText}`);
  }

  const data: GroqResponse = await res.json();
  return data.choices[0]?.message?.content ?? '';
}
