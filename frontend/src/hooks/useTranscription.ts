import { useCallback, useEffect, useRef, useState } from "react";
import { fetchTranscription } from "../api";
import type { Transcription } from "../types";

const STORAGE_KEY = "transcribeflow:transcription-id";
const POLL_INTERVAL_MS = 1500;

function isTerminal(status: Transcription["status"]): boolean {
  return status === "completed" || status === "failed";
}

/**
 * Owns the lifecycle of the current transcription: upload restore via
 * localStorage (NFR3.1), polling while non-terminal, and manual refresh.
 */
export function useTranscription() {
  const [transcription, setTranscription] = useState<Transcription | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopPolling = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const schedulePoll = useCallback(
    (id: string) => {
      stopPolling();
      timerRef.current = setTimeout(async () => {
        try {
          const next = await fetchTranscription(id);
          setTranscription(next);
          if (!isTerminal(next.status)) schedulePoll(id);
        } catch (error) {
          setLoadError(error instanceof Error ? error.message : "Failed to reach the server.");
        }
      }, POLL_INTERVAL_MS);
    },
    [stopPolling],
  );

  const load = useCallback(
    async (id: string) => {
      setLoadError(null);
      try {
        const next = await fetchTranscription(id);
        setTranscription(next);
        if (!isTerminal(next.status)) schedulePoll(id);
      } catch (error) {
        localStorage.removeItem(STORAGE_KEY);
        setLoadError(error instanceof Error ? error.message : "Failed to load transcription.");
      }
    },
    [schedulePoll],
  );

  // Restore in-progress/finished transcription on first mount.
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) void load(stored);
    return stopPolling;
  }, [load, stopPolling]);

  const adopt = useCallback(
    (next: Transcription) => {
      localStorage.setItem(STORAGE_KEY, next.id);
      setTranscription(next);
      if (!isTerminal(next.status)) schedulePoll(next.id);
    },
    [schedulePoll],
  );

  const patchLocal = useCallback((updater: (current: Transcription) => Transcription) => {
    setTranscription((current) => (current ? updater(current) : current));
  }, []);

  const reset = useCallback(() => {
    stopPolling();
    localStorage.removeItem(STORAGE_KEY);
    setTranscription(null);
    setLoadError(null);
  }, [stopPolling]);

  return { transcription, loadError, adopt, patchLocal, reset, reload: load };
}
