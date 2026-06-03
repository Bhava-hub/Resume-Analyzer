'use client';

import { useState } from 'react';
import type { RedditStory, RedditStoriesResult, RedditStatus } from '@/types/analysis';

interface UseRedditStoriesState {
  jobTitle: string;
  result: RedditStoriesResult | null;
  status: RedditStatus;
  error: string | null;
  jobTitleError: string | null;
}

interface UseRedditStoriesReturn extends UseRedditStoriesState {
  setJobTitle: (title: string) => void;
  fetchStories: () => Promise<void>;
  resetStories: () => void;
}

const INITIAL_STATE: UseRedditStoriesState = {
  jobTitle: '',
  result: null,
  status: 'idle',
  error: null,
  jobTitleError: null,
};

export function useRedditStories(): UseRedditStoriesReturn {
  const [state, setState] = useState<UseRedditStoriesState>(INITIAL_STATE);

  function setJobTitle(title: string) {
    setState((s) => ({ ...s, jobTitle: title, jobTitleError: null }));
  }

  function resetStories() {
    setState(INITIAL_STATE);
  }

  async function fetchStories() {
    const trimmed = state.jobTitle.trim();
    if (!trimmed || trimmed.length < 2) {
      setState((s) => ({
        ...s,
        jobTitleError: 'Please enter a job title (at least 2 characters).',
      }));
      return;
    }

    setState((s) => ({
      ...s,
      status: 'loading',
      result: null,
      error: null,
      jobTitleError: null,
    }));

    try {
      const res = await fetch('/api/reddit-stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobTitle: trimmed }),
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        setState((s) => ({
          ...s,
          status: 'error',
          error: json.error?.message ?? 'Something went wrong. Please try again.',
        }));
        return;
      }

      setState((s) => ({
        ...s,
        status: 'success',
        result: json.data as RedditStoriesResult,
      }));
    } catch {
      setState((s) => ({
        ...s,
        status: 'error',
        error: 'Network error. Please check your connection.',
      }));
    }
  }

  return {
    ...state,
    setJobTitle,
    fetchStories,
    resetStories,
  };
}
