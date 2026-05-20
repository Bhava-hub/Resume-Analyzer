import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai';

let _model: GenerativeModel | null = null;

export function getGeminiModel(): GenerativeModel {
  if (_model) return _model;
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY environment variable is not set.');
  _model = new GoogleGenerativeAI(key).getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
  return _model;
}
