'use client';

import { useEffect, useRef, useState } from 'react';
import { createProjectsApiClient } from '@myorg/api-client';
import { linkKey, parsePlanLinks, type PlanLink } from '@/lib/projects/planning';

export type PlanSaveState =
  | { status: 'idle' }
  | { status: 'saving' }
  | { status: 'saved'; message: string; savedAt: Date }
  | { status: 'error'; message: string };

type Options = {
  projectId: string;
  initialLinks: PlanLink[];
  onSaveLink?: ((action: 'add' | 'remove', link: PlanLink) => Promise<PlanLink[]>) | undefined;
  onLinksSaved?: ((links: PlanLink[]) => void) | undefined;
};

const without = (links: PlanLink[], link: PlanLink) => links.filter(item => linkKey(item) !== linkKey(link));

/**
 * Applies dependency changes immediately and persists them in order in the background.
 * Server results replace local links only once every queued save has settled; a failed save is undone.
 */
export function usePlanLinks({ projectId, initialLinks, onSaveLink, onLinksSaved }: Options) {
  const [links, setLinks] = useState(initialLinks);
  const [saveState, setSaveState] = useState<PlanSaveState>({ status: 'idle' });
  const linksRef = useRef(links);
  const pendingRef = useRef(0);
  const failedRef = useRef(false);
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);
  useEffect(() => {
    if (saveState.status !== 'saved') return;
    const timer = setTimeout(() => setSaveState({ status: 'idle' }), 4000);
    return () => clearTimeout(timer);
  }, [saveState]);
  const initialKey = initialLinks.map(linkKey).join('|');
  useEffect(() => {
    if (pendingRef.current) return;
    linksRef.current = initialLinks;
    setLinks(initialLinks);
    // Parents may pass a fresh array with the same links on every render.
  }, [initialKey]);

  function apply(next: PlanLink[]) {
    linksRef.current = next;
    if (mountedRef.current) setLinks(next);
  }

  function save(action: 'add' | 'remove', link: PlanLink, description: string): Promise<void> {
    apply(action === 'add' ? [...without(linksRef.current, link), link] : without(linksRef.current, link));
    if (!pendingRef.current) failedRef.current = false;
    pendingRef.current++;
    setSaveState({ status: 'saving' });
    const run = async () => {
      try {
        const savedLinks = onSaveLink
          ? await onSaveLink(action, link)
          : (await createProjectsApiClient().updateProjectPlan(projectId, action, link)).planningLinks;
        const saved = parsePlanLinks(savedLinks);
        if (!saved) throw new Error('The server returned an invalid plan. Reload the project before retrying.');
        pendingRef.current--;
        if (!pendingRef.current) {
          apply(saved);
          onLinksSaved?.(saved);
          if (!failedRef.current && mountedRef.current) setSaveState({ status: 'saved', message: `${description} Saved.`, savedAt: new Date() });
        }
      } catch (failure) {
        pendingRef.current--;
        failedRef.current = true;
        apply(action === 'add' ? without(linksRef.current, link) : [...without(linksRef.current, link), link]);
        const reason = failure instanceof Error ? failure.message : 'Unable to save the dependency.';
        if (mountedRef.current) setSaveState({ status: 'error', message: `Couldn't save: ${description} ${reason} The change was undone.` });
      }
    };
    queueRef.current = queueRef.current.then(run, run);
    return queueRef.current;
  }

  return { links, linksRef, saveState, save, dismissError: () => setSaveState({ status: 'idle' }) };
}
