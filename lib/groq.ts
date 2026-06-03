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

export async function callGroq(
  messages: GroqMessage[],
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  } = {},
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

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq API error ${res.status}: ${errText}`);
  }

  const data: GroqResponse = await res.json();
  return data.choices[0]?.message?.content ?? '';
}
