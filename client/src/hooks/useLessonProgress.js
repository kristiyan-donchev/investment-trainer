import { useCallback, useState } from 'react';

const STORAGE_KEY = 'tradescrim-lesson-progress';

function loadCompleted() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export function useLessonProgress() {
  const [completed, setCompleted] = useState(loadCompleted);

  const markComplete = useCallback((lessonId) => {
    setCompleted((prev) => {
      if (prev.has(lessonId)) return prev;
      const next = new Set(prev);
      next.add(lessonId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const isComplete = useCallback((lessonId) => completed.has(lessonId), [completed]);

  return { completed, markComplete, isComplete };
}
