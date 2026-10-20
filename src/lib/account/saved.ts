import { useCallback, useMemo, useState } from 'react';
import { useBookmarks } from '../bookmarks';
import type { Article } from '../types';
import { useAccount } from './AccountProvider';
import type { SavedStory } from './types';

/**
 * One bookmark API for the whole UI: signed-in readers save to their account, everyone else to
 * this browser. The two lists are never mixed silently; see useMergeOffer for the hand-over.
 */
export function useSavedStories(): {
  cloud: boolean;
  loading: boolean;
  list: SavedStory[];
  isSaved: (id: string) => boolean;
  toggle: (a: Article) => void;
  remove: (id: string) => void;
} {
  const account = useAccount();
  const local = useBookmarks();
  const cloud = account.status === 'signed-in';
  const list = useMemo(() => (cloud ? (account.saved ?? []) : local.list), [cloud, account.saved, local.list]);
  const ids = useMemo(() => new Set(list.map((b) => b.id)), [list]);
  const isSaved = useCallback((id: string) => ids.has(id), [ids]);
  const { toggleSaved, removeSaved } = account;
  const toggle = useCallback(
    (a: Article) => {
      if (cloud) toggleSaved(a).catch(() => {});
      else local.toggle(a);
    },
    [cloud, toggleSaved, local],
  );
  const remove = useCallback(
    (id: string) => {
      if (cloud) removeSaved(id).catch(() => {});
      else local.remove(id);
    },
    [cloud, removeSaved, local],
  );
  return { cloud, loading: cloud && account.saved === null, list, isSaved, toggle, remove };
}

const SKIP_PREFIX = 'signal-ai:bookmarks:merge-skipped:';

function readSkipped(uid: string): string[] {
  try {
    const v: unknown = JSON.parse(window.localStorage.getItem(SKIP_PREFIX + uid) ?? '[]');
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/** Local bookmarks that are not in the account yet and that the reader has not declined to copy. */
export function pendingLocalBookmarks(local: readonly SavedStory[], cloud: readonly SavedStory[], skipped: readonly string[]): SavedStory[] {
  const inCloud = new Set(cloud.map((b) => b.id));
  const skip = new Set(skipped);
  return local.filter((b) => !inCloud.has(b.id) && !skip.has(b.id));
}

/**
 * After sign-in, offers to copy this browser's bookmarks into the account. Accepting copies them
 * (the local list is kept); declining remembers those ids for this account so the offer does not
 * nag, but a story saved locally later is offered again.
 */
export function useMergeOffer() {
  const account = useAccount();
  const local = useBookmarks();
  const uid = account.user?.id ?? null;
  const ready = account.status === 'signed-in' && account.saved !== null && uid !== null;
  const [declined, setDeclined] = useState(0);
  const pending = useMemo(
    () => (ready ? pendingLocalBookmarks(local.list, account.saved ?? [], readSkipped(uid!)) : []),
    // `declined` re-reads the skip list after "Not now".
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ready, local.list, account.saved, uid, declined],
  );
  const { addSaved, showToast } = account;
  const accept = useCallback(async () => {
    await addSaved(pending);
    showToast('merge_done');
  }, [addSaved, pending, showToast]);
  const decline = useCallback(() => {
    if (!uid) return;
    try {
      window.localStorage.setItem(SKIP_PREFIX + uid, JSON.stringify([...new Set([...readSkipped(uid), ...pending.map((b) => b.id)])]));
    } catch {
      /* storage blocked: the offer returns next visit */
    }
    setDeclined((n) => n + 1);
  }, [uid, pending]);
  return { pending, accept, decline };
}
