<div align="center">

# 🎯 Resume Analyzer

**AI-powered resume analysis + personalized career roadmaps, backed by real Reddit stories**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org)
[![Gemini](https://img.shields.io/badge/Google-Gemini-4285F4?logo=google)](https://aistudio.google.com)
[![Groq](https://img.shields.io/badge/Groq-LLaMA-F55036)](https://groq.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

---

## ✨ What it does

Resume Analyzer takes your resume (PDF or text) and a target job title, then:

1. **🔍 Analyzes your resume** — identifies missing skills, experience gaps, and keyword mismatches against your target role
2. **📍 Builds a career roadmap** — step-by-step action plan tailored to your specific gaps
3. **🗣️ Surfaces real Reddit stories** — finds genuine "how I got in" posts and career advice from people who actually made the transition
4. **📚 Recommends resources** — curated courses, docs, and communities per roadmap step

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| AI — Resume Analysis | Google Gemini |
| AI — Roadmap Generation | Groq (LLaMA) |
| Reddit Scraping | Apify Reddit Scraper Lite |
| Semantic Ranking | HuggingFace Inference API |
| Styling | Tailwind CSS v4 |

---

## 🚀 Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/Bhava-hub/resume-analyzer.git
cd resume-analyzer
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp .env.example .env.local
```

Fill in your `.env.local`:

```env
# Google Gemini API — https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key_here

# Apify (Reddit scraping) — https://console.apify.com/account/integrations
APIFY_API_TOKEN=your_apify_token_here

# Groq (fast LLM inference, free tier) — https://console.groq.com/keys
GROQ_API_KEY=your_groq_api_key_here

# HuggingFace (semantic similarity, free tier) — https://huggingface.co/settings/tokens
HUGGINGFACE_API_KEY=your_huggingface_token_here
```

> All four services have **free tiers** — no credit card required to get started.

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 📁 Project Structure

```
resume-analyzer/
├── app/
│   ├── api/
│   │   ├── analyze/          # Resume analysis endpoint
│   │   ├── career-roadmap/   # Roadmap generation endpoint
│   │   └── reddit-stories/   # Reddit story fetching endpoint
│   └── page.tsx              # Main UI page
├── components/
│   ├── ResumeForm.tsx         # Upload + input form
│   ├── AnalysisResults.tsx    # Gap analysis display
│   ├── CareerRoadmap.tsx      # Roadmap UI
│   └── RedditStories.tsx      # Reddit stories display
├── hooks/
│   └── useRedditStories.ts    # Reddit stories state hook
├── types/
│   └── analysis.ts            # Shared TypeScript types
└── lib/
    ├── gemini.ts              # Gemini client
    └── groq.ts                # Groq client
```

---

## 🔑 API Keys Setup

| Service | Free Tier | Get Key |
|---|---|---|
| Google Gemini | 1,500 req/day | [aistudio.google.com](https://aistudio.google.com/app/apikey) |
| Groq | 14,400 req/day | [console.groq.com](https://console.groq.com/keys) |
| Apify | $5 free credit | [console.apify.com](https://console.apify.com/account/integrations) |
| HuggingFace | Unlimited (rate-limited) | [huggingface.co](https://huggingface.co/settings/tokens) |

---

MIT © [Bhava-hub](https://github.com/Bhava-hub)
