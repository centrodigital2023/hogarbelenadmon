import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

const PREFIX = "hb-draft:";
const MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000;

interface StoredDraft<T> { savedAt: number; value: T }

/**
 * Keeps an unsent form on this device while it is being filled, so a call,
 * a dead battery or the back button never loses a shift's work. The draft is
 * restored the next time the same person opens the same form, and cleared on save.
 *
 * `isEmpty` tells which values are not worth keeping (the untouched form).
 */
export const useFormDraft = <T,>(formKey: string, value: T, restore: (value: NoInfer<T>) => void, isEmpty: (value: NoInfer<T>) => boolean) => {
  const { user } = useAuth();
  const storageKey = user ? `${PREFIX}${formKey}:${user.id}` : null;
  const [restoredAt, setRestoredAt] = useState<Date | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const loadedKey = useRef<string | null>(null);
  const restoreRef = useRef(restore);
  restoreRef.current = restore;
  const isEmptyRef = useRef(isEmpty);
  isEmptyRef.current = isEmpty;

  // Restore once per form + person
  useEffect(() => {
    if (!storageKey || loadedKey.current === storageKey) return;
    loadedKey.current = storageKey;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const draft = JSON.parse(raw) as StoredDraft<T>;
      if (Date.now() - draft.savedAt > MAX_AGE_MS || isEmptyRef.current(draft.value)) {
        localStorage.removeItem(storageKey);
        return;
      }
      restoreRef.current(draft.value);
      setRestoredAt(new Date(draft.savedAt));
    } catch {
      // Storage blocked or a corrupted draft: start clean
    }
  }, [storageKey]);

  // Save while typing (lightly debounced)
  useEffect(() => {
    if (!storageKey || loadedKey.current !== storageKey) return;
    const timer = window.setTimeout(() => {
      try {
        if (isEmptyRef.current(value)) {
          localStorage.removeItem(storageKey);
          setSavedAt(null);
          return;
        }
        localStorage.setItem(storageKey, JSON.stringify({ savedAt: Date.now(), value } satisfies StoredDraft<T>));
        setSavedAt(new Date());
      } catch {
        // Full or blocked storage: the form still works, only without a draft
      }
    }, 600);
    return () => window.clearTimeout(timer);
  }, [storageKey, value]);

  const clear = useCallback(() => {
    if (storageKey) {
      try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
    }
    setSavedAt(null);
    setRestoredAt(null);
  }, [storageKey]);

  return { restoredAt, savedAt, clear };
};
