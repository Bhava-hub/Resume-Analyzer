const INJECTION_PATTERNS = [
  /\{\{[\s\S]*?\}\}/g,
  /<\|[\s\S]*?\|>/g,
  /\[INST\][\s\S]*?\[\/INST\]/gi,
  /<s>[\s\S]*?<\/s>/gi,
  /###\s*(System|Human|Assistant)\s*:/gi,
];

export function sanitizeText(input: string, maxLength: number): string {
  let text = input;

  // Strip HTML tags
  text = text.replace(/<[^>]*>/g, '');

  // Remove null bytes and non-printable control characters (keep tabs, newlines, CR)
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Remove prompt injection patterns
  for (const pattern of INJECTION_PATTERNS) {
    text = text.replace(pattern, '');
  }

  // Collapse runs of 3+ blank lines into 2
  text = text.replace(/(\r?\n){3,}/g, '\n\n');

  // Trim and enforce length ceiling
  return text.trim().slice(0, maxLength);
}
