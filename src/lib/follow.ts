import { useCallback, useSyncExternalStore } from 'react';
import { useAccount } from './account/AccountProvider';
import { isTopicId, matchesTopic, topicById, type TopicId } from './account/catalog';
import type { Article } from './types';

/**
 * The topics a reader follows on the homepage. A plain list of topic ids (the same ids the account catalog uses), kept in this browser's
 * localStorage and never sent anywhere. A signed-in reader's list is the one on their account (`prefs.topics`), so the two stay in step.
 */
const KEY = 'signal-ai:followed-topics:v1';
const listeners = new Set<() => void>();
let cache: TopicId[] | null = null;

export function readFollowed(): TopicId[] {
  if (cache) return cache;
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? '[]');
    cache = Array.isArray(parsed) ? [...new Set(parsed.filter(isTopicId))] : [];
  } catch {
    cache = [];
  }
  return cache;
}

function writeFollowed(next: TopicId[]) {
  cache = [...new Set(next)];
  try {
    window.localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* quota or private mode: keep in memory for this visit */
  }
  listeners.forEach((l) => l());
}

/** Test helper: forget the in-memory copy so the next read goes to localStorage again. */
export function resetFollowedCache() {
  cache = null;
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useFollowedTopics(): { topics: TopicId[]; setTopics: (next: TopicId[]) => void } {
  const local = useSyncExternalStore(subscribe, readFollowed, () => []);
  const account = useAccount();
  const signedIn = account.status === 'signed-in' && account.prefs !== null;
  const setTopics = useCallback(
    (next: TopicId[]) => {
      writeFollowed(next);
      if (signedIn) void account.saveTopics(next).catch(() => account.showToast('err_unknown', 'error'));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [signedIn, account.saveTopics],
  );
  return { topics: signedIn ? account.prefs!.topics : local, setTopics };
}

export const followsAny = (a: Article, topics: readonly TopicId[]) => topics.some((id) => matchesTopic(a, topicById(id)));

/** Stories on a followed topic first; each group keeps its order. With nothing followed the list is returned as it is. */
export function prioritizeFollowed<T extends Article>(articles: readonly T[], topics: readonly TopicId[]): T[] {
  if (topics.length === 0) return [...articles];
  const mine: T[] = [];
  const rest: T[] = [];
  for (const a of articles) (followsAny(a, topics) ? mine : rest).push(a);
  return [...mine, ...rest];
}
